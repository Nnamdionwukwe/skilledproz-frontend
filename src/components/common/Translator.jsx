import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../../store/authStore";
import { useTheme } from "../../context/ThemeContext";
import api from "../../lib/api";
import styles from "./Translator.module.css";
import { FaGlobe, FaSync, FaExclamationTriangle } from "react-icons/fa";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "fr", label: "French" },
  { code: "ar", label: "Arabic" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Portuguese" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "zh", label: "Chinese" },
  { code: "bn", label: "Bengali" },
];

const translationCache = new Map();

export default function Translator({ text, className }) {
  const { user } = useAuthStore();
  const { language } = useTheme();

  const userLang = user?.language || language || "en";
  const isEnglish = userLang === "en";

  // Target language: start with user's language, but if English, default to Yoruba
  const defaultTarget = isEnglish ? "yo" : userLang;
  const [targetLang, setTargetLang] = useState(defaultTarget);
  const [translated, setTranslated] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState("");
  const autoTranslatedRef = useRef(false);

  const cacheKey = `${text}|${targetLang}`;

  // Auto‑translate only if targetLang is not English
  useEffect(() => {
    if (!text || targetLang === "en") {
      setTranslated("");
      setShowTranslation(false);
      autoTranslatedRef.current = false;
      return;
    }

    if (translationCache.has(cacheKey)) {
      setTranslated(translationCache.get(cacheKey));
      setShowTranslation(true);
      autoTranslatedRef.current = true;
      return;
    }

    if (autoTranslatedRef.current) return;
    autoTranslatedRef.current = true;

    const doTranslate = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.post("/translate", {
          text,
          targetLang,
        });
        if (res.data.success) {
          const result = res.data.data.translated;
          translationCache.set(cacheKey, result);
          setTranslated(result);
          setShowTranslation(true);
        } else {
          setError("Translation service returned an error.");
          setTranslated(text);
          setShowTranslation(true);
        }
      } catch (err) {
        console.error("Translation error:", err);
        setError("Translation failed. Please try again.");
        setTranslated(text);
        setShowTranslation(true);
      } finally {
        setLoading(false);
      }
    };

    doTranslate();
  }, [text, targetLang]);

  const handleTranslate = async () => {
    if (!text) return;
    if (targetLang === "en") {
      // If target is English, show original text
      setTranslated(text);
      setShowTranslation(true);
      return;
    }

    // Check cache
    if (translationCache.has(cacheKey)) {
      setTranslated(translationCache.get(cacheKey));
      setShowTranslation(true);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await api.post("/translate", {
        text,
        targetLang,
      });
      if (res.data.success) {
        const result = res.data.data.translated;
        translationCache.set(cacheKey, result);
        setTranslated(result);
        setShowTranslation(true);
      } else {
        setError("Translation service returned an error.");
        setTranslated(text);
        setShowTranslation(true);
      }
    } catch (err) {
      console.error("Translation error:", err);
      setError("Translation failed. Please try again.");
      setTranslated(text);
      setShowTranslation(true);
    } finally {
      setLoading(false);
    }
  };

  const toggleTranslation = () => {
    setShowTranslation((prev) => !prev);
  };

  const handleLangChange = (e) => {
    const newLang = e.target.value;
    setTargetLang(newLang);
    // Clear previous translation state for new language
    setTranslated("");
    setShowTranslation(false);
    setError("");
    autoTranslatedRef.current = false;
  };

  return (
    <div className={`${styles.wrap} ${className || ""}`}>
      {/* Original text */}
      <p className={styles.originalText}>{text}</p>

      {/* Controls – always visible */}
      <div className={styles.controls}>
        <select
          className={styles.langSelect}
          value={targetLang}
          onChange={handleLangChange}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>

        <button
          className={styles.translateBtn}
          onClick={handleTranslate}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className={styles.spinner} /> Translating...
            </>
          ) : translated ? (
            <>
              <FaSync /> Re-translate
            </>
          ) : (
            <>
              <FaGlobe /> Translate
            </>
          )}
        </button>

        {translated && (
          <button className={styles.hideBtn} onClick={toggleTranslation}>
            {showTranslation ? "Hide" : "Show"}
          </button>
        )}
      </div>

      {/* Translated output */}
      {showTranslation && translated && (
        <div className={styles.translation}>
          <div className={styles.translationHeader}>
            <span className={styles.translationFlag}>
              <FaGlobe />
            </span>
            <span className={styles.translationLabel}>
              {LANGUAGES.find((l) => l.code === targetLang)?.label ||
                targetLang}{" "}
              translation
            </span>
          </div>
          <p className={styles.translatedText}>{translated}</p>
        </div>
      )}

      {error && (
        <p className={styles.error}>
          <FaExclamationTriangle /> {error}
        </p>
      )}
    </div>
  );
}
