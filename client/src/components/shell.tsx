import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard, ClipboardList, CalendarDays, PieChart,
  SignalHigh, Settings, LogOut, Sun, Moon, Package, BarChart3, Gauge,
} from "lucide-react";
import { useAuth, isManager } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { LangToggle } from "@/lib/lang";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RequestHelpButton } from "@/components/request-help-button";

export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label="Downtime Tracker logo"
    >
      {/* gauge / dial mark */}
      <circle cx="16" cy="16" r="12" strokeWidth={2} className="opacity-30" />
      <path d="M16 16 L16 7" />
      <path d="M16 16 L23 20" />
      <circle cx="16" cy="16" r="2.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function StatusPill({ status, className }: { status: "UP" | "DOWN"; className?: string }) {
  const { t } = useTranslation();
  const up = status === "UP";
  return (
    <span
      data-testid={`status-${status.toLowerCase()}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide",
        up
          ? "bg-green-600/15 text-green-500 ring-1 ring-green-600/40"
          : "bg-red-600/15 text-red-500 ring-1 ring-red-600/40",
        className
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", up ? "bg-green-500" : "bg-red-500 animate-pulse")} />
      {up ? t("status.up") : t("status.down")}
    </span>
  );
}

const NAV = [
  { href: "/", key: "dashboard", icon: LayoutDashboard },
  { href: "/log", key: "log", icon: ClipboardList },
  { href: "/weekly", key: "weekly", icon: CalendarDays },
  { href: "/reason", key: "reason", icon: PieChart },
  { href: "/status", key: "status", icon: SignalHigh },
  { href: "/production", key: "production", icon: Package },
  { href: "/otd", key: "otd", icon: BarChart3 },
  { href: "/productivity", key: "productivity", icon: Gauge },
];

export function Shell({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [location] = useLocation();
  const { role, logout } = useAuth();
  const { theme, toggle } = useTheme();

  const nav = [...NAV];
  if (isManager(role)) nav.push({ href: "/admin", key: "admin", icon: Settings });

  const roleLabel =
    role === "plant_manager" ? t("roles.plantShort")
      : role === "production_manager" ? t("roles.prodShort")
      : t("roles.operatorShort");

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const gridCols =
    nav.length >= 8 ? "grid-cols-8" :
    nav.length === 7 ? "grid-cols-7" :
    nav.length === 6 ? "grid-cols-6" : "grid-cols-5";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar md:flex">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <span className="text-primary"><Logo className="h-8 w-8" /></span>
          <div className="leading-tight">
            <div className="text-base font-bold">{t("app.subtitle")}</div>
            <div className="text-xs text-muted-foreground">{t("app.company")}</div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`nav-${item.key}`}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium hover-elevate",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary/50"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-2 border-t border-sidebar-border p-3">
          <div className="flex items-center justify-between rounded-md px-3 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground" data-testid="text-role">
              {roleLabel}
            </span>
            <div className="flex items-center gap-1">
              <LangToggle />
              <button
                onClick={toggle}
                data-testid="button-theme-toggle"
                aria-label="Toggle theme"
                className="rounded-md p-1.5 text-muted-foreground hover-elevate"
              >
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={() => logout()}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" /> {t("nav.logout")}
          </Button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-primary"><Logo className="h-7 w-7" /></span>
          <span className="text-base font-bold">{t("app.subtitle")}</span>
        </div>
        <div className="flex items-center gap-1">
          <LangToggle />
          <button onClick={toggle} data-testid="button-theme-toggle-mobile" aria-label="Toggle theme" className="rounded-md p-2 text-muted-foreground hover-elevate">
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button onClick={() => logout()} data-testid="button-logout-mobile" aria-label="Sign out" className="rounded-md p-2 text-muted-foreground hover-elevate">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="pb-32 md:ml-64 md:pb-0">
        <div className="mx-auto max-w-7xl p-4 sm:p-6">{children}</div>
      </main>

      {/* Emergency Request Help button — fixed, floats above content on every logged-in page. */}
      <RequestHelpButton />

      {/* Mobile bottom nav — horizontally scrollable so 6-8 items don't get squished */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-sidebar md:hidden">
        <div className="flex overflow-x-auto scrollbar-none">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-testid={`bottomnav-${item.key}`}
                className={cn(
                  "flex min-h-[60px] min-w-[72px] flex-1 shrink-0 flex-col items-center justify-center gap-0.5 px-2 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="whitespace-nowrap leading-none">{t(`nav.${item.key}`)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
