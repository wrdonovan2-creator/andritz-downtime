import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import i18n from "@/i18n";
import { apiRequest } from "./queryClient";
import type { Lang } from "./api";

interface LangState {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
}

const LangContext = createContext<LangState | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  // Default to English.
  const [lang, setLangState] = useState<Lang>("en");

  // On mount, read the server session preference so the choice persists
  // across reloads (we cannot use localStorage in the sandboxed iframe).
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest("GET", "/api/prefs/lang");
        const data = await res.json();
        const l: Lang = data?.lang === "es" ? "es" : "en";
        setLangState(l);
        i18n.changeLanguage(l);
      } catch {
        i18n.changeLanguage("en");
      }
    })();
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    i18n.changeLanguage(l);
    // Persist server-side (fire and forget).
    apiRequest("POST", "/api/prefs/lang", { lang: l }).catch(() => {});
  }

  function toggle() {
    setLang(lang === "es" ? "en" : "es");
  }

  return (
    <LangContext.Provider value={{ lang, setLang, toggle }}>{children}</LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

// Small EN|ES pill toggle used in the header and login.
export function LangToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLang();
  return (
    <div
      className={`inline-flex items-center overflow-hidden rounded-full border border-border text-xs font-bold ${className || ""}`}
      data-testid="toggle-lang"
    >
      <button
        type="button"
        data-testid="button-lang-en"
        onClick={() => setLang("en")}
        className={`px-2.5 py-1 ${lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
      >
        EN
      </button>
      <button
        type="button"
        data-testid="button-lang-es"
        onClick={() => setLang("es")}
        className={`px-2.5 py-1 ${lang === "es" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
      >
        ES
      </button>
    </div>
  );
}
