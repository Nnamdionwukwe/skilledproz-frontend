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

function clearGoogCookies() {
  const expire = "expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/";
  const hosts = ["", window.location.hostname, `.${window.location.hostname}`];
  for (const h of hosts) {
    document.cookie = `googtrans=; ${expire}${h ? `; domain=${h}` : ""}`;
  }
}

function setGoogCookie(langCode) {
  const val = `/en/${langCode}`;
  document.cookie = `googtrans=${val}; path=/`;
  document.cookie = `googtrans=${val}; path=/; domain=${window.location.hostname}`;
  document.cookie = `googtrans=${val}; path=/; domain=.${window.location.hostname}`;
}

// ── GT code map ───────────────────────────────────────────────────────────────
const GT_CODE_MAP = { zh: "zh-CN", "zh-TW": "zh-TW", iw: "iw", jw: "jw" };
function toGTCode(code) {
  return GT_CODE_MAP[code] || code;
}

// ── Body lock (prevents GT shifting page) ────────────────────────────────────
function lockBody() {
  if (!document.body) return;
  document.body.style.top = "0px";
  document.body.style.position = "static";
}

let _obs = null;
function watchBody() {
  if (_obs || !window.MutationObserver || !document.body) return;
  _obs = new MutationObserver(() => {
    if (!document.body) return;
    if (document.body.style.top && document.body.style.top !== "0px")
      document.body.style.top = "0px";
    if (document.body.style.position === "relative")
      document.body.style.position = "static";
  });
  _obs.observe(document.body, { attributes: true, attributeFilter: ["style"] });
}

// ── Apply a non-English language ──────────────────────────────────────────────
function applyGTLanguage(langCode, attempt = 0) {
  if (attempt > 40) return;
  const select = document.querySelector("select.goog-te-combo");
  if (select) {
    const code = toGTCode(langCode);
    setGoogCookie(langCode);
    select.value = code;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    setTimeout(() => {
      if (select.value !== code) {
        select.value = code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      lockBody();
    }, 400);
    setTimeout(lockBody, 1000);
    return;
  }
  setTimeout(() => applyGTLanguage(langCode, attempt + 1), 500);
}

// ── Revert to English ─────────────────────────────────────────────────────────
//
// GT mutates thousands of DOM nodes and there is no public undo API.
// The ONLY reliable method is a page reload with the cookie cleared.
// We guard against reload loops using sessionStorage.
//
function revertToEnglish() {
  // Already reverted this session — don't loop
  if (sessionStorage.getItem("_sp_reverted")) return;

  clearGoogCookies();
  sessionStorage.setItem("_sp_reverted", "1");

  // Use replaceState so the reload doesn't add to browser history
  window.location.reload();
}

// ─────────────────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const mounted = useRef(false);

  const [theme, setThemeState] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );

  const [language, setLanguageState] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // Start body observer immediately
  useEffect(() => {
    watchBody();
    lockBody();
  }, []);

  // Theme application
  useEffect(() => {
    const root = document.documentElement;
    const apply = (t) => {
      const resolved =
        t === "system"
          ? window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light"
          : t;
      root.setAttribute("data-theme", resolved);
    };
    apply(theme);
    if (theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const h = () => apply("system");
      mq.addEventListener("change", h);
      return () => mq.removeEventListener("change", h);
    }
  }, [theme]);

  // On first mount: apply saved language, clear revert flag
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    // Clear the loop-guard after a successful load in English
    if (sessionStorage.getItem("_sp_reverted")) {
      sessionStorage.removeItem("_sp_reverted");
      return; // page is already clean English
    }

    const saved = localStorage.getItem("sp_lang") || "en";
    if (saved && saved !== "en") {
      setTimeout(() => applyGTLanguage(saved), 800);
    }
  }, []);

  // Language change effect (skips on initial render)
  const prevLang = useRef(language);
  useEffect(() => {
    if (!mounted.current) return;
    if (prevLang.current === language) return;
    prevLang.current = language;

    document.documentElement.lang = language;

    if (language === "en") {
      revertToEnglish();
    } else {
      applyGTLanguage(language);
    }
  }, [language]);

  // Sync from user store on login
  useEffect(() => {
    if (!user?.id) return;
    if (user.theme && user.theme !== theme) {
      setThemeState(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    if (user.language && user.language !== language) {
      setLanguageState(user.language);
      localStorage.setItem("sp_lang", user.language);
    }
  }, [user?.id]);

  const changeTheme = useCallback(
    async (t) => {
      setThemeState(t);
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
      // Save immediately so reload picks it up or language effect fires
      localStorage.setItem("sp_lang", lang);

      // Persist to backend (don't await — reload may happen before response)
      api
        .patch("/settings/profile", { language: lang })
        .then(() => updateUser?.({ language: lang }))
        .catch(() => {});

      // Trigger the language effect
      setLanguageState(lang);
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
