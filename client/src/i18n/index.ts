import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import es from "./es.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: "en", // default to English
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;

export type Lang = "en" | "es";

// Locale-aware currency (USD, formatted per locale — es-MX vs en-US).
export function fmtMoney(n: number | null | undefined, lang: Lang): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const locale = lang === "es" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(n);
}

export function fmtHours(n: number | null | undefined, lang: Lang): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  const locale = lang === "es" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
}

export function fmtInt(n: number | null | undefined, lang: Lang): string {
  if (n === null || n === undefined || isNaN(n)) return "0";
  const locale = lang === "es" ? "es-MX" : "en-US";
  return new Intl.NumberFormat(locale).format(n);
}

// Locale-aware date. dateStr = YYYY-MM-DD (optionally with time HH:MM).
export function fmtDate(dateStr: string | null | undefined, lang: Lang, withTime = false): string {
  if (!dateStr) return "—";
  const iso = dateStr.length <= 10 ? `${dateStr}T00:00:00` : dateStr.replace(" ", "T");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return dateStr;
  const locale = lang === "es" ? "es-MX" : "en-US";
  const opts: Intl.DateTimeFormatOptions = withTime
    ? { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
    : { year: "numeric", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(locale, opts).format(d);
}

// Reason label in the current language.
export function reasonLabel(r: { reasonLabelEn?: string; reasonLabelEs?: string; labelEn?: string; labelEs?: string } | null, lang: Lang): string {
  if (!r) return "—";
  const en = (r as any).labelEn ?? (r as any).reasonLabelEn ?? "";
  const es = (r as any).labelEs ?? (r as any).reasonLabelEs ?? "";
  return lang === "es" ? es || en : en || es;
}
