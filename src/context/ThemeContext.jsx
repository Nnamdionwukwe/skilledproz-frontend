import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

const ThemeContext = createContext(null);

const COOKIE_PATHS = ["/"];
const COOKIE_DOMAINS = [
  "",
  `domain=.${location.hostname}`,
  `domain=${location.hostname}`,
];

function writeGTCookie(langCode) {
  // Wipe all variants first
  COOKIE_PATHS.forEach((path) => {
    COOKIE_DOMAINS.forEach((domain) => {
      const base = `googtrans=; path=${path}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
      document.cookie = domain ? `${base}; ${domain}` : base;
    });
  });

  if (langCode && langCode !== "en") {
    COOKIE_PATHS.forEach((path) => {
      COOKIE_DOMAINS.forEach((domain) => {
        const base = `googtrans=/en/${langCode}; path=${path}`;
        document.cookie = domain ? `${base}; ${domain}` : base;
      });
    });
  }
}

function hardReload() {
  // Replace — not push — so back button doesn't re-translate
  window.location.replace(window.location.href.split("?")[0]);
}

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const bootDone = useRef(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );

  // Language is always read from localStorage — the single source of truth
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // ── Theme → data-theme attribute ─────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const resolved =
        theme === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : theme;
      root.setAttribute("data-theme", resolved);
    };
    apply();
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  // ── On first mount: apply saved language ─────────────────────────────────
  // We DON'T reload here — the cookie was already set the last time the user
  // changed the language, so GT picks it up automatically on page load.
  useEffect(() => {
    if (bootDone.current) return;
    bootDone.current = true;
    // Just make sure the cookie matches the stored preference
    const saved = localStorage.getItem("sp_lang") || "en";
    writeGTCookie(saved); // harmless no-op if already correct
  }, []);

  // ── Sync from auth store on login ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    if (user.theme) {
      setTheme(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    // Only sync language if user has one set and it differs from current
    if (user.language) {
      const stored = localStorage.getItem("sp_lang");
      if (!stored) {
        localStorage.setItem("sp_lang", user.language);
        setLanguage(user.language);
      }
    }
  }, [user?.id]);

  // ── changeTheme ───────────────────────────────────────────────────────────
  const changeTheme = useCallback(
    async (t) => {
      setTheme(t);
      localStorage.setItem("sp_theme", t);
      try {
        await api.patch("/settings/profile", { theme: t });
        updateUser?.({ theme: t });
      } catch {}
    },
    [updateUser],
  );

  // ── changeLanguage ────────────────────────────────────────────────────────
  // This is the ENTIRE language implementation. Cookie + reload. Nothing else.
  const changeLanguage = useCallback(
    async (lang) => {
      // 1. Persist to DB first (don't await — we're about to reload anyway)
      api
        .patch("/settings/profile", { language: lang })
        .then(() => updateUser?.({ language: lang }))
        .catch(() => {});

      // 2. Save to localStorage so we know what language to show after reload
      localStorage.setItem("sp_lang", lang);
      setLanguage(lang);

      // 3. Write / clear the googtrans cookie
      writeGTCookie(lang);

      // 4. Hard reload — GT reads the cookie on page load and translates/untranslates
      hardReload();
    },
    [updateUser],
  );

  return (
    <ThemeContext.Provider
      value={{ theme, language, changeTheme, changeLanguage }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
