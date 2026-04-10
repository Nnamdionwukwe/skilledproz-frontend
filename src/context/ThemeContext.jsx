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

// ── The one function that controls Google Translate ───────────────────────────
// Setting /en/en = "translate English to English" = GT shows original content.
// This is MORE reliable than deleting the cookie because setting always works.
function setGTCookie(langCode) {
  const value = !langCode || langCode === "en" ? "/en/en" : `/en/${langCode}`;
  const domains = ["", `.${location.hostname}`, location.hostname];
  domains.forEach((domain) => {
    const d = domain ? `; domain=${domain}` : "";
    document.cookie = `googtrans=${value}; path=/${d}`;
  });
}

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const bootDone = useRef(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // ── Theme ─────────────────────────────────────────────────────────────────
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

  // ── On mount: make sure cookie matches stored preference ──────────────────
  useEffect(() => {
    if (bootDone.current) return;
    bootDone.current = true;
    const saved = localStorage.getItem("sp_lang") || "en";
    setGTCookie(saved);
  }, []);

  // ── Sync from auth on login ───────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    if (user.theme) {
      setTheme(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    if (user.language && !localStorage.getItem("sp_lang")) {
      localStorage.setItem("sp_lang", user.language);
      setLanguage(user.language);
    }
  }, [user?.id]);

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

  // ── changeLanguage: set cookie → reload. That's it. ──────────────────────
  const changeLanguage = useCallback(
    (lang) => {
      // Save preference
      localStorage.setItem("sp_lang", lang);
      setLanguage(lang);

      // Set GT cookie (/en/en = English, /en/fr = French, etc.)
      setGTCookie(lang);

      // Fire-and-forget DB save
      api
        .patch("/settings/profile", { language: lang })
        .then(() => updateUser?.({ language: lang }))
        .catch(() => {});

      // Reload — GT reads cookie fresh on every page load
      window.location.replace(window.location.pathname);
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
