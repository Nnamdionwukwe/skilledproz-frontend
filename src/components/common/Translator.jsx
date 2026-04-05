import { useState } from "react";
import api from "../../lib/api";
import styles from "./Translator.module.css";

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

export default function Translator({ text, className }) {
  const [translated, setTranslated] = useState("");
  const [targetLang, setTargetLang] = useState("yo");
  const [loading, setLoading] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [error, setError] = useState("");

  const handleTranslate = async () => {
    if (!text?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/ai/assist", {
        prompt: `Translate the following text to ${LANGUAGES.find((l) => l.code === targetLang)?.label}. 
Return ONLY the translated text with no explanation, no quotes, no preamble.

Text to translate:
"${text}"`,
      });
      const content = res.data.data?.content?.[0]?.text || "";
      setTranslated(content.trim());
      setShowTranslation(true);
    } catch {
      setError("Translation failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`${styles.wrap} ${className || ""}`}>
      {/* Original text */}
      <p className={styles.originalText}>{text}</p>

      {/* Translation controls */}
      <div className={styles.controls}>
        <select
          className={styles.langSelect}
          value={targetLang}
          onChange={(e) => {
            setTargetLang(e.target.value);
            setShowTranslation(false);
            setTranslated("");
          }}
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
          ) : (
            "🌐 Translate"
          )}
        </button>
        {showTranslation && (
          <button
            className={styles.hideBtn}
            onClick={() => setShowTranslation(false)}
          >
            Hide
          </button>
        )}
      </div>

      {/* Translated output */}
      {showTranslation && translated && (
        <div className={styles.translation}>
          <div className={styles.translationHeader}>
            <span className={styles.translationFlag}>🌐</span>
            <span className={styles.translationLabel}>
              {LANGUAGES.find((l) => l.code === targetLang)?.label} translation
            </span>
          </div>
          <p className={styles.translatedText}>{translated}</p>
        </div>
      )}

      {error && <p className={styles.error}>⚠️ {error}</p>}
    </div>
  );
}
