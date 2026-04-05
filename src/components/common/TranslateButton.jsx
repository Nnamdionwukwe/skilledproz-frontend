import { useState } from "react";
import api from "../../lib/api";
import styles from "./Translator.module.css";

const LANGUAGES = [
  { code: "yo", label: "Yoruba" },
  { code: "ha", label: "Hausa" },
  { code: "ig", label: "Igbo" },
  { code: "fr", label: "French" },
  { code: "en", label: "English" },
  { code: "ar", label: "Arabic" },
  { code: "sw", label: "Swahili" },
  { code: "es", label: "Spanish" },
];

export default function TranslateButton({ text }) {
  const [translated, setTranslated] = useState("");
  const [lang, setLang] = useState("yo");
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (!text?.trim() || loading) return;
    setLoading(true);
    try {
      const res = await api.post("/ai/assist", {
        prompt: `Translate to ${LANGUAGES.find((l) => l.code === lang)?.label}. Return ONLY the translation:\n"${text}"`,
      });
      setTranslated(res.data.data?.content?.[0]?.text?.trim() || "");
    } catch {}
    setLoading(false);
  };

  return (
    <div className={styles.inline}>
      <div className={styles.inlineControls}>
        <select
          className={styles.inlineLangSelect}
          value={lang}
          onChange={(e) => {
            setLang(e.target.value);
            setTranslated("");
          }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        <button className={styles.inlineBtn} onClick={go} disabled={loading}>
          {loading ? "..." : "🌐"}
        </button>
      </div>
      {translated && (
        <div className={styles.inlineResult}>
          <span className={styles.inlineLang}>
            {LANGUAGES.find((l) => l.code === lang)?.label}:
          </span>{" "}
          {translated}
        </div>
      )}
    </div>
  );
}
