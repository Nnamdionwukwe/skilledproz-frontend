import { useState, useRef } from "react";
import styles from "./VoiceSearch.module.css";

export default function VoiceSearch({ onResult, onError }) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [supported] = useState(
    () => "webkitSpeechRecognition" in window || "SpeechRecognition" in window,
  );
  const recognitionRef = useRef(null);

  const start = () => {
    if (!supported) {
      onError?.("Voice search is not supported in this browser. Try Chrome.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (e) => {
      const text = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join("");
      setTranscript(text);
      if (e.results[0].isFinal) {
        onResult?.(text);
      }
    };

    recognition.onerror = (e) => {
      setListening(false);
      if (e.error !== "aborted") {
        onError?.("Voice recognition failed. Please try again.");
      }
    };

    recognition.start();
  };

  const stop = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  if (!supported) return null;

  return (
    <div className={styles.wrap}>
      <button
        className={`${styles.btn} ${listening ? styles.btnActive : ""}`}
        onClick={listening ? stop : start}
        title={listening ? "Stop listening" : "Search by voice"}
      >
        <span className={styles.icon}>{listening ? "⏹" : "🎤"}</span>
        {listening && <span className={styles.ripple} />}
      </button>

      {listening && (
        <div className={styles.feedback}>
          <span className={styles.dot} />
          <span className={styles.dot} style={{ animationDelay: "0.15s" }} />
          <span className={styles.dot} style={{ animationDelay: "0.3s" }} />
          <span className={styles.listeningText}>Listening...</span>
        </div>
      )}

      {transcript && !listening && (
        <p className={styles.transcript}>"{transcript}"</p>
      )}
    </div>
  );
}
