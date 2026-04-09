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

// ── Remove the GT top bar that causes page twitching ─────────────────────────
function suppressGTBar() {
  // Injected style — overrides GT's forced body.top offset
  const id = "sp-gt-suppress";
  if (document.getElementById(id)) return;
  const style = document.createElement("style");
  style.id = id;
  style.textContent = `
    body { top: 0 !important; position: static !important; }
    .goog-te-banner-frame { display: none !important; }
    .VIpgJd-ZVi9od-aZ2wEe-wOHMyf, .VIpgJd-ZVi9od-aZ2wEe { display: none !important; }
    iframe.skiptranslate { display: none !important; }
  `;
  document.head.appendChild(style);

  // Also observe for GT re-injecting body.style.top
  const observer = new MutationObserver(() => {
    if (document.body.style.top && document.body.style.top !== "0px") {
      document.body.style.top = "0px";
    }
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
  });
}

// ── Set googtrans cookie ──────────────────────────────────────────────────────
function setGTCookie(langCode) {
  const val = langCode === "en" ? "" : `/en/${langCode}`;
  // Delete first
  document.cookie = "googtrans=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  document.cookie = `googtrans=; path=/; domain=.${window.location.hostname}; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (val) {
    document.cookie = `googtrans=${val}; path=/`;
    document.cookie = `googtrans=${val}; path=/; domain=.${window.location.hostname}`;
  }
}

// ── Tell GT's select element to change ───────────────────────────────────────
function triggerGTSelect(langCode) {
  const select = document.querySelector("select.goog-te-combo");
  if (!select) return false;

  if (langCode === "en") {
    // GT's own way to restore original: set empty + fire change
    select.value = "";
    ["change", "input"].forEach((evt) =>
      select.dispatchEvent(new Event(evt, { bubbles: true })),
    );
    // Second approach: find and click the "Original" option if it exists
    const originalOption = Array.from(select.options).find(
      (o) => o.value === "" || o.text.toLowerCase().includes("original"),
    );
    if (originalOption) {
      select.value = originalOption.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
  } else {
    // Map some codes GT uses differently
    const CODE_MAP = { zh: "zh-CN", iw: "iw" };
    const gtCode = CODE_MAP[langCode] || langCode;
    select.value = gtCode;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
  return true;
}

// ── Apply language — retries until GT is ready ────────────────────────────────
function applyLang(langCode, maxWait = 8000) {
  // Always set cookie first
  setGTCookie(langCode);

  if (langCode === "en") {
    // For English: try select, if fails just reload without googtrans cookie
    const done = triggerGTSelect("en");
    if (!done) {
      // GT not loaded — cookie already cleared, nothing more needed
      return;
    }
    // After triggering revert, suppress any bar re-injection
    setTimeout(suppressGTBar, 100);
    setTimeout(suppressGTBar, 500);
    return;
  }

  // Non-English: try immediately, then poll
  if (triggerGTSelect(langCode)) return;

  const start = Date.now();
  const interval = setInterval(() => {
    if (Date.now() - start > maxWait) {
      clearInterval(interval);
      return;
    }
    if (triggerGTSelect(langCode)) clearInterval(interval);
  }, 300);
}

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const didInitRef = useRef(false);

  const [theme, setTheme] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );
  const [language, setLanguage] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // ── Suppress GT bar as early as possible ────────────────────────────────────
  useEffect(() => {
    suppressGTBar();
    // Re-run after GT loads
    const t1 = setTimeout(suppressGTBar, 1000);
    const t2 = setTimeout(suppressGTBar, 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // ── Apply theme ─────────────────────────────────────────────────────────────
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

  // ── Apply language on mount (restore saved language) ────────────────────────
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    const saved = localStorage.getItem("sp_lang") || "en";
    if (saved !== "en") {
      // Wait for GT to load, then apply
      applyLang(saved);
    }
  }, []);

  // ── Sync user settings on login ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    if (user.theme) {
      setTheme(user.theme);
      localStorage.setItem("sp_theme", user.theme);
    }
    if (user.language) {
      setLanguage(user.language);
      localStorage.setItem("sp_lang", user.language);
      if (user.language !== "en") applyLang(user.language);
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

  const changeLanguage = useCallback(
    async (lang) => {
      setLanguage(lang);
      localStorage.setItem("sp_lang", lang);
      applyLang(lang);
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
