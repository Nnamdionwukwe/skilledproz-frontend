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

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const gtReadyRef = useRef(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // Apply theme
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
      const handler = () =>
        root.setAttribute("data-theme", mq.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // Apply language via Google Translate select element
  const applyTranslation = useCallback((langCode) => {
    document.documentElement.lang = langCode;
    localStorage.setItem("sp_lang", langCode);

    // Method 1: Use GT select combo if loaded
    const select = document.querySelector("select.goog-te-combo");
    if (select) {
      select.value = langCode === "en" ? "" : langCode;
      select.dispatchEvent(new Event("change"));
      gtReadyRef.current = true;
      return;
    }

    // Method 2: Set cookie and reload if GT hasn't loaded yet
    if (langCode === "en") {
      // Remove translation
      document.cookie =
        "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      document.cookie = `googtrans=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    } else {
      document.cookie = `googtrans=/en/${langCode}; path=/`;
      document.cookie = `googtrans=/en/${langCode}; path=/; domain=.${window.location.hostname}`;
    }

    // Reload so GT picks up the cookie (only on initial language set)
    if (!gtReadyRef.current && langCode !== "en") {
      window.location.reload();
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    // Wait for GT to load then apply
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const select = document.querySelector("select.goog-te-combo");
      if (select) {
        if (language !== "en") {
          select.value = language;
          select.dispatchEvent(new Event("change"));
        }
        gtReadyRef.current = true;
        clearInterval(interval);
      }
      if (attempts > 20) clearInterval(interval);
    }, 500);
    return () => clearInterval(interval);
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
      applyTranslation(lang);
      if (user) {
        try {
          await api.patch("/settings/profile", { language: lang });
          updateUser?.({ language: lang });
        } catch {}
      }
    },
    [user, updateUser, applyTranslation],
  );

  // Sync from user store on login
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
