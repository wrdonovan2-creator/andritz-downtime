import { useState } from "react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Textarea } from "@/components/ui/textarea";
import { useAssets, useReasons, useEmployees, useAssignments, useSchedule, useHolidays, useDlh, useSafetyConcerns, useBirthdays, useToolbox, invalidateScheduleDeps, downloadExcel } from "@/lib/hooks";
import { useAuth, isPlantManager } from "@/lib/auth";
import { useLang } from "@/lib/lang";
import { apiUpload, assetUrl } from "@/lib/api";
import { fmtMoney } from "@/i18n";
import { DollarSign, Tag, Users, KeyRound, FileSpreadsheet, Plus, Trash2, Zap, CalendarClock, CalendarOff, Percent, ShieldAlert, Cake, ClipboardList } from "lucide-react";

const STRAIGHT_CC = "CV492310";
const ROTARY_CC = "CV492320";
const STRAIGHT_RATE = 150.62;
const ROTARY_RATE = 125.59;

function Section({ icon: Icon, title, hint, children, locked }: any) {
  return (
    <section className="rounded-xl border border-card-border bg-card p-5">
      <div className="mb-4">
        <h2 className="flex items-center gap-2 text-base font-bold"><Icon className="h-5 w-5 text-primary" /> {title}</h2>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        {locked && <p className="mt-2 rounded-md bg-secondary px-3 py-2 text-xs text-muted-foreground">{locked}</p>}
      </div>
      {children}
    </section>
  );
}

export default function Admin() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const plant = isPlantManager(role);

  return (
    <div>
      <PageHeader
        title={t("pages.adminTitle")}
        subtitle={t("pages.adminSub")}
        action={
          <Button variant="outline" className="gap-2" onClick={downloadExcel} data-testid="button-export">
            <FileSpreadsheet className="h-4 w-4" /> {t("buttons.export")}
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <SafetySection plant={plant} />
        <BirthdaysSection plant={plant} />
        <ToolboxSection />
        <ScheduleSection plant={plant} />
        <DlhSection plant={plant} />
        <HolidaysSection />
        <RatesSection plant={plant} />
        <ReasonsSection />
        <EmployeesSection />
        {plant ? <PasswordsSection /> : (
          <Section icon={KeyRound} title={t("admin.passwords")} locked={t("admin.noPermissionPasswords")}><div /></Section>
        )}
      </div>
    </div>
  );
}

