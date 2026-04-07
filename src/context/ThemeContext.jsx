import { createContext, useContext, useEffect, useState } from "react";
import api from "../lib/api";
import { useAuthStore } from "../store/authStore";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuthStore();
  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // Apply theme to <html>
  useEffect(() => {
    const root = document.documentElement;
    const apply = (t) => {
      root.setAttribute(
        "data-theme",
        t === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : t,
      );
    };
    apply(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Apply language to <html lang="">
  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem("sp_lang", language);
  }, [language]);

  const changeTheme = async (t) => {
    setTheme(t);
    localStorage.setItem("sp_theme", t);
    if (user) {
      try {
        await api.patch("/settings/profile", { theme: t });
      } catch {}
    }
  };

  const changeLanguage = async (lang) => {
    setLanguage(lang);
    localStorage.setItem("sp_lang", lang);
    if (user) {
      try {
        await api.patch("/settings/profile", { language: lang });
      } catch {}
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, language, changeTheme, changeLanguage }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
