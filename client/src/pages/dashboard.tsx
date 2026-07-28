import { useTranslation } from "react-i18next";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { PageHeader, StatusPill } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard, CURRENT_YEAR } from "@/lib/hooks";
import { useLang } from "@/lib/lang";
import { fmtMoney, fmtHours, fmtInt } from "@/i18n";
import { DollarSign, Clock, ListChecks, AlertTriangle, Users } from "lucide-react";

function Kpi({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone?: "danger" }) {
  return (
    <div className="rounded-xl border border-card-border bg-card p-4" data-testid={`kpi-${label}`}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-red-500" : "text-primary"}`} />
        {label}
      </div>
      <div className={`mt-2 text-xl font-bold tabular-nums ${tone === "danger" ? "text-red-500" : ""}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { data, isLoading } = useDashboard();

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const topOps = data?.topOperators ?? [];

  // top assets by cost for the chart
  const chartData = [...rows]
    .filter((r) => r.cost > 0)
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 8)
    .map((r) => ({ name: r.assetName.split(" ")[0], full: r.assetName, cost: r.cost }));

  return (
    <div>
      <PageHeader title={t("pages.dashboardTitle")} subtitle={t("pages.dashboardSub", { year: CURRENT_YEAR })} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {isLoading || !totals ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <Kpi icon={DollarSign} label={t("kpi.ytdCost")} value={fmtMoney(totals.ytdCost, lang)} />
            <Kpi icon={Clock} label={t("kpi.totalHours")} value={fmtHours(totals.totalHours, lang)} />
            <Kpi icon={ListChecks} label={t("kpi.events")} value={fmtInt(totals.totalEvents, lang)} />
            <Kpi icon={AlertTriangle} label={t("kpi.assetsDownNow")} value={`${totals.assetsDownNow}`} tone={totals.assetsDownNow > 0 ? "danger" : undefined} />
          </>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="rounded-xl border border-card-border bg-card p-4 lg:col-span-2">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("tv.topOffenders")}</h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t("empty.noDelays")}</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                  formatter={(v: number) => [fmtMoney(v, lang), t("table.cost")]}
                  labelFormatter={(l, p) => (p && p[0] ? (p[0].payload as any).full : l)}
                />
                <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top operators */}
        <div className="rounded-xl border border-card-border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Users className="h-4 w-4" /> {t("kpi.topOperators")}
          </h2>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : topOps.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-center text-sm text-muted-foreground">{t("empty.noOperators")}</div>
          ) : (
            <ul className="space-y-2">
              {topOps.map((op, i) => (
                <li key={op.name} data-testid={`operator-row-${i}`} className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary">{i + 1}</span>
                    {op.name}
                  </span>
                  <span className="text-sm font-bold tabular-nums">{fmtHours(op.hours, lang)}h</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Per-asset table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-card-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{minWidth: '520px'}}>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t("table.asset")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.events")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.downHours")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.cost")}</th>
                <th className="px-4 py-3 text-center font-semibold">{t("table.status")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50"><td colSpan={5} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : (
                rows.map((r) => (
                  <tr key={r.assetId} data-testid={`asset-row-${r.assetId}`} className="border-b border-border/50 last:border-0 hover-elevate">
                    <td className="px-4 py-3 font-medium">{r.assetName}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtInt(r.events, lang)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtHours(r.downHours, lang)}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtMoney(r.cost, lang)}</td>
                    <td className="px-4 py-3 text-center"><StatusPill status={r.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
