import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QRCodeSVG } from "qrcode.react";
import { useDashboard, useDelays, useByReason, useToolbox, useUpcomingBirthdays, useRecentResponses, useOpenConcerns, useHolidays, useProductionOrders, useOtd, useProductivity } from "@/lib/hooks";
import { useLang } from "@/lib/lang";
import { fmtMoney, fmtHours, fmtInt } from "@/i18n";
import { assetUrl } from "@/lib/api";
import { getGreeting, getGreetingOther } from "@/lib/greeting";
import andritzLogo from "@assets/andritz-logo.png";

const SLIDE_MS = 15000;

const SAFETY_URL = "https://shd.pplx.app/#/safety";

// Concerns per slide when there are multiple open safety concerns.
const CONCERNS_PER_SLIDE = 3;

// Holiday window — show the holiday slide from 3 days BEFORE through 1 day AFTER.
const HOLIDAY_DAYS_BEFORE = 3;
const HOLIDAY_DAYS_AFTER = 1;

// TEST OVERRIDES from URL search params:
//   ?forceHoliday=YYYY-MM-DD  — force holiday slide to include this date
//   ?slide=<key>              — pin the TV to a single slide (no rotation)
function getForceHolidayDate(): string | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  return p.get("forceHoliday");
}
function getPinnedSlide(): string | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  return p.get("slide");
}

function elapsed(dateDown: string, timeDown: string): string {
  const start = new Date(`${dateDown}T${(timeDown || "00:00").slice(0, 5)}:00`).getTime();
  const diff = Math.max(0, Date.now() - start);
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return `${h}:${String(m).padStart(2, "0")}`;
}

