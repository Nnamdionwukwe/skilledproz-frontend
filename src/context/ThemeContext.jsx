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

// ── Language code → GT combo value mapping ────────────────────────────────────
// GT uses slightly different codes from BCP-47 in some cases
const GT_CODE_MAP = {
  zh: "zh-CN",
  "zh-TW": "zh-TW",
  iw: "iw", // Hebrew (GT uses 'iw' not 'he')
  jw: "jw", // Javanese
};
function toGTCode(code) {
  return GT_CODE_MAP[code] || code;
}

// ── Reliable revert to English ────────────────────────────────────────────────
function revertToEnglish() {
  // 1. Delete googtrans cookie on all paths/domains
  const cookieBase =
    "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
  document.cookie = cookieBase;
  document.cookie = cookieBase + `; domain=.${window.location.hostname}`;
  document.cookie = cookieBase + `; domain=${window.location.hostname}`;

  // 2. Try the select element first (no reload needed)
  const select = document.querySelector("select.goog-te-combo");
  if (select) {
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));

    // Also try the GT restore function if available
    setTimeout(() => {
      try {
        const teFrame = document.querySelector(".goog-te-menu-frame");
        if (teFrame) {
          const teDoc =
            teFrame.contentDocument || teFrame.contentWindow?.document;
          const restoreLink = teDoc?.querySelector("a[class*='restore']");
          if (restoreLink) restoreLink.click();
        }
      } catch {}
    }, 200);
    return;
  }

  // 3. Fallback: reload (only if select not available)
  window.location.reload();
}

// ── Apply a non-English language ─────────────────────────────────────────────
function applyLanguage(langCode, attempts = 0) {
  if (attempts > 30) return; // stop after 15s

  const select = document.querySelector("select.goog-te-combo");
  if (select) {
    const gtCode = toGTCode(langCode);
    // Set cookie first
    const cookieVal = `/en/${langCode}`;
    document.cookie = `googtrans=${cookieVal}; path=/`;
    document.cookie = `googtrans=${cookieVal}; path=/; domain=.${window.location.hostname}`;

    select.value = gtCode;
    select.dispatchEvent(new Event("change", { bubbles: true }));

    // Verify it took effect after a short delay
    setTimeout(() => {
      if (select.value !== gtCode) {
        select.value = gtCode;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }, 300);
    return;
  }

  // GT not loaded yet — retry
  setTimeout(() => applyLanguage(langCode, attempts + 1), 500);
}

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const initializedRef = useRef(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );

  // Language state: read from localStorage first (persists across page loads)
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // ── Apply theme ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t) => {
      const resolved =
        t === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : t;
      root.setAttribute("data-theme", resolved);
    };
    applyTheme(theme);

    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [theme]);

  // ── Apply language on mount and when it changes ─────────────────────────────
  useEffect(() => {
    document.documentElement.lang = language === "en" ? "en" : language;

    if (language === "en") {
      // Only revert if we were previously translated
      const existingCookie = document.cookie.includes("googtrans=/en/");
      if (existingCookie) {
        revertToEnglish();
      }
      return;
    }

    // Apply translation
    applyLanguage(language);
  }, [language]);

  // ── On first mount: apply saved language from localStorage ──────────────────
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const saved = localStorage.getItem("sp_lang");
    if (saved && saved !== "en") {
      // GT needs time to load on first mount
      applyLanguage(saved);
    }
  }, []);

  // ── Sync from user store when user logs in ──────────────────────────────────
  useEffect(() => {
    if (user?.theme && user.theme !== theme) {
      setTheme(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    if (user?.language && user.language !== language) {
      setLanguage(user.language);
      localStorage.setItem("sp_lang", user.language);
    }
  }, [user?.id]); // Only sync on user change (login), not on every render

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

  const changeLanguage = useCallback(
    async (lang) => {
      setLanguage(lang);
      localStorage.setItem("sp_lang", lang);

      if (lang === "en") {
        revertToEnglish();
      } else {
        applyLanguage(lang);
      }

      try {
        await api.patch("/settings/profile", { language: lang });
        updateUser?.({ language: lang });
      } catch {}
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
