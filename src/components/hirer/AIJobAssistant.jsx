import { useState } from "react";
import styles from "./AIJobAssistant.module.css";

export default function AIJobAssistant({ onApply }) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [
            {
              role: "user",
              content: `You are a job posting assistant for SkilledProz, a global skills marketplace. A hirer described what they need in plain language. Convert it into a structured job posting.

User description: "${prompt}"

Respond ONLY with a valid JSON object (no markdown, no backticks) with these exact fields:
{
  "title": "short clear job title",
  "description": "2-3 sentence professional description of the work needed",
  "suggestedCategory": "most relevant skill category from: Electrical, Plumbing, Carpentry, Cleaning, Painting, Roofing, Landscaping, HVAC, Tiling, Welding, Security, Catering, Web Development, Graphic Design, Photography, Moving, Tutoring, Healthcare Support, Auto Repair, Beauty & Hair",
  "estimatedHours": number (realistic estimate),
  "budgetRange": "e.g. ₦15,000 - ₦25,000",
  "tips": ["tip 1 for a better hire", "tip 2"]
}`,
            },
          ],
        }),
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
      setResult(parsed);
    } catch {
      setError("Failed to generate. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Trigger */}
      <button className={styles.trigger} onClick={() => setOpen(!open)}>
        <span className={styles.triggerIcon}>✨</span>
        <span>AI Job Assistant</span>
        <span className={styles.triggerBadge}>New</span>
        <span className={styles.triggerChevron}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderLeft}>
              <span className={styles.panelIcon}>🤖</span>
              <div>
                <p className={styles.panelTitle}>Describe what you need</p>
                <p className={styles.panelSub}>
                  Write naturally — the AI will structure it into a job post
                </p>
              </div>
            </div>
          </div>

          <div className={styles.examples}>
            {[
              "I need someone to fix a leaking pipe under my kitchen sink",
              "Looking for an electrician to install 5 ceiling fans in my house in Lagos",
              "Need a cleaner for my 3-bedroom apartment every Saturday",
            ].map((ex) => (
              <button
                key={ex}
                className={styles.exampleChip}
                onClick={() => setPrompt(ex)}
              >
                {ex}
              </button>
            ))}
          </div>

          <div className={styles.inputWrap}>
            <textarea
              className={styles.textarea}
              placeholder="e.g. I need someone to paint the exterior of my 4-bedroom house in Abuja, it's about 200 square metres..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} /> Generating...
                </>
              ) : (
                <>✨ Generate Job Post</>
              )}
            </button>
          </div>

          {error && <div className={styles.errorBox}>⚠️ {error}</div>}

          {result && (
            <div className={styles.result}>
              <div className={styles.resultHeader}>
                <p className={styles.resultLabel}>✅ Generated Job Post</p>
                <button
                  className={styles.applyBtn}
                  onClick={() => {
                    onApply?.(result);
                    setOpen(false);
                  }}
                >
                  Use This →
                </button>
              </div>

              <div className={styles.resultGrid}>
                <div className={styles.resultField}>
                  <p className={styles.fieldLabel}>Title</p>
                  <p className={styles.fieldValue}>{result.title}</p>
                </div>
                <div className={styles.resultField}>
                  <p className={styles.fieldLabel}>Category</p>
                  <p className={styles.fieldValue}>
                    {result.suggestedCategory}
                  </p>
                </div>
                <div className={styles.resultField}>
                  <p className={styles.fieldLabel}>Est. Hours</p>
                  <p className={styles.fieldValue}>{result.estimatedHours}h</p>
                </div>
                <div className={styles.resultField}>
                  <p className={styles.fieldLabel}>Budget Range</p>
                  <p
                    className={styles.fieldValue}
                    style={{ color: "var(--orange)" }}
                  >
                    {result.budgetRange}
                  </p>
                </div>
              </div>

              <div
                className={styles.resultField}
                style={{ marginTop: "0.875rem" }}
              >
                <p className={styles.fieldLabel}>Description</p>
                <p className={styles.fieldText}>{result.description}</p>
              </div>

              {result.tips?.length > 0 && (
                <div className={styles.tips}>
                  <p className={styles.tipsLabel}>💡 Hiring tips</p>
                  {result.tips.map((tip, i) => (
                    <p key={i} className={styles.tipItem}>
                      → {tip}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
