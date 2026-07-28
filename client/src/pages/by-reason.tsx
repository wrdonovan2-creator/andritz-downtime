import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PageHeader } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useByReason, CURRENT_YEAR } from "@/lib/hooks";
import { useLang } from "@/lib/lang";
import { fmtMoney, fmtHours, fmtInt } from "@/i18n";

export default function ByReason() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { data, isLoading } = useByReason();
  const rows = (data ?? []).slice().sort((a, b) => b.cost - a.cost);
  const label = (r: any) => (lang === "es" ? r.reasonEs || r.reasonEn : r.reasonEn || r.reasonEs);

  const chartData = rows.filter((r) => r.cost > 0).slice(0, 8).map((r) => ({ name: label(r), cost: r.cost }));

  return (
    <div>
      <PageHeader title={t("pages.reasonTitle")} subtitle={t("pages.reasonSub", { year: CURRENT_YEAR })} />

      <div className="rounded-xl border border-card-border bg-card p-4">
        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{t("empty.noDelays")}</div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" width={140} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 13 }}
                formatter={(v: number) => [fmtMoney(v, lang), t("table.cost")]}
              />
              <Bar dataKey="cost" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill="hsl(var(--primary))" />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-card-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{minWidth: '560px'}}>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t("table.reason")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.events")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.downHours")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50"><td colSpan={4} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : (
                rows.map((r) => (
                  <tr key={r.reasonId} data-testid={`reason-row-${r.reasonId}`} className="border-b border-border/50 last:border-0 hover-elevate">
                    <td className="px-4 py-3 font-medium">{label(r)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{fmtInt(r.events, lang)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{r.downHours > 0 ? fmtHours(r.downHours, lang) : "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.cost > 0 ? fmtMoney(r.cost, lang) : "—"}</td>
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