function RatesSection({ plant }: { plant: boolean }) {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { toast } = useToast();
  const { data: assets, isLoading } = useAssets();
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  async function saveRate(id: number, value: string) {
    await apiRequest("PATCH", `/api/assets/${id}`, { ratePerHour: Number(value) });
    queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/rollups/dashboard", new Date().getFullYear()] });
    toast({ description: t("toast.rateUpdated") });
  }
  async function preset(costCenter: string, rate: number) {
    const res = await apiRequest("POST", "/api/assets/preset", { costCenter, ratePerHour: rate });
    const data = await res.json();
    queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
    queryClient.invalidateQueries({ queryKey: ["/api/rollups/dashboard", new Date().getFullYear()] });
    setDrafts({});
    toast({ description: t("toast.presetApplied", { count: data.updated }) });
  }

  return (
    <Section
      icon={DollarSign}
      title={t("admin.rates")}
      hint={t("admin.ratesHint")}
      locked={!plant ? t("admin.noPermissionRates") : undefined}
    >
      {plant && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-lg bg-secondary/50 p-3">
          <div className="w-full text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.ratePresets")}</div>
          <p className="w-full text-xs text-muted-foreground">{t("admin.ratePresetsHint")}</p>
          <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-preset-straight" onClick={() => preset(STRAIGHT_CC, STRAIGHT_RATE)}>
            <Zap className="h-3.5 w-3.5" /> {t("admin.setStraight")} ({fmtMoney(STRAIGHT_RATE, lang)})
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" data-testid="button-preset-rotary" onClick={() => preset(ROTARY_CC, ROTARY_RATE)}>
            <Zap className="h-3.5 w-3.5" /> {t("admin.setRotary")} ({fmtMoney(ROTARY_RATE, lang)})
          </Button>
        </div>
      )}
      {isLoading ? <Skeleton className="h-64 w-full" /> : (
        <div className="space-y-2">
          {(assets ?? []).map((a) => (
            <div key={a.id} className="flex items-center gap-3" data-testid={`rate-row-${a.id}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-xs text-muted-foreground">{a.costCenter} · {a.activityType}</div>
              </div>
              {plant ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number" step="0.01"
                    defaultValue={a.ratePerHour}
                    onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
                    className="h-9 w-24 text-right tabular-nums"
                    data-testid={`input-rate-${a.id}`}
                  />
                  <Button size="sm" variant="outline" disabled={drafts[a.id] === undefined}
                    onClick={() => saveRate(a.id, drafts[a.id])} data-testid={`button-save-rate-${a.id}`}>
                    {t("buttons.save")}
                  </Button>
                </div>
              ) : (
                <div className="text-sm font-semibold tabular-nums">{fmtMoney(a.ratePerHour, lang)}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

function ReasonsSection() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { toast } = useToast();
  const { role } = useAuth();
  const canEdit = role === "production_manager" || role === "plant_manager";
  const { data: reasons, isLoading } = useReasons();
  const [en, setEn] = useState("");
  const [es, setEs] = useState("");

  async function add() {
    if (!es.trim()) return;
    await apiRequest("POST", "/api/reasons", { labelEn: en, labelEs: es });
    queryClient.invalidateQueries({ queryKey: ["/api/reasons"] });
    setEn(""); setEs("");
    toast({ description: t("toast.reasonAdded") });
  }
  async function del(id: number) {
    await apiRequest("DELETE", `/api/reasons/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/reasons"] });
    toast({ description: t("toast.reasonDeleted") });
  }

  return (
    <Section icon={Tag} title={t("admin.reasons")}>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-1.5">
          {(reasons ?? []).map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2" data-testid={`reason-item-${r.id}`}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{lang === "es" ? r.labelEs : r.labelEn}</div>
                <div className="truncate text-xs text-muted-foreground">{lang === "es" ? r.labelEn : r.labelEs}</div>
              </div>
              {canEdit && (
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => del(r.id)} data-testid={`button-delete-reason-${r.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("admin.newReasonEs")} *</Label>
              <Input value={es} onChange={(e) => setEs(e.target.value)} data-testid="input-reason-es" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t("admin.newReasonEn")}</Label>
              <Input value={en} onChange={(e) => setEn(e.target.value)} data-testid="input-reason-en" className="h-9" />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t("admin.reasonEnAutoNote")}</p>
          <Button size="sm" className="gap-1.5" onClick={add} disabled={!es.trim()} data-testid="button-add-reason">
            <Plus className="h-4 w-4" /> {t("admin.addReason")}
          </Button>
        </div>
      )}
    </Section>
  );
}

function EmployeesSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { role } = useAuth();
  const canEdit = role === "production_manager" || role === "plant_manager";
  const { data: employees, isLoading } = useEmployees();
  const { data: assets } = useAssets();
  const { data: assignments } = useAssignments();
  const [name, setName] = useState("");

  async function addEmp() {
    if (!name.trim()) return;
    await apiRequest("POST", "/api/employees", { name });
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
    setName("");
    toast({ description: t("toast.employeeSaved") });
  }
  async function toggleActive(id: number, active: boolean) {
    await apiRequest("PATCH", `/api/employees/${id}`, { active });
    queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
  }
  async function setAssignment(assetId: number, shift: number, employeeId: string) {
    await apiRequest("POST", "/api/assignments", { assetId, shift, employeeId: employeeId === "none" ? null : Number(employeeId) });
    queryClient.invalidateQueries({ queryKey: ["/api/assignments"] });
    toast({ description: t("toast.assignmentSaved") });
  }
  const findAssign = (assetId: number, shift: number) =>
    assignments?.find((a) => a.assetId === assetId && a.shift === shift)?.employeeId ?? null;

  return (
    <Section icon={Users} title={t("admin.employees")} hint={t("admin.assignmentsHint")}>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <>
          {/* roster */}
          <div className="space-y-1.5">
            {(employees ?? []).map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2" data-testid={`employee-item-${e.id}`}>
                <span className="text-sm font-medium">{e.name}</span>
                {canEdit && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {t("admin.active")}
                    <Switch checked={!!e.active} onCheckedChange={(v) => toggleActive(e.id, v)} data-testid={`switch-employee-${e.id}`} />
                  </div>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="mt-3 flex gap-2 border-t border-border pt-3">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("admin.employeeName")} className="h-9" data-testid="input-employee-name" />
              <Button size="sm" className="gap-1.5 shrink-0" onClick={addEmp} disabled={!name.trim()} data-testid="button-add-employee">
                <Plus className="h-4 w-4" /> {t("admin.addEmployee")}
              </Button>
            </div>
          )}

          {/* assignments */}
          {canEdit && (
            <div className="mt-4 border-t border-border pt-4">
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("admin.assignments")}</div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {(assets ?? []).map((a) => (
                  <div key={a.id} className="rounded-md bg-secondary/30 p-2" data-testid={`assignment-block-${a.id}`}>
                    <div className="mb-1.5 text-xs font-medium">{a.name}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[1, 2].map((shift) => (
                        <div key={shift}>
                          <div className="mb-1 text-[11px] text-muted-foreground">{shift === 1 ? t("form.shift1") : t("form.shift2")}</div>
                          <Select
                            value={findAssign(a.id, shift) ? String(findAssign(a.id, shift)) : "none"}
                            onValueChange={(v) => setAssignment(a.id, shift, v)}
                          >
                            <SelectTrigger className="h-9" data-testid={`select-assign-${a.id}-${shift}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">{t("admin.unassigned")}</SelectItem>
                              {(employees ?? []).filter((e) => e.active).map((e) => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  );
}

function PasswordsSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [op, setOp] = useState("");
  const [prod, setProd] = useState("");
  const [plant, setPlant] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const body: any = {};
      if (op) body.operatorPassword = op;
      if (prod) body.prodPassword = prod;
      if (plant) body.plantPassword = plant;
      if (Object.keys(body).length === 0) return;
      await apiRequest("POST", "/api/admin/passwords", body);
      setOp(""); setProd(""); setPlant("");
      toast({ description: t("toast.passwordChanged") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section icon={KeyRound} title={t("admin.passwords")}>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">{t("admin.changeOperatorPw")}</Label>
          <Input type="password" value={op} onChange={(e) => setOp(e.target.value)} placeholder={t("admin.newPassword")} className="h-9" data-testid="input-pw-operator" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("admin.changeProdPw")}</Label>
          <Input type="password" value={prod} onChange={(e) => setProd(e.target.value)} placeholder={t("admin.newPassword")} className="h-9" data-testid="input-pw-prod" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("admin.changePlantPw")}</Label>
          <Input type="password" value={plant} onChange={(e) => setPlant(e.target.value)} placeholder={t("admin.newPassword")} className="h-9" data-testid="input-pw-plant" />
        </div>
        <Button size="sm" onClick={save} disabled={busy || (!op && !prod && !plant)} data-testid="button-save-passwords">
          {t("buttons.save")}
        </Button>
      </div>
    </Section>
  );
}

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function ScheduleSection({ plant }: { plant: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: schedule, isLoading } = useSchedule();
  const [drafts, setDrafts] = useState<Record<number, { hours?: string; startHour?: string }>>({});

  const rows = [...(schedule ?? [])].sort((a, b) => a.dow - b.dow);
  const weeklyTotal = rows.reduce((s, r) => {
    const h = drafts[r.dow]?.hours;
    return s + (h !== undefined && h !== "" ? Number(h) : r.hours);
  }, 0);

  async function save(dow: number) {
    const d = drafts[dow] || {};
    const body: any = {};
    if (d.hours !== undefined && d.hours !== "") body.hours = Number(d.hours);
    if (d.startHour !== undefined && d.startHour !== "") body.startHour = Number(d.startHour);
    if (Object.keys(body).length === 0) return;
    await apiRequest("PATCH", `/api/schedule/${dow}`, body);
    invalidateScheduleDeps();
    setDrafts((prev) => { const n = { ...prev }; delete n[dow]; return n; });
    toast({ description: t("toast.scheduleSaved") });
  }

  return (
    <Section icon={CalendarClock} title={t("admin.scheduleRules")} hint={t("admin.scheduleHint")} locked={!plant ? t("admin.noPermissionSchedule") : undefined}>
      {isLoading ? <Skeleton className="h-56 w-full" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{minWidth: '560px'}}>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 pr-2 font-semibold">{t("misc.day")}</th>
                <th className="py-2 px-2 text-right font-semibold">{t("admin.workingHours")}</th>
                <th className="py-2 px-2 text-right font-semibold">{t("admin.startHour")}</th>
                {plant && <th className="py-2 pl-2 text-right font-semibold" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.dow} className="border-b border-border/40 last:border-0" data-testid={`schedule-row-${r.dow}`}>
                  <td className="py-2 pr-2 font-medium">{t(`days.${DOW_KEYS[r.dow]}`)}</td>
                  <td className="py-2 px-2 text-right">
                    {plant ? (
                      <Input type="number" step="0.5" min="0" defaultValue={r.hours}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.dow]: { ...d[r.dow], hours: e.target.value } }))}
                        className="h-9 w-20 text-right tabular-nums ml-auto" data-testid={`input-sched-hours-${r.dow}`} />
                    ) : <span className="tabular-nums">{r.hours}</span>}
                  </td>
                  <td className="py-2 px-2 text-right">
                    {plant ? (
                      <Input type="number" step="0.5" min="0" max="23.5" defaultValue={r.startHour}
                        onChange={(e) => setDrafts((d) => ({ ...d, [r.dow]: { ...d[r.dow], startHour: e.target.value } }))}
                        className="h-9 w-20 text-right tabular-nums ml-auto" data-testid={`input-sched-start-${r.dow}`} />
                    ) : <span className="tabular-nums">{r.startHour}</span>}
                  </td>
                  {plant && (
                    <td className="py-2 pl-2 text-right">
                      <Button size="sm" variant="outline" disabled={!drafts[r.dow]} onClick={() => save(r.dow)} data-testid={`button-save-sched-${r.dow}`}>
                        {t("buttons.save")}
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
            <span className="font-semibold">{t("admin.weeklyTotal")}</span>
            <span className="tabular-nums font-bold" data-testid="text-weekly-total">{weeklyTotal} {t("misc.hrs")}</span>
          </div>
        </div>
      )}
    </Section>
  );
}

function DlhSection({ plant }: { plant: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data, isLoading } = useDlh();
  const [val, setVal] = useState<string>("");
  const current = data?.dlhPercent ?? 75;

  async function save() {
    const v = Number(val === "" ? current : val);
    await apiRequest("POST", "/api/settings/dlh", { dlhPercent: v });
    invalidateScheduleDeps();
    toast({ description: t("toast.dlhSaved") });
  }

  return (
    <Section icon={Percent} title={t("admin.dlh")} hint={t("admin.dlhHelp")} locked={!plant ? t("admin.noPermissionDlh") : undefined}>
      {isLoading ? <Skeleton className="h-24 w-full" /> : plant ? (
        <div className="flex items-end gap-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.dlh")}</Label>
            <div className="flex items-center gap-1">
              <Input type="number" min="0" max="100" step="1" defaultValue={current}
                onChange={(e) => setVal(e.target.value)} className="h-14 w-28 text-3xl font-bold tabular-nums" data-testid="input-dlh" />
              <span className="text-2xl font-bold text-muted-foreground">%</span>
            </div>
          </div>
          <Button className="h-11" onClick={save} data-testid="button-save-dlh">{t("buttons.save")}</Button>
        </div>
      ) : (
        <div className="text-3xl font-bold tabular-nums" data-testid="text-dlh">{current}%</div>
      )}
    </Section>
  );
}

