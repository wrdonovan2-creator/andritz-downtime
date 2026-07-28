import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import { Upload, Search, Loader2 } from "lucide-react";

type Order = {
  id: number;
  rowNum: number | null;
  shopStatus: string;
  salesOrder: string;
  docDate: string;
  poStatus: string;
  materialNum: string;
  materialDesc: string;
  shipToParty: string;
  city: string;
  co: string;
  unit: string;
  qty: number;
  incoterms: string;
};

const STATUS_STYLES: Record<string, string> = {
  "IN PROCESS": "bg-blue-500 text-white",
  READY: "bg-yellow-400 text-black",
  COMPLETE: "bg-green-500 text-white",
};

const PO_STYLES: Record<string, string> = {
  YES: "bg-green-500 text-white",
  NO: "bg-red-500 text-white",
  OV: "bg-orange-500 text-white",
};

export default function Production() {
  const { t } = useTranslation();
  const { role } = useAuth();
  const { toast } = useToast();
  const isManager = role === "plant_manager" || role === "production_manager";

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/production-orders"],
  });

  const [filter, setFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);

  const counts = useMemo(() => {
    const c = { "IN PROCESS": 0, READY: 0, COMPLETE: 0, TOTAL: orders.length };
    for (const o of orders) c[o.shopStatus as keyof typeof c] = (c[o.shopStatus as keyof typeof c] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "ALL" && o.shopStatus !== filter) return false;
      if (!s) return true;
      return (
        o.salesOrder.toLowerCase().includes(s) ||
        o.materialDesc.toLowerCase().includes(s) ||
        o.shipToParty.toLowerCase().includes(s) ||
        o.city.toLowerCase().includes(s) ||
        o.materialNum.toLowerCase().includes(s)
      );
    });
  }, [orders, filter, search]);

  async function handleImport() {
    if (!pasteText.trim()) {
      toast({ title: "Nothing to import", description: "Paste your Excel data first.", variant: "destructive" });
      return;
    }
    setImporting(true);
    try {
      const res = await apiRequest("POST", "/api/production-orders/import", { text: pasteText });
      const data = await res.json();
      toast({ title: "Import complete", description: `Loaded ${data.count} orders.` });
      setShowImport(false);
      setPasteText("");
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
    } catch (e: any) {
      toast({ title: "Import failed", description: e?.message || "Check paste format.", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("production.title")}
        subtitle={t("production.subtitle")}
        action={
          isManager && (
            <Button onClick={() => setShowImport(!showImport)} data-testid="button-import-orders">
              <Upload className="mr-2 h-4 w-4" /> {t("production.import")}
            </Button>
          )
        }
      />

      {showImport && (
        <Card className="mb-6" data-testid="card-import">
          <CardHeader>
            <CardTitle>{t("production.pasteTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("production.pasteHint")}</p>
            <Textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={t("production.pastePlaceholder")}
              rows={10}
              className="font-mono text-xs"
              data-testid="input-paste"
            />
            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={importing} data-testid="button-confirm-import">
                {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("production.replaceAll")}
              </Button>
              <Button variant="outline" onClick={() => { setShowImport(false); setPasteText(""); }}>
                {t("common.cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPI label={t("production.total")} value={counts.TOTAL} tone="neutral" />
        <KPI label="IN PROCESS" value={counts["IN PROCESS"]} tone="blue" />
        <KPI label="READY" value={counts.READY} tone="yellow" />
        <KPI label="COMPLETE" value={counts.COMPLETE} tone="green" />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["ALL", "IN PROCESS", "READY", "COMPLETE"].map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            onClick={() => setFilter(s)}
            data-testid={`filter-${s.toLowerCase().replace(" ", "-")}`}
          >
            {s}
          </Button>
        ))}
        <div className="relative ml-auto w-full md:w-64">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("production.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
            data-testid="input-search"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Shop Status</th>
                    <th className="p-2 text-left">Sales Order</th>
                    <th className="p-2 text-left">Doc Date</th>
                    <th className="p-2 text-left">PO Status</th>
                    <th className="p-2 text-left">Material #</th>
                    <th className="p-2 text-left">Material Desc</th>
                    <th className="p-2 text-left">Ship-To Party</th>
                    <th className="p-2 text-left">City</th>
                    <th className="p-2 text-left">CO</th>
                    <th className="p-2 text-left">Unit</th>
                    <th className="p-2 text-right">Qty</th>
                    <th className="p-2 text-left">Incoterms</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((o) => (
                    <tr key={o.id} className="border-b hover:bg-muted/20" data-testid={`row-order-${o.id}`}>
                      <td className="p-2">{o.rowNum ?? o.id}</td>
                      <td className="p-2">
                        <span className={cn("rounded px-2 py-0.5 text-xs font-bold", STATUS_STYLES[o.shopStatus] || "bg-gray-500 text-white")}>
                          {o.shopStatus}
                        </span>
                      </td>
                      <td className="p-2 font-mono">{o.salesOrder}</td>
                      <td className="p-2">{o.docDate}</td>
                      <td className="p-2">
                        <span className={cn("rounded px-2 py-0.5 text-xs font-bold", PO_STYLES[o.poStatus] || "bg-gray-500 text-white")}>
                          {o.poStatus}
                        </span>
                      </td>
                      <td className="p-2 font-mono text-xs">{o.materialNum}</td>
                      <td className="p-2 text-xs">{o.materialDesc}</td>
                      <td className="p-2">{o.shipToParty}</td>
                      <td className="p-2">{o.city}</td>
                      <td className="p-2">{o.co}</td>
                      <td className="p-2">{o.unit}</td>
                      <td className="p-2 text-right font-semibold">{o.qty}</td>
                      <td className="p-2 text-xs">{o.incoterms}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={13} className="p-8 text-center text-muted-foreground">
                        {t("production.noOrders")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ label, value, tone }: { label: string; value: number; tone: "neutral" | "blue" | "yellow" | "green" }) {
  const toneClass = {
    neutral: "border-l-slate-500",
    blue: "border-l-blue-500",
    yellow: "border-l-yellow-400",
    green: "border-l-green-500",
  }[tone];
  return (
    <Card className={cn("border-l-4", toneClass)}>
      <CardContent className="p-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  );
}
