import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader, StatusPill } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { apiUpload, assetUrl } from "@/lib/api";
import type { Delay } from "@/lib/api";
import { useDelays, useAssets, useReasons, useEmployees, invalidateAll } from "@/lib/hooks";
import { useAuth, isManager } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { fmtDate, fmtHours, fmtMoney, reasonLabel } from "@/i18n";
import { Plus, CheckCircle2, Trash2, Camera, ChevronsUpDown, Check, Image as ImageIcon, MoreHorizontal, Eye, Pencil } from "lucide-react";

function nowParts() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export default function DelayLog() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { toast } = useToast();
  const { role } = useAuth();
  const canDelete = isManager(role);
  const isOperator = role === "operator";

  const { data: delays, isLoading } = useDelays();
  const { data: assets } = useAssets();
  const { data: reasons } = useReasons();
  const { data: employees } = useEmployees();

  const [logOpen, setLogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Delay | null>(null);
  const [viewTarget, setViewTarget] = useState<Delay | null>(null);
  const [closeTarget, setCloseTarget] = useState<Delay | null>(null);
  const [photoView, setPhotoView] = useState<string | null>(null);

  // Operators can edit only OPEN delays; managers can edit any.
  const canEditDelay = (d: Delay) => isManager(role) || (isOperator && d.open);

  async function del(d: Delay) {
    if (!confirm(t("misc.confirmDelete"))) return;
    await apiRequest("DELETE", `/api/delays/${d.id}`);
    invalidateAll();
    toast({ description: t("toast.delayDeleted") });
  }

  return (
    <div>
      <PageHeader
        title={t("pages.logTitle")}
        subtitle={t("pages.logSub")}
        action={
          <Button data-testid="button-log-delay" className="h-11 gap-2 font-semibold" onClick={() => setLogOpen(true)}>
            <Plus className="h-5 w-5" /> {t("buttons.logDelay")}
          </Button>
        }
      />

      {!isLoading && (delays ?? []).length === 0 && (
        <div className="rounded-xl border border-card-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
          {t("empty.logFirst")}
        </div>
      )}

      {(isLoading || (delays ?? []).length > 0) && (
      <div className="overflow-hidden rounded-xl border border-card-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{minWidth: '900px'}}>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t("table.asset")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.reason")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.operator")}</th>
                <th className="px-4 py-3 font-semibold">{t("table.openedClosed")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.chargeableHours")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.cost")}</th>
                <th className="px-4 py-3 text-center font-semibold">{t("table.photo")}</th>
                <th className="px-4 py-3 text-center font-semibold">{t("table.status")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50"><td colSpan={9} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : (
                (delays ?? []).map((d) => (
                  <tr key={d.id} data-testid={`delay-row-${d.id}`} className="border-b border-border/50 last:border-0 hover-elevate">
                    <td className="px-4 py-3 font-medium">{d.assetName}</td>
                    <td className="px-4 py-3">{reasonLabel(d, lang)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{d.employeeName || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      <div>{fmtDate(`${d.dateDown} ${d.timeDown}`, lang, true)}</div>
                      {d.dateUp && <div className="text-green-600 dark:text-green-500">→ {fmtDate(`${d.dateUp} ${d.timeUp}`, lang, true)}</div>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums" data-testid={`text-hours-${d.id}`}>{d.chargeableHours !== null ? fmtHours(d.chargeableHours, lang) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums" data-testid={`text-cost-${d.id}`}>{d.cost !== null ? fmtMoney(d.cost, lang) : "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {d.photoPath ? (
                        <button data-testid={`button-photo-${d.id}`} onClick={() => setPhotoView(assetUrl(d.photoPath)!)} className="rounded-md p-1 text-primary hover-elevate" aria-label={t("buttons.viewPhoto")}>
                          <ImageIcon className="h-5 w-5" />
                        </button>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center"><StatusPill status={d.open ? "DOWN" : "UP"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" data-testid={`button-actions-${d.id}`} aria-label={t("table.actions")}>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem data-testid={`action-view-${d.id}`} onClick={() => setViewTarget(d)}>
                              <Eye className="mr-2 h-4 w-4" /> {t("buttons.view")}
                            </DropdownMenuItem>
                            {canEditDelay(d) && (
                              <DropdownMenuItem data-testid={`action-edit-${d.id}`} onClick={() => setEditTarget(d)}>
                                <Pencil className="mr-2 h-4 w-4" /> {t("buttons.edit")}
                              </DropdownMenuItem>
                            )}
                            {d.open && (
                              <DropdownMenuItem data-testid={`action-close-${d.id}`} onClick={() => setCloseTarget(d)}>
                                <CheckCircle2 className="mr-2 h-4 w-4" /> {t("buttons.closeDelay")}
                              </DropdownMenuItem>
                            )}
                            {canDelete && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem data-testid={`action-delete-${d.id}`} className="text-destructive focus:text-destructive" onClick={() => del(d)}>
                                  <Trash2 className="mr-2 h-4 w-4" /> {t("buttons.delete")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {logOpen && (
        <LogDialog
          open={logOpen}
          onClose={() => setLogOpen(false)}
          assets={assets ?? []}
          reasons={reasons ?? []}
          employees={employees ?? []}
        />
      )}
      {editTarget && (
        <LogDialog
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          assets={assets ?? []}
          reasons={reasons ?? []}
          employees={employees ?? []}
          editDelay={editTarget}
        />
      )}
      {closeTarget && (
        <CloseDialog delay={closeTarget} onClose={() => setCloseTarget(null)} />
      )}
      {viewTarget && (
        <ViewDialog delay={viewTarget} onClose={() => setViewTarget(null)} onPhoto={(u) => setPhotoView(u)} />
      )}

      <Dialog open={!!photoView} onOpenChange={(o) => !o && setPhotoView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t("buttons.viewPhoto")}</DialogTitle></DialogHeader>
          {photoView && <img src={photoView} alt="Delay" className="max-h-[70vh] w-full rounded-md object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LogDialog({ open, onClose, assets, reasons, employees, editDelay }: {
  open: boolean; onClose: () => void;
  assets: any[]; reasons: any[]; employees: any[];
  editDelay?: Delay;
}) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { toast } = useToast();
  const init = useMemo(nowParts, []);
  const isEdit = !!editDelay;

  const [assetId, setAssetId] = useState<number | null>(editDelay?.assetId ?? null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [reasonId, setReasonId] = useState<string>(editDelay?.reasonId ? String(editDelay.reasonId) : "");
  const [description, setDescription] = useState(editDelay?.description ?? "");
  const [dateDown, setDateDown] = useState(editDelay?.dateDown ?? init.date);
  const [timeDown, setTimeDown] = useState(editDelay?.timeDown ?? init.time);
  const [dateUp, setDateUp] = useState(editDelay?.dateUp ?? "");
  const [timeUp, setTimeUp] = useState(editDelay?.timeUp ?? "");
  const [shift, setShift] = useState<string>(() => {
    if (editDelay?.shift) return String(editDelay.shift);
    const hr = parseInt(init.time.slice(0, 2), 10);
    return hr >= 6 && hr < 14 ? "1" : "2";
  });
  const [employeeId, setEmployeeId] = useState<string>(editDelay?.employeeId ? String(editDelay.employeeId) : "");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  // In edit mode we don't want the auto-fill effect to clobber an existing operator.
  const [autoFilled, setAutoFilled] = useState(isEdit);

  // Auto-fill operator from assignment when asset + shift chosen (new delays,
  // or if the operator field is still empty).
  useEffect(() => {
    if (!assetId || !shift) return;
    if (isEdit && autoFilled && employeeId) return;
    (async () => {
      try {
        const res = await apiRequest("GET", `/api/assignments/resolve?assetId=${assetId}&shift=${shift}`);
        const data = await res.json();
        if (data?.employeeId && !employeeId) setEmployeeId(String(data.employeeId));
      } catch { /* ignore */ }
      setAutoFilled(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, shift]);

  const selectedAsset = assets.find((a) => a.id === assetId);

  async function submit() {
    if (!assetId) { toast({ variant: "destructive", description: t("form.asset") + " " + t("form.required") }); return; }
    setBusy(true);
    try {
      if (isEdit) {
        const body: any = {
          assetId, reasonId: reasonId || null, description, dateDown, timeDown,
          shift: shift || null, employeeId: employeeId || null,
        };
        if (dateUp) body.dateUp = dateUp;
        if (timeUp) body.timeUp = timeUp;
        const res = await apiRequest("PATCH", `/api/delays/${editDelay!.id}`, body);
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          toast({ variant: "destructive", description: err.message || t("toast.error") });
          setBusy(false);
          return;
        }
        invalidateAll();
        toast({ description: t("toast.delaySaved") });
        onClose();
      } else {
        const form = new FormData();
        form.set("assetId", String(assetId));
        if (reasonId) form.set("reasonId", reasonId);
        form.set("description", description);
        form.set("dateDown", dateDown);
        form.set("timeDown", timeDown);
        form.set("shift", shift);
        if (employeeId) form.set("employeeId", employeeId);
        if (photo) form.set("photo", photo);
        await apiUpload("/api/delays", form);
        invalidateAll();
        toast({ description: t("toast.delayLogged") });
        onClose();
      }
    } catch {
      toast({ variant: "destructive", description: t("toast.error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? t("buttons.edit") : t("buttons.logDelay")}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Asset searchable picker */}
          <div className="space-y-2">
            <Label>{t("form.asset")} <span className="text-destructive">*</span></Label>
            <Popover open={assetPickerOpen} onOpenChange={setAssetPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" data-testid="select-asset" className="h-11 w-full justify-between font-normal">
                  {selectedAsset ? selectedAsset.name : t("form.searchAsset")}
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("form.searchAsset")} />
                  <CommandList>
                    <CommandEmpty>—</CommandEmpty>
                    <CommandGroup>
                      {assets.map((a) => (
                        <CommandItem key={a.id} value={a.name} data-testid={`asset-option-${a.id}`}
                          onSelect={() => { setAssetId(a.id); setAssetPickerOpen(false); }}>
                          <Check className={`mr-2 h-4 w-4 ${assetId === a.id ? "opacity-100" : "opacity-0"}`} />
                          {a.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label>{t("form.reason")}</Label>
            <Select value={reasonId} onValueChange={setReasonId}>
              <SelectTrigger className="h-11" data-testid="select-reason"><SelectValue placeholder={t("form.selectReason")} /></SelectTrigger>
              <SelectContent>
                {reasons.map((r) => <SelectItem key={r.id} value={String(r.id)}>{reasonLabel(r, lang)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Date/time down */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("form.dateDown")}</Label>
              <Input type="date" value={dateDown} onChange={(e) => setDateDown(e.target.value)} className="h-11" data-testid="input-datedown" />
            </div>
            <div className="space-y-2">
              <Label>{t("form.timeDown")}</Label>
              <Input type="time" value={timeDown} onChange={(e) => setTimeDown(e.target.value)} className="h-11" data-testid="input-timedown" />
            </div>
          </div>

          {/* Date/time up — only in edit mode (close via Close dialog for new) */}
          {isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("form.dateUp")} <span className="text-xs text-muted-foreground">({t("form.optional")})</span></Label>
                <Input type="date" value={dateUp} onChange={(e) => setDateUp(e.target.value)} className="h-11" data-testid="input-edit-dateup" />
              </div>
              <div className="space-y-2">
                <Label>{t("form.timeUp")} <span className="text-xs text-muted-foreground">({t("form.optional")})</span></Label>
                <Input type="time" value={timeUp} onChange={(e) => setTimeUp(e.target.value)} className="h-11" data-testid="input-edit-timeup" />
              </div>
            </div>
          )}

          {/* Shift + operator */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("form.shift")}</Label>
              <Select value={shift} onValueChange={setShift}>
                <SelectTrigger className="h-11" data-testid="select-shift"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t("form.shift1")}</SelectItem>
                  <SelectItem value="2">{t("form.shift2")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("form.operator")}</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger className="h-11" data-testid="select-operator"><SelectValue placeholder={t("form.selectOperator")} /></SelectTrigger>
                <SelectContent>
                  {employees.filter((e) => e.active).map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>{t("form.description")} <span className="text-xs text-muted-foreground">({t("form.optional")})</span></Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("form.descriptionPlaceholder")} data-testid="input-description" rows={2} />
          </div>

          {/* Photo — only when creating */}
          {!isEdit && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" /> {t("form.photo")} <span className="text-xs text-muted-foreground">({t("form.optional")})</span></Label>
              <Input type="file" accept="image/*" capture="environment" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="h-11" data-testid="input-photo" />
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-log">{t("buttons.cancel")}</Button>
          <Button onClick={submit} disabled={busy || !assetId} data-testid="button-submit-log" className="font-semibold">
            {busy ? t("login.signingIn") : isEdit ? t("buttons.save") : t("buttons.logDelay")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ViewDialog({ delay, onClose, onPhoto }: { delay: Delay; onClose: () => void; onPhoto: (u: string) => void }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const Row = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between gap-4 border-b border-border/50 py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{delay.assetName}</DialogTitle></DialogHeader>
        <div className="space-y-0.5">
          <Row label={t("form.reason")} value={reasonLabel(delay, lang) || "—"} />
          <Row label={t("form.operator")} value={delay.employeeName || "—"} />
          <Row label={t("form.shift")} value={delay.shift ?? "—"} />
          <Row label={t("form.dateDown")} value={fmtDate(`${delay.dateDown} ${delay.timeDown}`, lang, true)} />
          <Row label={t("form.dateUp")} value={delay.dateUp ? fmtDate(`${delay.dateUp} ${delay.timeUp}`, lang, true) : t("misc.open")} />
          <Row label={t("table.chargeableHours")} value={delay.chargeableHours !== null ? fmtHours(delay.chargeableHours, lang) : "—"} />
          <Row label={t("table.cost")} value={delay.cost !== null ? fmtMoney(delay.cost, lang) : "—"} />
          {delay.description && <Row label={t("form.description")} value={delay.description} />}
          {delay.correctiveActions && <Row label={t("form.correctiveActions")} value={delay.correctiveActions} />}
        </div>
        {delay.photoPath && (
          <Button variant="outline" className="gap-2" onClick={() => onPhoto(assetUrl(delay.photoPath)!)} data-testid="button-view-photo">
            <ImageIcon className="h-4 w-4" /> {t("buttons.viewPhoto")}
          </Button>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-close-view">{t("buttons.cancel")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CloseDialog({ delay, onClose }: { delay: Delay; onClose: () => void }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const init = useMemo(nowParts, []);
  const [dateUp, setDateUp] = useState(init.date);
  const [timeUp, setTimeUp] = useState(init.time);
  const [corrective, setCorrective] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await apiRequest("PATCH", `/api/delays/${delay.id}/close`, { dateUp, timeUp, correctiveActions: corrective });
      invalidateAll();
      toast({ description: t("toast.delayClosed") });
      onClose();
    } catch {
      toast({ variant: "destructive", description: t("toast.error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t("buttons.closeDelay")} — {delay.assetName}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("form.dateUp")}</Label>
              <Input type="date" value={dateUp} onChange={(e) => setDateUp(e.target.value)} className="h-11" data-testid="input-dateup" />
            </div>
            <div className="space-y-2">
              <Label>{t("form.timeUp")}</Label>
              <Input type="time" value={timeUp} onChange={(e) => setTimeUp(e.target.value)} className="h-11" data-testid="input-timeup" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("form.correctiveActions")} <span className="text-xs text-muted-foreground">({t("form.optional")})</span></Label>
            <Textarea value={corrective} onChange={(e) => setCorrective(e.target.value)} rows={3} data-testid="input-corrective" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-close">{t("buttons.cancel")}</Button>
          <Button onClick={submit} disabled={busy} data-testid="button-submit-close" className="font-semibold">
            {busy ? t("login.signingIn") : t("buttons.closeDelay")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
