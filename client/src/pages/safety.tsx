import { useState } from "react";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { LangToggle, useLang } from "@/lib/lang";
import { useTheme } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import andritzLogo from "@assets/andritz-logo.png";
import { Sun, Moon, ShieldCheck, CheckCircle2 } from "lucide-react";
// NOTE: Safety page is a PUBLIC form (no login required). It is receive-only
// for distress broadcasts — no REQUEST HELP button here per Bill's rule that
// only signed-in operators/managers may activate distress.


const MIN = 10;
const MAX = 1000;

export default function Safety() {
  const { t } = useTranslation();
  const { lang } = useLang();
  const { theme, toggle } = useTheme();

  const [concernType, setConcernType] = useState<"safety" | "operations" | "quality" | "other">("safety");
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  // Bilingual headings shown side-by-side regardless of the toggle so
  // both English- and Spanish-speaking crew read comfortably.
  const otherLang = lang === "en" ? "es" : "en";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const msg = message.trim();
    if (msg.length < MIN) {
      setError(t("safety.minChars"));
      return;
    }
    setError("");
    setBusy(true);
    try {
      await apiRequest("POST", "/api/safety/concerns", {
        concernType,
        message: msg,
        submitterName: name.trim(),
        submitterContact: contact.trim(),
      });
      setDone(true);
    } catch {
      setError(t("toast.error"));
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setConcernType("safety");
    setMessage("");
    setName("");
    setContact("");
    setError("");
    setDone(false);
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="fixed right-4 top-4 z-10 flex items-center gap-2">
        <LangToggle />
        <button
          onClick={toggle}
          aria-label="Toggle theme"
          data-testid="button-theme-toggle-safety"
          className="rounded-md p-2 text-muted-foreground hover-elevate"
        >
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>

      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src={andritzLogo} alt="ANDRITZ" className="mb-5 h-10 w-auto" />
          <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-8 w-8" />
          </span>
          <h1 className="text-xl font-bold tracking-tight" data-testid="text-safety-title">
            {t("safety.pageTitle")}
          </h1>
          <p className="text-sm font-semibold text-muted-foreground">{t("safety.pageTitleEs")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("app.company")}</p>
        </div>

        {done ? (
          <div
            className="rounded-xl border border-card-border bg-card p-8 text-center shadow-lg"
            data-testid="panel-safety-success"
          >
            <span className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CheckCircle2 className="h-10 w-10" />
            </span>
            <h2 className="text-lg font-bold">{t("safety.success")}</h2>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">Gracias — te escuchamos.</p>
            <p className="mt-4 text-sm text-muted-foreground">{t("safety.successBody")}</p>
            <Button
              variant="outline"
              className="mt-6 h-11 w-full font-semibold"
              onClick={reset}
              data-testid="button-submit-another"
            >
              {t("safety.another")}
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-card-border bg-card p-6 shadow-lg">
            <p className="mb-5 text-sm text-muted-foreground" data-testid="text-safety-desc">
              {t("safety.description")}
            </p>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="concernType" className="font-semibold">
                  {t("safety.typeLabel")}
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <select
                  id="concernType"
                  data-testid="select-concern-type"
                  value={concernType}
                  onChange={(e) => setConcernType(e.target.value as any)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-base font-medium"
                >
                  <option value="safety">{t("safety.typeSafety")}</option>
                  <option value="operations">{t("safety.typeOperations")}</option>
                  <option value="quality">{t("safety.typeQuality")}</option>
                  <option value="other">{t("safety.typeOther")}</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="msg" className="font-semibold">
                  {t("safety.message", { lng: lang })}
                  <span className="ml-1 text-destructive">*</span>
                </Label>
                <Textarea
                  id="msg"
                  data-testid="input-safety-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, MAX))}
                  placeholder={t("safety.messagePlaceholder")}
                  rows={5}
                  autoFocus
                  className="resize-none text-base"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("safety.anonymousOk")}</span>
                  <span data-testid="text-char-count" className="tabular-nums">
                    {message.trim().length}/{MAX}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t("safety.name")}</Label>
                <Input
                  id="name"
                  data-testid="input-safety-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("safety.namePlaceholder")}
                  className="h-11 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact">{t("safety.contact")}</Label>
                <Input
                  id="contact"
                  data-testid="input-safety-contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder={t("safety.contactPlaceholder")}
                  className="h-11 text-base"
                />
              </div>

              {error && (
                <p
                  data-testid="text-safety-error"
                  className="rounded-md bg-destructive/15 px-3 py-2 text-sm font-medium text-destructive"
                >
                  {error}
                </p>
              )}

              <Button
                type="submit"
                disabled={busy || message.trim().length < MIN}
                data-testid="button-safety-submit"
                className="h-12 w-full text-base font-semibold"
              >
                {busy ? t("safety.submitting") : t("safety.submit")}
              </Button>
            </form>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          {otherLang === "es" ? "Revisado por el Equipo de Seguridad — reunión mensual" : "Reviewed by the Safety Team — monthly safety meeting"}
        </p>
      </div>
    </div>
  );
}
