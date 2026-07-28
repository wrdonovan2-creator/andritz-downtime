import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { LangToggle } from "@/lib/lang";
import { Logo } from "@/components/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Role } from "@/lib/api";
import { Sun, Moon, Tv, HardHat, ClipboardCheck, ShieldCheck, ArrowLeft } from "lucide-react";

type Choice = Role | "tv";

const CARDS: { key: Choice; icon: typeof Tv; testid: string }[] = [
  { key: "tv", icon: Tv, testid: "role-tv" },
  { key: "operator", icon: HardHat, testid: "role-operator" },
  { key: "production_manager", icon: ClipboardCheck, testid: "role-prod" },
  { key: "plant_manager", icon: ShieldCheck, testid: "role-plant" },
];

export default function Login() {
  const { t } = useTranslation();
  const { login, role } = useAuth();
  const { theme, toggle } = useTheme();
  const [, navigate] = useLocation();

  // If a session already exists (e.g. after a successful login or a reload
  // while signed in), leave the login screen for the dashboard.
  useEffect(() => {
    if (role) navigate("/");
  }, [role, navigate]);
  const [selected, setSelected] = useState<Role | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(choice: Choice) {
    if (choice === "tv") {
      navigate("/tv");
      return;
    }
    setSelected(choice);
    setPassword("");
    setError("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setBusy(true);
    try {
      await login(password, selected);
      navigate("/");
      // Belt-and-suspenders: ensure the hash actually changes even if the
      // router state update is swallowed by a concurrent auth refresh.
      if (window.location.hash.includes("login")) window.location.hash = "#/";
    } catch {
      setError(t("login.incorrect"));
    } finally {
      setBusy(false);
    }
  }

  const roleLabel = (r: Role) =>
    r === "operator" ? t("login.operator") : r === "production_manager" ? t("login.prodOffice") : t("login.plantOffice");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="fixed right-4 top-4 flex items-center gap-2">
        <LangToggle />
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          data-testid="button-theme-toggle-login"
          className="rounded-md p-2 text-muted-foreground hover-elevate"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="w-full max-w-lg">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 text-primary"><Logo className="h-14 w-14" /></span>
          <h1 className="text-xl font-bold tracking-tight">{t("app.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("app.company")}</p>
        </div>

        {!selected ? (
          <div>
            <p className="mb-4 text-center text-sm font-medium text-muted-foreground">{t("login.heading")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CARDS.map(({ key, icon: Icon, testid }) => {
                const isTv = key === "tv";
                const label =
                  key === "tv" ? t("login.breakRoomTv")
                    : key === "operator" ? t("login.operator")
                    : key === "production_manager" ? t("login.prodOffice")
                    : t("login.plantOffice");
                return (
                  <button
                    key={key}
                    type="button"
                    data-testid={testid}
                    onClick={() => pick(key)}
                    className={`flex min-h-[112px] flex-col items-start justify-between rounded-xl border p-5 text-left hover-elevate active-elevate-2 ${
                      isTv ? "border-primary/50 bg-primary/5" : "border-card-border bg-card"
                    }`}
                  >
                    <Icon className={`h-8 w-8 ${isTv ? "text-primary" : "text-foreground"}`} />
                    <div>
                      <div className="text-base font-bold leading-tight">{label}</div>
                      {isTv && <div className="mt-0.5 text-xs text-muted-foreground">{t("login.breakRoomHint")}</div>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-card-border bg-card p-6 shadow-lg">
            <button
              type="button"
              onClick={() => setSelected(null)}
              data-testid="button-back"
              className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover-elevate rounded-md px-2 py-1 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" /> {t("login.cancel")}
            </button>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  {t("login.enterPasswordFor")} <span className="font-bold text-foreground">{roleLabel(selected)}</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  inputMode={selected === "operator" ? "numeric" : "text"}
                  data-testid="input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.password")}
                  autoFocus
                  className="h-12 text-base"
                />
              </div>

              {error && (
                <p data-testid="text-login-error" className="rounded-md bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive">
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={busy || !password}
                data-testid="button-login"
                className="h-12 w-full text-base font-semibold"
              >
                {busy ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
