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

// ── Cookie helpers ────────────────────────────────────────────────────────────
function setGTCookie(langCode) {
  const hosts = [
    `path=/`,
    `path=/; domain=${location.hostname}`,
    `path=/; domain=.${location.hostname}`,
  ];
  // Always wipe first
  hosts.forEach((h) => {
    document.cookie = `googtrans=; ${h}; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
  });
  if (langCode && langCode !== "en") {
    hosts.forEach((h) => {
      document.cookie = `googtrans=/en/${langCode}; ${h}`;
    });
  }
}

// ── Trigger GT's select element ───────────────────────────────────────────────
function triggerGTSelect(langCode) {
  const select = document.querySelector("select.goog-te-combo");
  if (!select) return false;

  const GT_MAP = { zh: "zh-CN", "zh-TW": "zh-TW" };
  const target = langCode === "en" ? "" : GT_MAP[langCode] || langCode;

  select.value = target;
  select.dispatchEvent(new Event("change", { bubbles: true }));
  select.dispatchEvent(new Event("input", { bubbles: true }));
  return true;
}

// ── Apply a language (non-English) ───────────────────────────────────────────
// Polls until GT's select element appears (up to 10s)
function applyNonEnglish(langCode) {
  setGTCookie(langCode);
  if (triggerGTSelect(langCode)) return;

  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    if (triggerGTSelect(langCode) || tries > 20) clearInterval(iv);
  }, 500);
}

// ── Revert to English ─────────────────────────────────────────────────────────
// Strategy: clear cookie then reload with ?lang=en
// index.html's inline script intercepts ?lang=en BEFORE GT loads,
// so GT initialises with no cookie = no translation = English.
function revertToEnglish() {
  setGTCookie("en"); // clear cookie

  // Try the select element first (works on localhost / when GT is already loaded)
  if (triggerGTSelect("en")) {
    // Also persist via URL approach to survive hard reloads
    // (only reload if page is currently translated)
    const isTranslated =
      document.documentElement.lang !== "en" ||
      document.cookie.includes("googtrans=/en/");
    if (!isTranslated) return; // already English, no reload needed
  }

  // Production-safe: redirect with ?lang=en
  // index.html kills the cookie before GT loads
  const url = new URL(window.location.href);
  url.searchParams.set("lang", "en");
  window.location.replace(url.toString());
}

// ── Body-shift suppressor ─────────────────────────────────────────────────────
function suppressGTShift() {
  const fix = () => {
    if (document.body?.style?.top && document.body.style.top !== "0px") {
      document.body.style.top = "0px";
    }
  };
  fix();
  if (window.MutationObserver) {
    new MutationObserver(fix).observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }
  setInterval(fix, 300);
}

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const didInit = useRef(false);

  // ── Read initial language: ?lang=en param takes priority ─────────────────
  const initialLang = (() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") return "en";
    return localStorage.getItem("sp_lang") || user?.language || "en";
  })();

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );
  const [language, setLanguage] = useState(initialLang);

  // ── Clean up ?lang=en from URL after reading it ───────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") {
      params.delete("lang");
      const clean = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname;
      window.history.replaceState({}, "", clean);
      // Ensure store + localStorage are updated to English
      localStorage.setItem("sp_lang", "en");
      setLanguage("en");
    }
  }, []);

  // ── Suppress GT body shift ────────────────────────────────────────────────
  useEffect(() => {
    suppressGTShift();
    // Re-run after GT has had time to inject its bar
    const t = setTimeout(suppressGTShift, 2000);
    return () => clearTimeout(t);
  }, []);

  // ── Apply theme ───────────────────────────────────────────────────────────
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
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
  }, [theme]);

  // ── Apply saved non-English language on mount ─────────────────────────────
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    if (language && language !== "en") {
      applyNonEnglish(language);
    }
  }, []);

  // ── Sync from auth store on login ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    if (user.theme) {
      setTheme(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    if (user.language) {
      const current = localStorage.getItem("sp_lang");
      if (user.language !== current) {
        setLanguage(user.language);
        localStorage.setItem("sp_lang", user.language);
        if (user.language !== "en") applyNonEnglish(user.language);
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
  const changeLanguage = useCallback(
    async (lang) => {
      setLanguage(lang);
      localStorage.setItem("sp_lang", lang);

      if (lang === "en") {
        revertToEnglish();
      } else {
        applyNonEnglish(lang);
      }

      // Persist to DB (fire-and-forget — don't await so UI isn't blocked)
      api
        .patch("/settings/profile", { language: lang })
        .then(() => updateUser?.({ language: lang }))
        .catch(() => {});
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
