import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/shell";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export default function Status() {
  const { t } = useTranslation();
  const { data, isLoading } = useDashboard(30000);
  const rows = data?.rows ?? [];
  const downCount = rows.filter((r) => r.status === "DOWN").length;

  return (
    <div>
      <PageHeader
        title={t("pages.statusTitle")}
        subtitle={t("pages.statusSub")}
        action={
          <div className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-green-500" /> {t("status.up")}</span>
            <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-red-500" /> {t("status.down")}</span>
          </div>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      ) : (
        <>
          {downCount === 0 ? (
            <div className="mb-4 rounded-lg border border-green-600/40 bg-green-600/10 px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-500" data-testid="banner-all-running">
              {t("empty.noOpenDelays")}
            </div>
          ) : (
            <div className="mb-4 rounded-lg border border-red-600/40 bg-red-600/10 px-4 py-3 text-sm font-semibold text-red-500" data-testid="banner-down">
              {downCount} {t("tv.assetsDown")}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {rows.map((r) => {
              const down = r.status === "DOWN";
              return (
                <div
                  key={r.assetId}
                  data-testid={`status-card-${r.assetId}`}
                  className={cn(
                    "flex min-h-[112px] flex-col justify-between rounded-xl border-2 p-4",
                    down
                      ? "border-red-600/50 bg-red-600/10"
                      : "border-green-600/40 bg-green-600/10"
                  )}
                >
                  <div className={cn("h-3 w-3 rounded-full", down ? "bg-red-500 animate-pulse" : "bg-green-500")} />
                  <div>
                    <div className="text-sm font-bold leading-tight">{r.assetName}</div>
                    <div className={cn("mt-1 text-xs font-bold uppercase tracking-wide", down ? "text-red-500" : "text-green-600 dark:text-green-500")}>
                      {down ? t("status.down") : t("status.up")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
