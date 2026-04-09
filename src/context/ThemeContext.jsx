/**
 * ThemeContext.jsx — definitive language + theme manager
 *
 * HOW ENGLISH REVERT WORKS:
 * ─────────────────────────
 * Google Translate cannot be undone via its select element — it has already
 * mutated every text node in the DOM. Reloading with cookies cleared also
 * doesn't work reliably because the browser may still send stale cookies on
 * the reload request, causing GT to re-activate before React mounts.
 *
 * The only reliable method:
 *   1. Clear ALL googtrans cookies (JS + document.cookie)
 *   2. Navigate (not reload) to the same page with ?lang=en appended
 *   3. In index.html, an INLINE script (runs before GT loads) checks for
 *      ?lang=en and immediately overwrites any googtrans cookie to nothing,
 *      preventing GT from ever activating on that page load
 *   4. On mount, React detects ?lang=en, removes it from the URL cleanly
 */

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function nukeGoogCookies() {
  const killStr = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC";
  const paths = ["/", window.location.pathname];
  const hosts = [
    "",
    `domain=${window.location.hostname}`,
    `domain=.${window.location.hostname}`,
  ];
  for (const path of paths) {
    for (const host of hosts) {
      document.cookie = `${killStr}; path=${path}${host ? "; " + host : ""}`;
    }
  }
}

function setGoogCookie(langCode) {
  const v = `/en/${langCode}`;
  document.cookie = `googtrans=${v}; path=/`;
  document.cookie = `googtrans=${v}; path=/; domain=${window.location.hostname}`;
  document.cookie = `googtrans=${v}; path=/; domain=.${window.location.hostname}`;
}

const GT_CODES = { zh: "zh-CN", "zh-TW": "zh-TW", iw: "iw", jw: "jw" };
const toGT = (c) => GT_CODES[c] || c;

function lockBody() {
  if (!document.body) return;
  document.body.style.top = "0px";
  document.body.style.position = "static";
}

let _bodyObs = null;
function watchBody() {
  if (_bodyObs || !window.MutationObserver || !document.body) return;
  _bodyObs = new MutationObserver(() => {
    if (!document.body) return;
    if (document.body.style.top && document.body.style.top !== "0px")
      document.body.style.top = "0px";
    if (document.body.style.position === "relative")
      document.body.style.position = "static";
  });
  _bodyObs.observe(document.body, {
    attributes: true,
    attributeFilter: ["style"],
  });
}

// ── Apply a non-English language (retries until GT widget is ready) ───────────
function applyGTLanguage(langCode, attempt = 0) {
  if (attempt > 50) return; // give up after 25s
  const select = document.querySelector("select.goog-te-combo");
  if (select) {
    const code = toGT(langCode);
    setGoogCookie(langCode);
    select.value = code;
    select.dispatchEvent(new Event("change", { bubbles: true }));
    // Verify 400ms later
    setTimeout(() => {
      if (select.value !== code) {
        select.value = code;
        select.dispatchEvent(new Event("change", { bubbles: true }));
      }
      lockBody();
    }, 400);
    setTimeout(lockBody, 1200);
    return;
  }
  setTimeout(() => applyGTLanguage(langCode, attempt + 1), 500);
}

// ── Switch to English — navigate with ?lang=en param ─────────────────────────
// index.html has an inline <script> that detects this param BEFORE GT loads
// and kills the googtrans cookie at the earliest possible moment.
function switchToEnglish() {
  // 1. Kill cookies now (belt)
  nukeGoogCookies();
  // 2. Save intent to localStorage (suspenders)
  localStorage.setItem("sp_lang", "en");
  // 3. Navigate to same page with signal param — GT hasn't loaded yet on arrival
  const url = new URL(window.location.href);
  url.searchParams.set("lang", "en");
  window.location.href = url.toString();
}

// ─────────────────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }) {
  const { user, updateUser } = useAuthStore();
  const mounted = useRef(false);

  const [theme, setThemeState] = useState(
    () => localStorage.getItem("sp_theme") || user?.theme || "system",
  );

  const [language, setLangState] = useState(
    () => localStorage.getItem("sp_lang") || user?.language || "en",
  );

  // Start body lock immediately
  useEffect(() => {
    watchBody();
    lockBody();
  }, []);

  // Theme
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

  // First mount: clean up ?lang=en param if present, apply saved language
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("lang") === "en") {
      // We arrived via the English-switch navigation.
      // GT was blocked by index.html inline script.
      // Clean up the URL param without triggering a reload.
      params.delete("lang");
      const clean = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.replaceState({}, "", clean);

      // Ensure lang is set to English in state + storage
      setLangState("en");
      localStorage.setItem("sp_lang", "en");
      return; // don't apply any GT language
    }

    // Normal load — apply saved language if not English
    const saved = localStorage.getItem("sp_lang") || "en";
    if (saved && saved !== "en") {
      setTimeout(() => applyGTLanguage(saved), 800);
    }
  }, []);

  // Language change (fires when setLangState is called by changeLanguage)
  const prevLang = useRef(language);
  useEffect(() => {
    // Skip on first mount — handled above
    if (!mounted.current) return;
    if (prevLang.current === language) return;
    prevLang.current = language;

    if (language === "en") {
      switchToEnglish(); // navigate away — this component won't re-render
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
      setLangState(user.language);
      localStorage.setItem("sp_lang", user.language);
      if (user.language !== "en") {
        setTimeout(() => applyGTLanguage(user.language), 500);
      }
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
      localStorage.setItem("sp_lang", lang);
      // Save to backend (fire and forget — navigation may happen before response)
      api
        .patch("/settings/profile", { language: lang })
        .then(() => updateUser?.({ language: lang }))
        .catch(() => {});
      // Trigger the effect above
      setLangState(lang);
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
