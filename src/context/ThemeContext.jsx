import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // ── Apply theme to <html data-theme=""> ──────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const resolved =
      theme === "system"
        ? window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light"
        : theme;
    root.setAttribute("data-theme", resolved);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => {
        root.setAttribute("data-theme", mq.matches ? "dark" : "light");
      };
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // ── Apply language — sets html lang + triggers Google Translate if available ─
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("sp_lang", language);

    // Google Translate auto-detection: set googtrans cookie so GT picks it up
    // This works when GT script is embedded. Without GT, html lang is still set.
    if (language !== "en") {
      document.cookie = `googtrans=/en/${language}; path=/`;
      document.cookie = `googtrans=/en/${language}; path=/; domain=.${window.location.hostname}`;
    } else {
      // Remove cookie to go back to English
      document.cookie =
        "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }

    // Dispatch custom event so components can react to language change
    window.dispatchEvent(
      new CustomEvent("sp:langchange", { detail: { language } }),
    );
  }, [language]);

  const changeTheme = useCallback(
    async (t) => {
      setTheme(t);
      localStorage.setItem("sp_theme", t);
      if (user) {
        try {
          await api.patch("/settings/profile", { theme: t });
          updateUser?.({ theme: t });
        } catch {}
      }
    },
    [user, updateUser],
  );

  const changeLanguage = useCallback(
    async (lang) => {
      setLanguage(lang);
      localStorage.setItem("sp_lang", lang);
      if (user) {
        try {
          await api.patch("/settings/profile", { language: lang });
          updateUser?.({ language: lang });
        } catch {}
      }
    },
    [user, updateUser],
  );

  // Sync from user store when user logs in / changes
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    if (user?.language && user.language !== language) {
      setLanguage(user.language);
      localStorage.setItem("sp_lang", user.language);
    }
  }, [user?.theme, user?.language]);

  return (
    <ThemeContext.Provider
      value={{ theme, language, changeTheme, changeLanguage }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
