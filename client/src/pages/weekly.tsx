import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useWeekly, CURRENT_YEAR } from "@/lib/hooks";
import { useLang } from "@/lib/lang";
import { fmtMoney, fmtHours, fmtInt, fmtDate } from "@/i18n";

export default function Weekly() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { data, isLoading } = useWeekly();
  const rows = data ?? [];

  const totals = rows.reduce(
    (acc, r) => ({ events: acc.events + r.events, hours: acc.hours + r.downHours, cost: acc.cost + r.cost }),
    { events: 0, hours: 0, cost: 0 }
  );

  return (
    <div>
      <PageHeader title={t("pages.weeklyTitle")} subtitle={t("pages.weeklySub", { year: CURRENT_YEAR })} />
      <div className="overflow-hidden rounded-xl border border-card-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{minWidth: '640px'}}>
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-semibold">{t("table.week")}</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("table.weekStart")}</th>
                <th className="whitespace-nowrap px-4 py-3 font-semibold">{t("table.weekEnd")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.events")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.downHours")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("table.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50"><td colSpan={6} className="px-4 py-2.5"><Skeleton className="h-5 w-full" /></td></tr>
                ))
              ) : (
                rows.map((r) => {
                  const active = r.events > 0;
                  return (
                    <tr key={r.week} data-testid={`week-row-${r.week}`} className={`border-b border-border/50 last:border-0 ${active ? "hover-elevate" : "opacity-50"}`}>
                      <td className="px-4 py-2.5 font-medium tabular-nums">{r.week}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(r.weekStart, lang)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-muted-foreground">{fmtDate(r.weekEnd, lang)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{fmtInt(r.events, lang)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.downHours > 0 ? fmtHours(r.downHours, lang) : "—"}</td>
                      <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.cost > 0 ? fmtMoney(r.cost, lang) : "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!isLoading && (
              <tfoot>
                <tr className="border-t-2 border-border bg-secondary/40 font-bold">
                  <td className="px-4 py-3" colSpan={3}>{t("misc.total")}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtInt(totals.events, lang)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtHours(totals.hours, lang)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(totals.cost, lang)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