function HolidaysSection() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { toast } = useToast();
  const { role } = useAuth();
  const canEdit = role === "production_manager" || role === "plant_manager";
  const nowYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(nowYear);
  const { data: holidays, isLoading } = useHolidays(year);
  const [date, setDate] = useState("");
  const [en, setEn] = useState("");
  const [es, setEs] = useState("");

  const years = Array.from({ length: 5 }, (_, i) => nowYear - 1 + i);

  async function add() {
    if (!date || (!es.trim() && !en.trim())) return;
    await apiRequest("POST", "/api/holidays", { date, labelEn: en, labelEs: es });
    invalidateScheduleDeps();
    queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
    setDate(""); setEn(""); setEs("");
    toast({ description: t("toast.holidayAdded") });
  }
  async function del(id: number) {
    await apiRequest("DELETE", `/api/holidays/${id}`);
    invalidateScheduleDeps();
    queryClient.invalidateQueries({ queryKey: ["/api/holidays"] });
    toast({ description: t("toast.holidayDeleted") });
  }

  return (
    <Section icon={CalendarOff} title={t("admin.holidays")} hint={t("admin.holidaysHint")}>
      <div className="mb-3 flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">{t("misc.year")}</Label>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="h-9 w-28" data-testid="select-holiday-year"><SelectValue /></SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-1.5">
          {(holidays ?? []).length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t("empty.noHolidays")}</p>
          ) : (holidays ?? []).map((h) => (
            <div key={h.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-3 py-2" data-testid={`holiday-item-${h.id}`}>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{lang === "es" ? h.labelEs : h.labelEn}</div>
                <div className="truncate text-xs text-muted-foreground">{h.date} · {lang === "es" ? h.labelEn : h.labelEs}</div>
              </div>
              {canEdit && (
                <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => del(h.id)} data-testid={`button-delete-holiday-${h.id}`}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
      {canEdit && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <div className="grid grid-cols-1 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">{t("form.dateDown").replace(/ .*/, "")} *</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9" data-testid="input-holiday-date" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">{t("admin.newReasonEs")}</Label>
                <Input value={es} onChange={(e) => setEs(e.target.value)} className="h-9" data-testid="input-holiday-es" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("admin.newReasonEn")}</Label>
                <Input value={en} onChange={(e) => setEn(e.target.value)} className="h-9" data-testid="input-holiday-en" />
              </div>
            </div>
          </div>
          <Button size="sm" className="gap-1.5" onClick={add} disabled={!date || (!es.trim() && !en.trim())} data-testid="button-add-holiday">
            <Plus className="h-4 w-4" /> {t("admin.addHoliday")}
          </Button>
        </div>
      )}
    </Section>
  );
}