export default function Tv() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const [slide, setSlide] = useState<string>("greeting");
  const [, setTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: dash } = useDashboard(30000);
  const { data: delays } = useDelays(30000);
  const { data: reasons } = useByReason(30000);
  const { data: toolbox } = useToolbox(60000);
  const { data: birthdays } = useUpcomingBirthdays(60000);
  const { data: responses } = useRecentResponses(60000);
  const { data: openConcerns } = useOpenConcerns(30000);
  const { data: allHolidays } = useHolidays();
  const { data: prodOrders } = useProductionOrders(60000);
  const { data: otd } = useOtd(new Date().getFullYear(), 60000);
  const { data: productivity } = useProductivity(60000);

  // Birthday slide only appears when someone has a birthday TODAY.
  const hasBirthdayToday = (birthdays ?? []).some((b) => b.isToday);

  // Chunk open safety concerns into pages of CONCERNS_PER_SLIDE.
  const openList = openConcerns ?? [];
  const concernPages: typeof openList[] = [];
  for (let i = 0; i < openList.length; i += CONCERNS_PER_SLIDE) {
    concernPages.push(openList.slice(i, i + CONCERNS_PER_SLIDE));
  }

  // Find an active holiday within the window (or forced by URL for preview).
  const forceDate = getForceHolidayDate();
  const activeHoliday = (() => {
    if (!allHolidays || allHolidays.length === 0) return null;
    if (forceDate) {
      const found = allHolidays.find((h) => h.date === forceDate);
      if (found) return found;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const h of allHolidays) {
      const [y, m, d] = h.date.split("-").map((x) => parseInt(x, 10));
      const hd = new Date(y, m - 1, d);
      hd.setHours(0, 0, 0, 0);
      const diffDays = Math.round((hd.getTime() - today.getTime()) / 86400000);
      if (diffDays >= -HOLIDAY_DAYS_AFTER && diffDays <= HOLIDAY_DAYS_BEFORE) return h;
    }
    return null;
  })();

  // Build an ordered list of slide keys. Static slides + conditional dynamic ones.
  const inProcessCount = (prodOrders ?? []).filter((r: any) => r.shopStatus === "IN PROCESS").length;
  const productionPageCount = Math.max(1, Math.ceil(inProcessCount / 12));

  const activeSlides: string[] = [
    "greeting",
    "status",
    "scorecard",
    "topAssets",
    "byReason",
    "currentState",
    ...Array.from({ length: productionPageCount }, (_, i) => `production:${i}`),
    "otd",
    "productivity",
    "toolbox",
    ...(activeHoliday ? ["holiday"] : []),
    ...(hasBirthdayToday ? ["birthday"] : []),
    ...concernPages.map((_, i) => `openConcerns:${i}`),
    "safety",
  ];

  const pinnedSlide = getPinnedSlide();

  // rotate slides (skipped when pinned via ?slide=)
  useEffect(() => {
    if (pinnedSlide) return;
    const id = setInterval(() => {
      setSlide((s) => {
        const currentPos = activeSlides.indexOf(s);
        const nextPos = (currentPos + 1) % activeSlides.length;
        return activeSlides[nextPos];
      });
    }, SLIDE_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlides.length, pinnedSlide]);

  // Apply pinned slide on load and whenever it changes.
  useEffect(() => {
    if (pinnedSlide && activeSlides.includes(pinnedSlide)) {
      setSlide(pinnedSlide);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinnedSlide, activeSlides.join(",")]);

  // If the current slide got filtered out, jump forward.
  useEffect(() => {
    if (!activeSlides.includes(slide)) {
      setSlide(activeSlides[0] ?? "greeting");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSlides.join(","), slide]);

  // tick every 30s so "DOWN FOR" counters + greeting update
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, []);

  // hourly full reload (kiosk resilience)
  useEffect(() => {
    const meta = document.createElement("meta");
    meta.httpEquiv = "refresh";
    meta.content = "3600";
    document.head.appendChild(meta);
    document.documentElement.classList.add("dark");
    return () => { meta.remove(); };
  }, []);

  // hide cursor after 3s inactivity
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;
    const show = () => {
      el.style.cursor = "default";
      clearTimeout(timer);
      timer = setTimeout(() => { el.style.cursor = "none"; }, 3000);
    };
    show();
    window.addEventListener("mousemove", show);
    return () => { window.removeEventListener("mousemove", show); clearTimeout(timer); };
  }, []);

  const rows = dash?.rows ?? [];
  const totals = dash?.totals;
  const openDelays = (delays ?? []).filter((d) => d.open);
  const downMap = new Map(openDelays.map((d) => [d.assetId, d]));
  const topOffenders = [...rows].filter((r) => r.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 5);
  const totalReasonCost = (reasons ?? []).reduce((s, r) => s + r.cost, 0);
  const topReasons = [...(reasons ?? [])].filter((r) => r.cost > 0).sort((a, b) => b.cost - a.cost).slice(0, 5);
  const reasonLabelBi = (r: any) => (lang === "es" ? r.reasonEs || r.reasonEn : r.reasonEn || r.reasonEs);

  const now = new Date();
  const greet = getGreeting(now, lang);
  const greetOther = getGreetingOther(now, lang);
  const dateStr = now.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  // Current-state bilingual: show top 4 open delays by longest downtime.
  const currentSorted = [...openDelays].sort((a, b) => {
    const at = new Date(`${a.dateDown}T${(a.timeDown || "00:00").slice(0, 5)}:00`).getTime();
    const bt = new Date(`${b.dateDown}T${(b.timeDown || "00:00").slice(0, 5)}:00`).getTime();
    return at - bt; // earliest down = longest = first
  });
  const currentShown = currentSorted.slice(0, 4);
  const currentExtra = Math.max(0, currentSorted.length - 4);

  const bdayList = birthdays ?? [];
  const bdayToday = bdayList.filter((b) => b.isToday);
  const recentResponded = (responses ?? []).slice(0, 2);

  return (
    <div ref={containerRef} className="dark relative min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* NOTE: no REQUEST HELP button on the unattended TV kiosk — the kiosk is
           receive-only. The full-screen distress overlay (mounted globally in
           <DistressBroadcaster />) still surfaces here when an operator or
           manager triggers help from a signed-in station. */}
      {/* header — stacks on phone, side-by-side on tablet/TV */}
      <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-10 sm:py-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <img src={andritzLogo} alt="ANDRITZ" className="h-7 w-auto shrink-0 sm:h-9" />
          <div className="min-w-0">
            <div className="truncate text-sm font-bold sm:text-lg">ANDRITZ METALS — V403 South Holland, IL</div>
            <div className="truncate text-[10px] uppercase tracking-widest text-white/50 sm:text-xs">Asset Downtime · Downtime de Activos</div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 sm:gap-6">
          <MetalClock now={now} />
          <div className="flex items-center gap-1.5 sm:gap-2">
            {activeSlides.map((i) => (
              <span key={i} className={`h-2 rounded-full transition-all ${i === slide ? "w-6 bg-primary sm:w-8" : "w-2 bg-white/25"}`} data-testid={`indicator-${i}`} />
            ))}
          </div>
        </div>
      </div>

      <div key={slide} className="animate-[fadeIn_0.6s_ease] px-4 py-6 sm:px-10 sm:py-8">
        {/* SLIDE 0 — GREETING */}
        {slide === "greeting" && (
          <div className="relative flex min-h-[70vh] flex-col items-center justify-center text-center" data-testid="slide-greeting">
            <img src={andritzLogo} alt="" aria-hidden className="pointer-events-none absolute inset-0 m-auto w-[52vw] max-w-3xl opacity-[0.06]" />
            <div className="relative z-10">
              <div className="text-lg font-medium capitalize tracking-wide text-white/45" data-testid="text-greeting-date">{dateStr}</div>
              <h1 className="mt-4 text-[clamp(3rem,8vw,7rem)] font-black leading-[0.95] tracking-tight text-white" data-testid="text-greeting-title">
                {greet.title}
              </h1>
              <p className="mt-6 text-2xl font-semibold text-primary">{greet.subtitle}</p>
              <p className="mt-2 text-xl text-white/50">{greetOther.title} · {greetOther.subtitle}</p>
            </div>
          </div>
        )}

        {/* SLIDE 1 — STATUS BOARD */}
        {slide === "status" && (
          <Slide title={`${t("tv.statusBoard")}`}>
            <div className="grid grid-cols-3 gap-4 xl:grid-cols-5">
              {rows.map((r) => {
                const d = downMap.get(r.assetId);
                const down = r.status === "DOWN";
                return (
                  <div key={r.assetId} className={`flex flex-col justify-between rounded-2xl border-2 p-5 ${down ? "border-red-500/60 bg-red-500/10" : "border-green-500/40 bg-green-500/10"}`}>
                    <div className="flex items-center justify-between">
                      <span className={`h-4 w-4 rounded-full ${down ? "bg-red-500 animate-pulse" : "bg-green-500"}`} />
                      <span className={`text-sm font-black uppercase ${down ? "text-red-400" : "text-green-400"}`}>{down ? t("status.down") : t("status.up")}</span>
                    </div>
                    <div className="mt-3 text-lg font-bold leading-tight">{r.assetName}</div>
                    {down && d && (
                      <div className="mt-2 text-xs text-white/70">
                        <div className="font-semibold text-red-300">{t("tv.downFor")} {elapsed(d.dateDown, d.timeDown)}</div>
                        {(d.reasonLabelEs || d.reasonLabelEn) && <div>{lang === "es" ? d.reasonLabelEs : d.reasonLabelEn}</div>}
                        {d.employeeName && <div className="text-white/50">{d.employeeName}</div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Slide>
        )}

        {/* SLIDE 2 — SCORECARD */}
        {slide === "scorecard" && totals && (
          <Slide title={t("tv.scorecard")}>
            <div className="grid grid-cols-2 gap-6 xl:grid-cols-4">
              <BigKpi label={t("kpi.ytdCost")} value={fmtMoney(totals.ytdCost, lang)} tone="primary" />
              <BigKpi label={t("kpi.totalHours")} value={fmtHours(totals.totalHours, lang)} />
              <BigKpi label={t("kpi.events")} value={fmtInt(totals.totalEvents, lang)} />
              <BigKpi label={t("kpi.assetsDownNow")} value={`${totals.assetsDownNow}`} tone={totals.assetsDownNow > 0 ? "danger" : "green"} />
            </div>
          </Slide>
        )}

        {/* SLIDE 3 — TOP OFFENDERS */}
        {slide === "topAssets" && (
          <Slide title={t("tv.topOffenders")}>
            {topOffenders.length === 0 ? <Empty text={t("empty.noDelays")} /> : (
              <div className="space-y-5">
                {topOffenders.map((r, i) => {
                  const max = topOffenders[0].cost || 1;
                  return (
                    <div key={r.assetId}>
                      <div className="mb-1.5 flex items-center justify-between text-xl font-bold">
                        <span>{i + 1}. {r.assetName}</span>
                        <span className="tabular-nums text-primary">{fmtMoney(r.cost, lang)}</span>
                      </div>
                      <div className="h-6 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.cost / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Slide>
        )}

        {/* SLIDE 4 — BY REASON */}
        {slide === "byReason" && (
          <Slide title={t("tv.byReason")}>
            {topReasons.length === 0 ? <Empty text={t("empty.noDelays")} /> : (
              <div className="space-y-5">
                {topReasons.map((r, i) => {
                  const pct = totalReasonCost > 0 ? (r.cost / totalReasonCost) * 100 : 0;
                  const max = topReasons[0].cost || 1;
                  return (
                    <div key={r.reasonId}>
                      <div className="mb-1.5 flex items-center justify-between text-xl font-bold">
                        <span>{i + 1}. {reasonLabelBi(r)}</span>
                        <span className="tabular-nums text-primary">{fmtMoney(r.cost, lang)} <span className="text-base text-white/50">({pct.toFixed(0)}% {t("tv.ofTotal")})</span></span>
                      </div>
                      <div className="h-6 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(r.cost / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Slide>
        )}

        {/* SLIDE 5 — CURRENT STATE (bilingual side-by-side) */}
        {slide === "currentState" && (
          <Slide title={t("tv.currentState")}>
            {currentShown.length === 0 ? <Empty text={t("tv.allRunning")} /> : (
              <div className="grid grid-cols-2 gap-8">
                <CurrentStateColumn lang="en" delays={currentShown} extra={currentExtra} />
                <div className="border-l border-white/10 pl-8">
                  <CurrentStateColumn lang="es" delays={currentShown} extra={currentExtra} />
                </div>
              </div>
            )}
          </Slide>
        )}

        {/* SLIDE 6 — TOOLBOX TALK */}
        {slide.startsWith("production:") && (() => {
          const pageIdx = parseInt(slide.split(":")[1] || "0", 10);
          const rows = prodOrders ?? [];
          const inProcessAll = rows.filter((r: any) => r.shopStatus === "IN PROCESS");
          const readyAll = rows.filter((r: any) => r.shopStatus === "READY");
          const complete = rows.filter((r: any) => r.shopStatus === "COMPLETE").length;
          const total = rows.length;
          const perPage = 12;
          const pageStart = pageIdx * perPage;
          const inProcessPage = inProcessAll.slice(pageStart, pageStart + perPage);
          const readyList = readyAll.slice(0, 12);
          const totalPages = productionPageCount;
          const pageSuffix = totalPages > 1 ? ` (${pageIdx + 1}/${totalPages})` : "";
          return (
            <Slide title={(t("tv.productionTitle") || "Production Status") + pageSuffix}>
              <div>
                <div className="grid grid-cols-4 gap-4">
                  <BigKpi label={t("tv.total") || "Total Orders"} value={String(total)} />
                  <BigKpi label={t("tv.inProcess") || "In Process"} value={String(inProcessAll.length)} tone="primary" />
                  <BigKpi label={t("tv.ready") || "Ready to Ship"} value={String(readyAll.length)} tone={readyAll.length > 0 ? "green" : undefined} />
                  <BigKpi label={t("tv.complete") || "Complete"} value={String(complete)} />
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                    <div className="mb-3 flex items-baseline justify-between">
                      <div className="text-xl font-black tracking-tight text-primary">
                        {t("tv.inProcess") || "In Process"} ({inProcessAll.length})
                      </div>
                      {totalPages > 1 && (
                        <div className="text-sm font-semibold text-white/40">
                          {pageStart + 1}–{Math.min(pageStart + perPage, inProcessAll.length)} of {inProcessAll.length}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      {inProcessPage.map((r: any) => (
                        <div key={r.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 text-[15px] leading-tight">
                          <span className="font-bold tabular-nums text-white">{r.salesOrder}</span>
                          <span className="truncate text-white/60">
                            {r.shipToParty}
                            {r.city ? <span className="text-white/40"> — {r.city}</span> : null}
                          </span>
                          <span className="tabular-nums font-semibold text-white/70">{r.qty}{r.unit ? <span className="text-white/40"> {r.unit}</span> : null}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-green-400/30 bg-green-400/10 p-5">
                    <div className="mb-3 text-xl font-black tracking-tight text-green-400">
                      {t("tv.readyToShip") || "Ready to Ship"} ({readyAll.length})
                    </div>
                    <div className="space-y-1">
                      {readyList.map((r: any) => (
                        <div key={r.id} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-2 text-[15px] leading-tight">
                          <span className="font-bold tabular-nums text-white">{r.salesOrder}</span>
                          <span className="truncate text-white/60">
                            {r.shipToParty}
                            {r.city ? <span className="text-white/40"> — {r.city}</span> : null}
                          </span>
                          <span className="tabular-nums font-semibold text-white/70">{r.qty}{r.unit ? <span className="text-white/40"> {r.unit}</span> : null}</span>
                        </div>
                      ))}
                      {readyAll.length === 0 && (
                        <div className="text-sm text-white/40">No orders ready.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Slide>
          );
        })()}

        {slide === "otd" && (
          <Slide title={`${new Date().getFullYear()} ${t("tv.otdTitle") || "On-Time Delivery"}`}>
            {(() => {
              const monthLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
              const goal = otd?.goal ?? null;
              const months = otd?.months ?? [];
              const byMonth: (number | null)[] = Array(12).fill(null);
              for (const m of months) byMonth[m.month - 1] = m.percent;
              const actuals = byMonth.filter((v): v is number => v != null && v > 0);
              const ytd = actuals.length ? Math.round(actuals.reduce((s, v) => s + v, 0) / actuals.length) : null;
              return (
                <div>
                  <div className="mb-6 grid grid-cols-2 gap-6">
                    <BigKpi
                      label={t("tv.goal") || "Goal"}
                      value={goal != null ? `${Math.round(goal)}%` : "—"}
                      tone="primary"
                    />
                    <BigKpi
                      label={t("tv.ytdActual") || "YTD Actual"}
                      value={ytd != null ? `${ytd}%` : "—"}
                      tone={goal != null && ytd != null ? (ytd >= goal ? "green" : "danger") : undefined}
                    />
                  </div>
                  {/* Chart: bars, gridlines and goal line all share the same 300px plot area */}
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                    {(() => {
                      const PLOT_PX = 300;    // 0-100% maps to 0-300px
                      const X_LABEL_PX = 24;  // room below plot for Jan/Feb/... labels
                      return (
                        <div className="relative" style={{ height: `${PLOT_PX + X_LABEL_PX}px` }}>
                          {/* Plot area (anchored to top of x-axis labels) */}
                          <div
                            className="absolute left-8 right-2"
                            style={{ bottom: `${X_LABEL_PX}px`, height: `${PLOT_PX}px` }}
                          >
                            {/* Y-axis gridlines */}
                            {[0, 20, 40, 60, 80, 100].map((y) => (
                              <div
                                key={y}
                                className="absolute left-0 right-0 border-t border-white/5"
                                style={{ bottom: `${(y / 100) * PLOT_PX}px` }}
                              >
                                <span className="absolute -left-8 -top-2.5 w-7 text-right text-xs text-white/40">
                                  {y}%
                                </span>
                              </div>
                            ))}
                            {/* Goal reference line */}
                            {goal != null && (
                              <div
                                className="absolute left-0 right-0 border-t-2 border-dashed border-yellow-400"
                                style={{ bottom: `${(goal / 100) * PLOT_PX}px` }}
                              >
                                <div className="absolute -top-3.5 right-0 rounded bg-yellow-400 px-2 py-0.5 text-xs font-black text-black">
                                  Goal {Math.round(goal)}%
                                </div>
                              </div>
                            )}
                            {/* Bars — each column is the full plot height, bar grows from bottom */}
                            <div className="absolute inset-0 flex items-end justify-between">
                              {byMonth.map((v, i) => {
                                const hasVal = v != null && v > 0;
                                const barPx = hasVal ? (v / 100) * PLOT_PX : 0;
                                const meetsGoal = goal != null && hasVal && v >= goal;
                                return (
                                  <div key={i} className="flex flex-1 flex-col items-center justify-end" style={{ height: `${PLOT_PX}px` }}>
                                    {hasVal && (
                                      <div className="text-sm font-bold tabular-nums text-white" style={{ marginBottom: "2px" }}>
                                        {Math.round(v!)}%
                                      </div>
                                    )}
                                    <div
                                      className={`w-3/5 rounded-t ${meetsGoal ? "bg-green-400" : hasVal ? "bg-sky-400" : "bg-white/10"}`}
                                      style={{ height: `${Math.max(barPx, hasVal ? 4 : 2)}px` }}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          {/* X-axis month labels, aligned to the same column layout */}
                          <div
                            className="absolute left-8 right-2 flex items-start justify-between"
                            style={{ bottom: 0, height: `${X_LABEL_PX}px` }}
                          >
                            {monthLabels.map((m, i) => (
                              <div key={i} className="flex flex-1 justify-center text-sm font-semibold text-white/60">
                                {m}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </Slide>
        )}

        {slide === "productivity" && (
          <Slide title={t("tv.productivityTitle") || "Productivity"}>
            {(() => {
              const target = productivity?.target ?? 85;
              const ytdPct = productivity?.ytd?.productivity ?? null;
              const l30Pct = productivity?.l30?.productivity ?? null;
              const l7Pct  = productivity?.l7?.productivity ?? null;
              const fmtPct = (v: number | null | undefined) => (v == null ? "—" : `${v.toFixed(1)}%`);
              const fmtNum = (v: number | null | undefined, digits = 0) => {
                if (v == null) return "—";
                return digits === 0 ? Math.round(v).toLocaleString() : v.toFixed(digits);
              };
              const meetsTarget = (v: number | null) => v != null && v >= target;
              return (
                <div>
                  <div className="mb-2 text-center text-lg font-semibold uppercase tracking-widest text-white/60">
                    {t("tv.productivitySubtitle") || "Planned vs. Confirmed DLH"}
                  </div>
                  {/* Top row: Target vs YTD Actual (matches OTD slide style) */}
                  <div className="mb-6 grid grid-cols-2 gap-6">
                    <BigKpi
                      label={t("tv.productivityTarget") || "Target"}
                      value={`${target.toFixed(0)}%`}
                      tone="primary"
                    />
                    <BigKpi
                      label={t("tv.productivityYtd") || "YTD Actual"}
                      value={fmtPct(ytdPct)}
                      tone={ytdPct != null ? (meetsTarget(ytdPct) ? "green" : "danger") : undefined}
                    />
                  </div>
                  {/* Bottom row: three period cards */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { key: "ytd", label: t("tv.productivityYtdShort") || "YTD", p: productivity?.ytd, pct: ytdPct },
                      { key: "l30", label: t("tv.productivityL30") || "LAST 30 DAYS", p: productivity?.l30, pct: l30Pct },
                      { key: "l7",  label: t("tv.productivityL7")  || "LAST 7 DAYS",  p: productivity?.l7,  pct: l7Pct },
                    ].map((col) => {
                      const good = meetsTarget(col.pct);
                      const pctColor = col.pct == null ? "text-white" : good ? "text-green-400" : "text-red-400";
                      return (
                        <div key={col.key} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                          <div className="mb-3 rounded-md bg-primary/20 py-2 text-center text-lg font-black uppercase tracking-widest text-primary">
                            {col.label}
                          </div>
                          <div className="space-y-2">
                            <MiniStat label="# CNF OPEs"     value={fmtNum(col.p?.ope ?? null, 0)} />
                            <MiniStat label="Planned DLH"    value={fmtNum(col.p?.planned ?? null, 1)} suffix="h" />
                            <MiniStat label="Confirmed DLH"  value={fmtNum(col.p?.confirmed ?? null, 1)} suffix="h" />
                          </div>
                          <div className={`mt-4 rounded-xl border-2 ${good ? "border-green-400/60 bg-green-400/10" : col.pct != null ? "border-red-400/60 bg-red-400/10" : "border-white/10 bg-white/5"} p-3 text-center`}>
                            <div className="text-xs font-semibold uppercase tracking-widest text-white/60">Productivity</div>
                            <div className={`mt-1 text-4xl font-black tabular-nums ${pctColor}`}>
                              {fmtPct(col.pct)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </Slide>
        )}

        {slide === "toolbox" && (() => {
          const tb: any = toolbox as any;
          const noteType = (tb?.noteType || "safety") as "safety" | "visitor" | "event" | "reminder" | "other";
          const badgeCls: Record<string, string> = {
            safety: "bg-red-500/20 text-red-200 border-red-500/40",
            visitor: "bg-blue-500/20 text-blue-200 border-blue-500/40",
            event: "bg-amber-500/20 text-amber-200 border-amber-500/40",
            reminder: "bg-emerald-500/20 text-emerald-200 border-emerald-500/40",
            other: "bg-white/10 text-white/80 border-white/20",
          };
          const badgeLabel = t(`admin.toolboxType${noteType.charAt(0).toUpperCase() + noteType.slice(1)}`);
          return (
          <Slide title={t("tv.toolbox")}>
            {tb && (tb.imagePath || tb.title || tb.notes) ? (
              <div className={tb.imagePath ? "grid grid-cols-2 items-center gap-8" : "mx-auto max-w-4xl"}>
                {tb.imagePath && (
                  <div className="flex items-center justify-center">
                    <img
                      src={assetUrl(tb.imagePath)}
                      alt={tb.title || "Note of the week"}
                      className="max-h-[70vh] w-full rounded-2xl border border-white/10 object-contain"
                      data-testid="img-toolbox"
                    />
                  </div>
                )}
                <div>
                  <div className={`mb-3 inline-flex items-center rounded-full border px-4 py-1 text-sm font-bold uppercase tracking-widest ${badgeCls[noteType]}`} data-testid="badge-toolbox-type">
                    {badgeLabel}
                  </div>
                  {tb.presenter && (
                    <div className="mb-2 text-lg font-semibold uppercase tracking-widest text-primary" data-testid="text-toolbox-presenter">
                      {lang === "es" ? "Publicado por" : "Posted by"} {tb.presenter}
                    </div>
                  )}
                  {tb.weekOf && (
                    <div className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
                      {t("admin.toolboxWeekOf")} {tb.weekOf}
                    </div>
                  )}
                  {tb.title && <h2 className="text-5xl font-black leading-tight">{tb.title}</h2>}
                  {tb.notes && <p className="mt-6 whitespace-pre-wrap text-2xl leading-relaxed text-white/75">{tb.notes}</p>}
                  {noteType === "safety" && (
                    <div className="mt-8 rounded-lg border-l-4 border-primary bg-primary/10 px-5 py-3 text-lg font-semibold text-white/90" data-testid="text-toolbox-contact">
                      {lang === "es"
                        ? "¿Preguntas? Contacte a Frank Eneman."
                        : "Questions? Contact Frank Eneman."}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Empty text={t("tv.toolboxEmpty")} />
            )}
          </Slide>
          );
        })()}

        {/* SLIDE 7 — BIRTHDAYS (today only; slide is skipped from rotation when empty) */}
        {slide === "birthday" && bdayToday.length > 0 && (
          <BirthdaySlide people={bdayToday} lang={lang} t={t} />
        )}

        {/* HOLIDAY SLIDE — patriotic backdrop for July 4th, warm gold otherwise */}
        {slide === "holiday" && activeHoliday && (
          <HolidaySlide holiday={activeHoliday} lang={lang} t={t} />
        )}

        {/* OPEN SAFETY CONCERNS SLIDES — one page per CONCERNS_PER_SLIDE items */}
        {slide.startsWith("openConcerns:") && (() => {
          const pageIdx = parseInt(slide.split(":")[1], 10);
          const page = concernPages[pageIdx];
          if (!page || page.length === 0) return null;
          return (
            <OpenConcernsSlide
              page={page}
              pageIdx={pageIdx}
              totalPages={concernPages.length}
              totalConcerns={openList.length}
              lang={lang}
              t={t}
            />
          );
        })()}

        {/* SLIDE 8 — SAFETY */}
        {slide === "safety" && (
          <div data-testid="slide-safety">
            <div className="grid grid-cols-2 gap-10">
              {/* Top-left: QR */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                <h2 className="text-4xl font-black tracking-tight">{t("tv.safetyTitle")}</h2>
                <p className="mt-3 max-w-md text-lg font-semibold text-white/70">{t("tv.safetySubtitle")}</p>
                <div className="mt-6 rounded-2xl bg-white p-5">
                  <QRCodeSVG value={SAFETY_URL} size={320} level="M" data-testid="qr-safety" />
                </div>
                <p className="mt-4 text-sm uppercase tracking-widest text-white/45">{t("tv.safetyScan")}</p>
                <div className="mt-4 text-xl font-bold tabular-nums text-primary">shd.pplx.app/#/safety</div>
                <p className="mt-5 max-w-md text-sm italic text-white/50">{t("tv.safetyReviewedLine")}</p>
              </div>
              {/* Right: recent responses */}
              <div className="flex flex-col">
                <h2 className="mb-5 text-3xl font-black tracking-tight">{t("tv.safetyRecentResponses")}</h2>
                {recentResponded.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-xl leading-relaxed text-white/60">
                    {t("tv.safetyNoResponses")}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {recentResponded.map((c) => (
                      <div key={c.id} className="rounded-2xl border border-white/10 bg-white/5 p-6" data-testid={`response-${c.id}`}>
                        <p className="text-base italic text-white/50">"{c.message.length > 120 ? c.message.slice(0, 120) + "…" : c.message}"</p>
                        <p className="mt-3 text-xl font-semibold leading-relaxed">{c.response}</p>
                        <div className="mt-3 text-sm font-medium text-primary">
                          — {c.respondedBy || "Bill & Frank"}
                          {c.respondedAt && <span className="ml-2 text-white/40">{new Date(c.respondedAt).toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric" })}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(8px);} to { opacity: 1; transform: none; } }`}</style>
    </div>
  );
}

function CurrentStateColumn({ lang, delays, extra }: { lang: "en" | "es"; delays: any[]; extra: number }) {
  const labels = lang === "es"
    ? { header: "ESTADO ACTUAL", downFor: "PARADO POR", operator: "Operador", noComment: "Sin comentarios", more: "más" }
    : { header: "CURRENT STATE", downFor: "DOWN FOR", operator: "Operator", noComment: "No comment", more: "more" };
  // Lazy-translate: when this Spanish panel sees a delay whose English comment
  // has no cached translation, ask the backend to translate + cache it once.
  // Tracks in-flight ids so we don't hammer the endpoint on every re-render.
  const requestedRef = useRef<Set<number>>(new Set());
  useEffect(() => {
    if (lang !== "es") return;
    const toFetch = delays.filter((d) => {
      if (requestedRef.current.has(d.id)) return false;
      const needsDesc = d.description && !d.descriptionEs;
      const needsCA = d.correctiveActions && !d.correctiveActionsEs;
      return needsDesc || needsCA;
    });
    if (toFetch.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const d of toFetch) {
        if (cancelled) break;
        requestedRef.current.add(d.id);
        try {
          await apiRequest("POST", `/api/delays/${d.id}/translate`);
        } catch { /* leave requestedRef marked to avoid retry storms */ }
      }
      if (!cancelled) {
        queryClient.invalidateQueries({ queryKey: ["/api/delays"] });
      }
    })();
    return () => { cancelled = true; };
  }, [lang, delays]);
  return (
    <div>
      <div className="mb-4 text-sm font-bold uppercase tracking-widest text-white/40">{labels.header}</div>
      <div className="space-y-4">
        {delays.map((d) => {
          const reasonLabel = lang === "es" ? (d.reasonLabelEs || d.reasonLabelEn) : (d.reasonLabelEn || d.reasonLabelEs);
          return (
            <div key={d.id} className="rounded-2xl border-2 border-red-500/60 bg-red-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="h-3.5 w-3.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-base font-black uppercase tabular-nums text-red-300">{labels.downFor} {elapsed(d.dateDown, d.timeDown)}</span>
                </div>
                {reasonLabel && (
                  <span className="rounded-full border border-red-400/40 bg-red-500/20 px-3 py-1 text-sm font-semibold text-red-200">{reasonLabel}</span>
                )}
              </div>
              <div className="mt-2 text-2xl font-black leading-tight">{d.assetName}</div>
              {d.employeeName && <div className="mt-0.5 text-sm text-white/60">{labels.operator}: {d.employeeName}</div>}
              {d.description ? (
                <p className="mt-2 whitespace-pre-wrap break-words text-base leading-relaxed text-white/70">
                  {lang === "es" ? (d.descriptionEs || d.description) : d.description}
                </p>
              ) : (
                <p className="mt-2 text-base italic text-white/35">{labels.noComment}</p>
              )}
            </div>
          );
        })}
        {extra > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-lg font-semibold text-white/50">
            +{extra} {labels.more}
          </div>
        )}
      </div>
    </div>
  );
}

function Slide({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h1 className="mb-8 text-4xl font-black tracking-tight text-white">{title}</h1>
      {children}
    </div>
  );
}

function BigKpi({ label, value, tone }: { label: string; value: string; tone?: "primary" | "danger" | "green" }) {
  const color = tone === "primary" ? "text-primary" : tone === "danger" ? "text-red-400" : tone === "green" ? "text-green-400" : "text-white";
  return (
    <div className="flex min-w-0 flex-col justify-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
      <div className={`font-black leading-none tabular-nums ${color} text-[clamp(1.75rem,3vw,3.25rem)]`}>{value}</div>
      <div className="mt-4 text-xs font-semibold uppercase tracking-widest text-white/50 sm:text-sm">{label}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="flex h-64 items-center justify-center text-2xl font-bold text-green-400">{text}</div>;
}

function MiniStat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="flex items-baseline justify-between rounded-md border border-white/10 bg-black/20 px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-white/60">{label}</span>
      <span className="text-xl font-black tabular-nums text-white">
        {value}{suffix ? <span className="ml-0.5 text-sm text-white/60">{suffix}</span> : null}
      </span>
    </div>
  );
}

// Metallic live digital clock — brushed-steel look with cool blue LED glow
function MetalClock({ now }: { now: Date }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);
  // recompute fresh time each tick (ignores parent `now` staleness)
  const d = new Date();
  const chi = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).formatToParts(d);
  const hhRaw = chi.find((p) => p.type === "hour")?.value ?? "--";
  const hh = hhRaw.padStart(2, "0");
  const mm = chi.find((p) => p.type === "minute")?.value ?? "--";
  const ss = chi.find((p) => p.type === "second")?.value ?? "--";
  const ampm = chi.find((p) => p.type === "dayPeriod")?.value?.toUpperCase() ?? "";
  const blink = tick % 2 === 0;
  return (
    <div
      className="select-none rounded-lg border border-white/20 px-4 py-2 shadow-inner"
      style={{
        background:
          "linear-gradient(180deg, #2a3038 0%, #1a1f26 50%, #0e1216 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.4)",
      }}
      data-testid="metal-clock"
    >
      <div
        className="font-black tabular-nums tracking-wider"
        style={{
          fontSize: "1.75rem",
          lineHeight: 1,
          color: "#7dd3fc",
          textShadow:
            "0 0 8px rgba(125,211,252,0.6), 0 0 2px rgba(125,211,252,0.9)",
          fontFamily: "'Courier New', monospace",
        }}
      >
        {hh}
        <span style={{ opacity: blink ? 1 : 0.25 }}>:</span>
        {mm}
        <span style={{ opacity: blink ? 1 : 0.25 }}>:</span>
        {ss}
        <span style={{ marginLeft: "0.5rem", fontSize: "1.1rem", opacity: 0.85 }}>{ampm}</span>
      </div>
    </div>
  );
}

/* ==================================================================
 * HOLIDAY SLIDE
 * Rich themed backdrop, holiday name (bilingual), stay-safe message.
 * July 4 gets red/white/blue with animated stars; others get warm gold.
 * ================================================================== */
function HolidaySlide({ holiday, lang, t }: { holiday: { date: string; labelEn: string; labelEs: string }; lang: "en" | "es"; t: (k: string) => string }) {
  const [, m, d] = holiday.date.split("-").map((x) => parseInt(x, 10));
  const labelLc = holiday.labelEn.toLowerCase();
  // Match by holiday label text so “Observed” dates (e.g. July 3 for July 4) still
  // get the correct backdrop. Fall back to month/day for Christmas / New Year.
  const isJuly4 = labelLc.includes("independence") || (m === 7 && d === 4);
  const isMemorial = labelLc.includes("memorial");
  const isLabor = labelLc.includes("labor");
  const isChristmas = labelLc.includes("christmas") || (m === 12 && d === 25);
  const isNewYear = labelLc.includes("new year") || (m === 1 && d === 1);
  const isThanksgiving = labelLc.includes("thanksgiv");

  const patriotic = isJuly4 || isMemorial || isLabor;

  const bg = patriotic
    ? "radial-gradient(ellipse at top, #1e3a8a 0%, #0c1a3d 55%, #050b1d 100%)"
    : isChristmas
      ? "radial-gradient(ellipse at top, #7f1d1d 0%, #1a0808 60%, #0a0303 100%)"
      : isNewYear
        ? "radial-gradient(ellipse at center, #4c1d95 0%, #1e1032 60%, #05040d 100%)"
        : isThanksgiving
          ? "radial-gradient(ellipse at top, #7c2d12 0%, #2a1608 60%, #0f0904 100%)"
          : "radial-gradient(ellipse at top, #b45309 0%, #451a03 60%, #150800 100%)";

  const accent = patriotic ? "#fbbf24" : isChristmas ? "#fbbf24" : isNewYear ? "#fbbf24" : "#fbbf24";
  const label = lang === "es" ? holiday.labelEs : holiday.labelEn;
  const labelOther = lang === "es" ? holiday.labelEn : holiday.labelEs;

  return (
    <div data-testid="slide-holiday" className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden rounded-3xl" style={{ background: bg }}>
      {/* Patriotic stripes for July 4 / Memorial / Labor Day */}
      {patriotic && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6" style={{ background: "linear-gradient(90deg, #b91c1c 0%, #b91c1c 33%, #ffffff 33%, #ffffff 66%, #1e3a8a 66%, #1e3a8a 100%)", opacity: 0.85 }} />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6" style={{ background: "linear-gradient(90deg, #1e3a8a 0%, #1e3a8a 33%, #ffffff 33%, #ffffff 66%, #b91c1c 66%, #b91c1c 100%)", opacity: 0.85 }} />
          {/* Stars */}
          <div className="pointer-events-none absolute inset-0">
            {Array.from({ length: 28 }).map((_, i) => {
              const cx = (i * 37) % 100;
              const cy = ((i * 53) % 80) + 10;
              const size = 8 + ((i * 7) % 12);
              const delay = (i % 8) * 0.3;
              return (
                <div key={i} className="absolute" style={{ left: `${cx}%`, top: `${cy}%`, animation: `twinkle 2.5s ease-in-out ${delay}s infinite` }}>
                  <svg width={size} height={size} viewBox="0 0 24 24" fill="#fbbf24" opacity="0.85">
                    <path d="M12 2l2.9 6.9L22 10l-5.5 4.8L18 22l-6-3.5L6 22l1.5-7.2L2 10l7.1-1.1L12 2z" />
                  </svg>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Snow for Christmas */}
      {isChristmas && (
        <div className="pointer-events-none absolute inset-0">
          {Array.from({ length: 40 }).map((_, i) => {
            const left = (i * 29) % 100;
            const delay = (i % 12) * 0.5;
            const dur = 6 + (i % 5);
            const size = 6 + ((i * 3) % 8);
            return (
              <div key={i} className="absolute rounded-full bg-white" style={{ left: `${left}%`, top: "-10px", width: `${size}px`, height: `${size}px`, opacity: 0.7, animation: `snowfall ${dur}s linear ${delay}s infinite` }} />
            );
          })}
        </div>
      )}

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="text-sm font-black uppercase tracking-[0.4em]" style={{ color: accent }}>{t("tv.holidayTitle")}</div>
        <div className="mt-4 text-8xl font-black leading-none text-white drop-shadow-2xl">{label}</div>
        <div className="mt-3 text-2xl font-semibold text-white/80">{labelOther}</div>
        <div className="mt-2 text-lg tabular-nums text-white/60">
          {new Date(holiday.date + "T12:00:00").toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </div>
        <div className="mt-10 max-w-3xl text-3xl font-bold leading-tight text-white">{t("tv.holidayStaySafe")}</div>
        <div className="mt-6 text-lg italic text-white/60">{t("tv.holidayFromTeam")}</div>
      </div>

      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.35; transform: scale(0.9); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes snowfall { 0% { transform: translateY(0); } 100% { transform: translateY(80vh); } }
      `}</style>
    </div>
  );
}

/* ==================================================================
 * BIRTHDAY SLIDE
 * Floating balloons, a birthday cake with animated candles, confetti
 * pieces falling gently. Warm gold + pink accents.
 * ================================================================== */
function BirthdaySlide({ people, lang, t }: { people: { id: number; name: string; photoPath: string }[]; lang: "en" | "es"; t: (k: string, opts?: any) => string }) {
  // Deterministic decorations — seeded values so re-renders are stable during a slide’s life.
  const balloonColors = ["#FF3D8A", "#FFB800", "#4FC3F7", "#8E5CFF", "#FF7A45", "#3DD68C"];
  const balloons = Array.from({ length: 14 }).map((_, i) => {
    const left = (i * 7.3 + 3) % 100;
    const dur = 6 + (i % 4);
    const delay = (i * 0.7) % 6;
    const size = 44 + ((i * 11) % 28);
    const color = balloonColors[i % balloonColors.length];
    return { left, dur, delay, size, color, id: i };
  });
  const confetti = Array.from({ length: 40 }).map((_, i) => {
    const left = (i * 3.1 + 1) % 100;
    const dur = 5 + ((i * 1.3) % 6);
    const delay = (i * 0.4) % 8;
    const size = 6 + ((i * 5) % 8);
    const rot = (i * 37) % 360;
    const color = balloonColors[(i + 2) % balloonColors.length];
    return { left, dur, delay, size, color, rot, id: i };
  });

  return (
    <div data-testid="slide-birthday" className="relative flex flex-col items-center justify-center overflow-hidden" style={{ minHeight: "70vh" }}>
      {/* soft warm gradient wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 60% at 50% 40%, rgba(255, 184, 0, 0.14) 0%, rgba(255, 61, 138, 0.08) 45%, transparent 75%)",
        }}
      />

      {/* Floating balloons */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {balloons.map((b) => (
          <div
            key={b.id}
            className="absolute"
            style={{
              left: `${b.left}%`,
              bottom: "-120px",
              width: `${b.size}px`,
              animation: `bdayFloat ${b.dur}s ease-in-out ${b.delay}s infinite`,
              opacity: 0.85,
            }}
          >
            {/* balloon body */}
            <div
              style={{
                width: `${b.size}px`,
                height: `${b.size * 1.2}px`,
                background: `radial-gradient(circle at 32% 30%, rgba(255,255,255,0.55), ${b.color} 55%, ${b.color} 100%)`,
                borderRadius: "50% 50% 48% 48% / 55% 55% 45% 45%",
                boxShadow: `0 0 24px -6px ${b.color}80`,
              }}
            />
            {/* balloon knot */}
            <div
              style={{
                width: 0,
                height: 0,
                margin: "0 auto",
                borderLeft: `${b.size * 0.08}px solid transparent`,
                borderRight: `${b.size * 0.08}px solid transparent`,
                borderTop: `${b.size * 0.12}px solid ${b.color}`,
              }}
            />
            {/* string */}
            <div
              style={{
                width: 1,
                height: `${b.size * 1.6}px`,
                background: "rgba(255,255,255,0.35)",
                margin: "0 auto",
              }}
            />
          </div>
        ))}
      </div>

      {/* Falling confetti */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {confetti.map((c) => (
          <div
            key={c.id}
            className="absolute"
            style={{
              left: `${c.left}%`,
              top: "-20px",
              width: `${c.size}px`,
              height: `${c.size * 0.4}px`,
              background: c.color,
              transform: `rotate(${c.rot}deg)`,
              animation: `bdayConfetti ${c.dur}s linear ${c.delay}s infinite`,
              opacity: 0.8,
              borderRadius: 1,
            }}
          />
        ))}
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="text-sm font-black uppercase tracking-[0.3em] text-primary" data-testid="banner-birthday-today">
          {t("tv.birthdayToday")}
        </div>
        <div
          className="mt-4 text-7xl font-black leading-none text-white"
          style={{
            background: "linear-gradient(90deg, #FFB800 0%, #FF3D8A 55%, #8E5CFF 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 2px 12px rgba(255, 61, 138, 0.35))",
          }}
        >
          {lang === "es" ? "¡Feliz Cumpleaños!" : "Happy Birthday!"}
        </div>

        {/* Cake */}
        <div className="mt-8" aria-hidden>
          <svg width="180" height="160" viewBox="0 0 180 160" fill="none">
            {/* candles */}
            <g>
              <rect x="64" y="22" width="6" height="22" fill="#FFB800" rx="1" />
              <rect x="87" y="14" width="6" height="30" fill="#FF3D8A" rx="1" />
              <rect x="110" y="22" width="6" height="22" fill="#4FC3F7" rx="1" />
              {/* flames */}
              <ellipse cx="67" cy="18" rx="4" ry="7" fill="#FFC93C" style={{ transformOrigin: "67px 22px", animation: "bdayFlame 0.6s ease-in-out infinite alternate" }} />
              <ellipse cx="90" cy="10" rx="4" ry="7" fill="#FF9A3C" style={{ transformOrigin: "90px 14px", animation: "bdayFlame 0.55s ease-in-out 0.1s infinite alternate" }} />
              <ellipse cx="113" cy="18" rx="4" ry="7" fill="#FFC93C" style={{ transformOrigin: "113px 22px", animation: "bdayFlame 0.65s ease-in-out 0.2s infinite alternate" }} />
            </g>
            {/* top tier */}
            <rect x="50" y="46" width="80" height="30" rx="3" fill="#FFD9E8" />
            <path d="M50 54 Q60 46 70 54 T90 54 T110 54 T130 54 L130 46 L50 46 Z" fill="#FF3D8A" />
            {/* middle tier */}
            <rect x="36" y="78" width="108" height="36" rx="3" fill="#FFECC7" />
            <path d="M36 88 Q48 78 60 88 T84 88 T108 88 T132 88 T144 88 L144 78 L36 78 Z" fill="#FFB800" />
            {/* bottom plate */}
            <ellipse cx="90" cy="120" rx="70" ry="6" fill="#8E5CFF" opacity="0.4" />
            {/* sprinkles */}
            <circle cx="60" cy="62" r="1.5" fill="#8E5CFF" />
            <circle cx="80" cy="66" r="1.5" fill="#3DD68C" />
            <circle cx="100" cy="60" r="1.5" fill="#4FC3F7" />
            <circle cx="120" cy="64" r="1.5" fill="#FF7A45" />
            <circle cx="50" cy="98" r="1.5" fill="#FF3D8A" />
            <circle cx="70" cy="102" r="1.5" fill="#FFB800" />
            <circle cx="90" cy="96" r="1.5" fill="#3DD68C" />
            <circle cx="110" cy="100" r="1.5" fill="#4FC3F7" />
            <circle cx="130" cy="98" r="1.5" fill="#8E5CFF" />
          </svg>
        </div>

        {/* Honorees */}
        <div className={`mt-6 flex items-start justify-center ${people.length === 1 ? "gap-0" : people.length === 2 ? "gap-16" : "gap-10"}`}>
          {people.map((b) => (
            <div key={b.id} className="flex flex-col items-center text-center" data-testid={`birthday-today-${b.id}`}>
              <div
                className="flex h-48 w-48 items-center justify-center overflow-hidden rounded-full border-4 bg-white/5"
                style={{ borderColor: "#FFB800", boxShadow: "0 0 60px -10px rgba(255, 184, 0, 0.6)" }}
              >
                {b.photoPath ? (
                  <img src={assetUrl(b.photoPath)} alt={b.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-6xl font-black text-white/40">
                    {b.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
                  </span>
                )}
              </div>
              <div className="mt-5 text-4xl font-black leading-tight text-white">{b.name}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-xl text-white/60">
          {lang === "es" ? "El equipo de ANDRITZ te desea lo mejor" : "The ANDRITZ team wishes you the best"}
        </div>
      </div>

      <style>{`
        @keyframes bdayFloat {
          0%   { transform: translateY(0) translateX(0) rotate(-2deg); }
          50%  { transform: translateY(-88vh) translateX(20px) rotate(2deg); }
          100% { transform: translateY(-100vh) translateX(-10px) rotate(-3deg); opacity: 0; }
        }
        @keyframes bdayConfetti {
          0%   { transform: translateY(-10vh) rotate(0deg); }
          100% { transform: translateY(90vh) rotate(720deg); }
        }
        @keyframes bdayFlame {
          0%   { transform: scaleY(1) scaleX(1); opacity: 1; }
          100% { transform: scaleY(1.15) scaleX(0.9); opacity: 0.85; }
        }
      `}</style>
    </div>
  );
}

/* ==================================================================
 * OPEN SAFETY CONCERNS SLIDE
 * Shows up to CONCERNS_PER_SLIDE open concerns waiting for response.
 * ================================================================== */
function OpenConcernsSlide({ page, pageIdx, totalPages, totalConcerns, lang, t }: { page: { id: number; message: string; submitterName: string; createdAt: string }[]; pageIdx: number; totalPages: number; totalConcerns: number; lang: "en" | "es"; t: (k: string, opts?: any) => string }) {
  const locale = lang === "es" ? "es-MX" : "en-US";
  return (
    <div data-testid={`slide-open-concerns-${pageIdx}`} className="min-h-[70vh]">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.4em] text-amber-400">{t("tv.openConcernsTitle")}</div>
          <div className="mt-1 text-2xl font-bold text-white">{totalConcerns} {totalConcerns === 1 ? (lang === "es" ? "inquietud" : "concern") : (lang === "es" ? "inquietudes" : "concerns")}</div>
          <div className="text-sm text-white/50">{t("tv.openConcernsSubtitle")}</div>
        </div>
        {totalPages > 1 && (
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold tabular-nums text-white/70" data-testid="text-concerns-pagination">
            {t("tv.openConcernsPage", { page: pageIdx + 1, total: totalPages })}
          </div>
        )}
      </div>
      <div className="space-y-4">
        {page.map((c) => {
          const created = new Date(c.createdAt);
          const dateLabel = isNaN(created.getTime())
            ? c.createdAt
            : created.toLocaleString(locale, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
          const who = (c.submitterName || "").trim() || t("tv.openConcernsAnon");
          return (
            <div key={c.id} className="relative overflow-hidden rounded-2xl border-2 border-amber-400/40 bg-amber-500/5 p-6" data-testid={`open-concern-${c.id}`}>
              <div className="absolute left-0 top-0 h-full w-1.5 bg-amber-400" />
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="whitespace-pre-wrap break-words text-2xl font-semibold leading-snug text-white">"{c.message}"</p>
                  <div className="mt-3 flex items-center gap-4 text-sm text-white/50">
                    <span className="font-medium">{t("tv.openConcernsFrom")}: <span className="text-white/80">{who}</span></span>
                    <span className="tabular-nums">{dateLabel}</span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full border border-amber-400/50 bg-amber-400/10 px-3 py-1 text-xs font-black uppercase tracking-widest text-amber-300">
                  {lang === "es" ? "PENDIENTE" : "OPEN"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-6 text-center text-sm italic text-white/40">
        {lang === "es"
          ? "Bill Donovan y Frank Eneman revisarán cada inquietud."
          : "Bill Donovan and Frank Eneman will review every concern."}
      </div>
    </div>
  );
}
