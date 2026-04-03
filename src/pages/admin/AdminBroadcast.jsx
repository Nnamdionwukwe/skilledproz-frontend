import { useState } from "react";
import api from "../../lib/api";
import AdminLayout from "./AdminLayout";
import styles from "./AdminBroadcast.module.css";

const TEMPLATES = [
  {
    label: "Maintenance",
    title: "Scheduled Maintenance",
    body: "SkilledProz will be down for maintenance on [DATE] from [TIME]. We apologise for any inconvenience.",
  },
  {
    label: "Feature",
    title: "New Feature Launched 🎉",
    body: "We've just launched [FEATURE]! Log in now to check it out.",
  },
  {
    label: "Policy",
    title: "Platform Policy Update",
    body: "We've updated our terms of service. Please review the changes at [LINK].",
  },
];

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleSend(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim())
      return setError("Title and body are required.");
    setError("");
    setSending(true);
    try {
      const r = await api.post("/admin/broadcast", {
        title,
        body,
        ...(role ? { role } : {}),
      });
      setResult(r.data.data);
      setTitle("");
      setBody("");
      setRole("");
    } catch (err) {
      setError(err.response?.data?.message || "Broadcast failed.");
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(t) {
    setTitle(t.title);
    setBody(t.body);
    setResult(null);
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Broadcast Message</h1>
            <p className={styles.sub}>
              Send platform-wide announcements to users
            </p>
          </div>
        </div>

        <div className={styles.twoCol}>
          {/* Form */}
          <form className={styles.form} onSubmit={handleSend}>
            <div className={styles.field}>
              <label className={styles.label}>Target Audience</label>
              <div className={styles.audienceBtns}>
                {[
                  ["", "Everyone"],
                  ["WORKER", "Workers only"],
                  ["HIRER", "Hirers only"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.audienceBtn} ${role === v ? styles.audienceBtnActive : ""}`}
                    onClick={() => setRole(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Message *</label>
              <textarea
                className={styles.textarea}
                placeholder="Write your announcement..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                required
              />
              <span className={styles.charCount}>{body.length} chars</span>
            </div>

            {error && <div className={styles.errorBox}>⚠️ {error}</div>}

            {result && (
              <div className={styles.successBox}>
                ✅ Sent to <strong>{result.recipients}</strong> users
                successfully.
              </div>
            )}

            <button type="submit" className={styles.sendBtn} disabled={sending}>
              {sending ? (
                <>
                  <span className={styles.spinner} /> Sending...
                </>
              ) : (
                "📢 Send Broadcast"
              )}
            </button>
          </form>

          {/* Templates */}
          <div className={styles.templates}>
            <p className={styles.templatesTitle}>Quick Templates</p>
            {TEMPLATES.map((t) => (
              <button
                key={t.label}
                className={styles.templateCard}
                onClick={() => applyTemplate(t)}
              >
                <span className={styles.templateLabel}>{t.label}</span>
                <span className={styles.templateTitle}>{t.title}</span>
                <span className={styles.templatePreview}>
                  {t.body.slice(0, 60)}...
                </span>
              </button>
            ))}

            <div className={styles.tipBox}>
              <p className={styles.tipTitle}>💡 Tips</p>
              <ul className={styles.tipList}>
                <li>Keep messages concise and actionable</li>
                <li>Use [PLACEHOLDERS] for dynamic content</li>
                <li>Target specific roles to reduce noise</li>
                <li>Avoid sending more than 1 broadcast per day</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