// ---- Break Room TV: Safety / Birthdays / Toolbox ----

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function SafetySection({ plant }: { plant: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { role } = useAuth();
  const { data: concerns, isLoading } = useSafetyConcerns();
  const [drafts, setDrafts] = useState<Record<number, { response?: string; status?: string }>>({});

  const roleName = role === "plant_manager" ? t("roles.plantShort") : t("roles.prodShort");

  async function save(id: number, currentResponse: string, currentStatus: string) {
    const d = drafts[id] || {};
    const response = d.response !== undefined ? d.response : currentResponse;
    const status = d.status !== undefined ? d.status : currentStatus;
    await apiRequest("PATCH", `/api/safety/concerns/${id}`, {
      response,
      respondedBy: response.trim() ? roleName : "",
      status,
    });
    queryClient.invalidateQueries({ queryKey: ["/api/safety/concerns"] });
    queryClient.invalidateQueries({ queryKey: ["/api/safety/recent-responses"] });
    setDrafts((prev) => { const n = { ...prev }; delete n[id]; return n; });
    toast({ description: t("toast.responseSaved") });
  }

  async function del(id: number) {
    await apiRequest("DELETE", `/api/safety/concerns/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/safety/concerns"] });
    queryClient.invalidateQueries({ queryKey: ["/api/safety/recent-responses"] });
    toast({ description: t("toast.concernDeleted") });
  }

  const badgeCls = (s: string) =>
    s === "closed" ? "bg-primary/15 text-primary"
      : s === "reviewed" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "bg-destructive/15 text-destructive";

  return (
    <Section icon={ShieldAlert} title={t("admin.safetyTab")} hint={t("admin.safetyHint")}>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        (concerns ?? []).length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground" data-testid="text-safety-empty">{t("admin.safetyNone")}</p>
        ) : (
          <div className="space-y-3">
            {(concerns ?? []).map((c) => {
              const d = drafts[c.id] || {};
              const response = d.response !== undefined ? d.response : c.response;
              const status = d.status !== undefined ? d.status : c.status;
              return (
                <div key={c.id} className="rounded-lg border border-border bg-secondary/30 p-3" data-testid={`safety-item-${c.id}`}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{c.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {c.submitterName ? c.submitterName : t("admin.safetyAnonymous")}
                        {c.submitterContact ? ` · ${c.submitterContact}` : ""}
                        {" · "}{new Date(c.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${badgeCls(status)}`} data-testid={`safety-status-${c.id}`}>
                      {t(`admin.status.${status}`)}
                    </span>
                  </div>
                  <Textarea
                    value={response}
                    onChange={(e) => setDrafts((p) => ({ ...p, [c.id]: { ...p[c.id], response: e.target.value } }))}
                    placeholder={t("admin.safetyResponsePlaceholder")}
                    rows={2}
                    className="resize-none text-sm"
                    data-testid={`input-safety-response-${c.id}`}
                  />
                  {c.respondedBy && (
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("admin.respondedBy")}: <span className="font-semibold">{c.respondedBy}</span></p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Select value={status} onValueChange={(v) => setDrafts((p) => ({ ...p, [c.id]: { ...p[c.id], status: v } }))}>
                      <SelectTrigger className="h-9 w-32" data-testid={`select-safety-status-${c.id}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">{t("admin.status.open")}</SelectItem>
                        <SelectItem value="reviewed">{t("admin.status.reviewed")}</SelectItem>
                        <SelectItem value="closed">{t("admin.status.closed")}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => save(c.id, c.response, c.status)} disabled={!drafts[c.id]} data-testid={`button-save-safety-${c.id}`}>
                      {t("admin.saveResponse")}
                    </Button>
                    {plant && (
                      <Button size="icon" variant="ghost" className="ml-auto text-muted-foreground hover:text-destructive" onClick={() => del(c.id)} data-testid={`button-delete-safety-${c.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </Section>
  );
}

function BirthdaysSection({ plant }: { plant: boolean }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: birthdays, isLoading } = useBirthdays();
  const [name, setName] = useState("");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("month", month);
      fd.append("day", day);
      if (photo) fd.append("photo", photo);
      await apiUpload("/api/birthdays", fd);
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
      queryClient.invalidateQueries({ queryKey: ["/api/birthdays/upcoming"] });
      setName(""); setMonth("1"); setDay("1"); setPhoto(null);
      toast({ description: t("toast.birthdayAdded") });
    } finally {
      setBusy(false);
    }
  }

  async function del(id: number) {
    await apiRequest("DELETE", `/api/birthdays/${id}`);
    queryClient.invalidateQueries({ queryKey: ["/api/birthdays"] });
    queryClient.invalidateQueries({ queryKey: ["/api/birthdays/upcoming"] });
    toast({ description: t("toast.birthdayDeleted") });
  }

  const sorted = [...(birthdays ?? [])].sort((a, b) => a.month - b.month || a.day - b.day);

  return (
    <Section icon={Cake} title={t("admin.birthdaysTab")} hint={t("admin.birthdaysHint")}>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground" data-testid="text-birthdays-empty">{t("admin.birthdaysNone")}</p>
        ) : (
          <div className="space-y-1.5">
            {sorted.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-md bg-secondary/40 px-3 py-2" data-testid={`birthday-item-${b.id}`}>
                {b.photoPath ? (
                  <img src={assetUrl(b.photoPath)} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><Cake className="h-4 w-4" /></span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{MONTHS[b.month - 1]} {b.day}</div>
                </div>
                {plant && (
                  <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => del(b.id)} data-testid={`button-delete-birthday-${b.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )
      )}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        <div className="space-y-1">
          <Label className="text-xs">{t("admin.bdName")} *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-9" data-testid="input-birthday-name" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.bdMonth")}</Label>
            <Select value={month} onValueChange={setMonth}>
              <SelectTrigger className="h-9" data-testid="select-birthday-month"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.bdDay")}</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger className="h-9" data-testid="select-birthday-day"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 31 }, (_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">{t("admin.bdPhoto")}</Label>
          <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="h-9 file:mr-2 file:text-xs" data-testid="input-birthday-photo" />
        </div>
        <Button size="sm" className="gap-1.5" onClick={add} disabled={busy || !name.trim()} data-testid="button-add-birthday">
          <Plus className="h-4 w-4" /> {t("admin.addBirthday")}
        </Button>
      </div>
    </Section>
  );
}

function mondayOfThisWeek(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function ToolboxSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: toolbox, isLoading } = useToolbox();
  const [title, setTitle] = useState("");
  const [presenter, setPresenter] = useState("Frank Eneman");
  const [notes, setNotes] = useState("");
  const [weekOf, setWeekOf] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Seed the form fields once from the server record.
  if (!initialized && toolbox !== undefined) {
    setTitle(toolbox?.title ?? "");
    setPresenter(toolbox?.presenter || "Frank Eneman");
    setNotes(toolbox?.notes ?? "");
    setWeekOf(toolbox?.weekOf || mondayOfThisWeek());
    setInitialized(true);
  }

  async function save() {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("presenter", presenter.trim());
      fd.append("notes", notes.trim());
      fd.append("weekOf", weekOf || mondayOfThisWeek());
      if (image) fd.append("image", image);
      const res = await fetch(`${assetUrl("/api/toolbox")}`, { method: "PUT", body: fd });
      if (!res.ok) throw new Error(String(res.status));
      queryClient.invalidateQueries({ queryKey: ["/api/toolbox"] });
      setImage(null);
      toast({ description: t("toast.toolboxSaved") });
    } catch {
      toast({ description: t("toast.error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Section icon={ClipboardList} title={t("admin.toolboxTab")} hint={t("admin.toolboxHint")}>
      {isLoading ? <Skeleton className="h-40 w-full" /> : (
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.toolboxTitle")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9" data-testid="input-toolbox-title" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.toolboxPresenter")}</Label>
            <Input value={presenter} onChange={(e) => setPresenter(e.target.value)} className="h-9" placeholder="Frank Eneman" data-testid="input-toolbox-presenter" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.toolboxWeekOf")}</Label>
            <Input type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} className="h-9" data-testid="input-toolbox-weekof" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.toolboxNotes")}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="resize-none text-sm" data-testid="input-toolbox-notes" />
            <p className="text-[11px] text-muted-foreground">The TV automatically adds “Questions? Contact Frank Eneman.” — no need to include it in notes.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("admin.toolboxImage")}</Label>
            {toolbox?.imagePath ? (
              <div className="mb-2">
                <div className="mb-1 text-[11px] text-muted-foreground">{t("admin.toolboxCurrent")}</div>
                <img src={assetUrl(toolbox.imagePath)} alt="" className="max-h-40 rounded-md border border-border object-contain" data-testid="img-toolbox-current" />
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">{t("admin.toolboxNoImage")}</p>
            )}
            <Input type="file" accept="image/*" onChange={(e) => setImage(e.target.files?.[0] ?? null)} className="h-9 file:mr-2 file:text-xs" data-testid="input-toolbox-image" />
          </div>
          <Button size="sm" onClick={save} disabled={busy} data-testid="button-save-toolbox">
            {t("admin.toolboxSave")}
          </Button>
        </div>
      )}
    </Section>
  );
}
