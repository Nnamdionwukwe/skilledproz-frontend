import { useState } from "react";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminBroadcast.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_TYPES = [
  { value: "PLATFORM_ANNOUNCEMENT", label: "📢 Platform Announcement" },
  { value: "BOOKING_UPDATE", label: "📋 Booking Update" },
  { value: "PAYMENT_RELEASED", label: "💰 Payment Notice" },
  { value: "VERIFICATION_UPDATE", label: "🪪 Verification Notice" },
  { value: "SUBSCRIPTION_UPDATE", label: "💎 Subscription Notice" },
];

const AUDIENCE_OPTIONS = [
  { value: "", label: "👥 Everyone", desc: "All active users" },
  { value: "WORKER", label: "🔨 Workers", desc: "Active workers only" },
  { value: "HIRER", label: "🏢 Hirers", desc: "Active hirers only" },
  { value: "ADMIN", label: "🛡 Admins", desc: "Admin accounts only" },
  { value: "_custom", label: "🎯 Specific Users", desc: "Paste user IDs" },
];

const TEMPLATES = [
  {
    label: "Maintenance",
    icon: "🔧",
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Scheduled Maintenance",
    body: "SkilledProz will be unavailable for maintenance on [DATE] from [START_TIME] to [END_TIME]. We apologise for any inconvenience.",
  },
  {
    label: "New Feature",
    icon: "🎉",
    type: "PLATFORM_ANNOUNCEMENT",
    title: "New Feature Launched 🎉",
    body: "We've just launched [FEATURE NAME]! Log in now to check it out and let us know what you think.",
  },
  {
    label: "Policy Update",
    icon: "📜",
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Platform Policy Update",
    body: "We've updated our Terms of Service effective [DATE]. Please review the changes at [LINK] to continue using SkilledProz.",
  },
  {
    label: "Worker Promo",
    icon: "🚀",
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Boost Your Visibility This Week",
    body: "Featured listings are [X]% off this week only. Get your profile seen by more hirers — upgrade now before slots run out.",
  },
  {
    label: "Hirer Promo",
    icon: "💼",
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Find Skilled Workers Near You",
    body: "Over [N] verified workers are available in your area. Post a job today and get matched within minutes.",
  },
  {
    label: "Security Alert",
    icon: "🔒",
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Important Security Notice",
    body: "We've detected unusual activity and have taken steps to protect your account. Please review your recent activity and change your password if needed.",
  },
];

const BODY_WARN = 160;
const BODY_LIMIT = 300;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(d) {
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

// ─── Notification Preview ─────────────────────────────────────────────────────

function NotifPreview({ title, body, type }) {
  const typeLabel =
    NOTIF_TYPES.find((t) => t.value === type)?.label || "📢 Announcement";
  return (
    <div className={styles.preview}>
      <p className={styles.previewLabel}>Live Preview</p>
      <div className={styles.previewCard}>
        <div className={styles.previewAppRow}>
          <div className={styles.previewAppIcon}>SP</div>
          <span className={styles.previewAppName}>SkilledProz</span>
          <span className={styles.previewTime}>now</span>
        </div>
        <div className={styles.previewTitle}>
          {title || "Notification title"}
        </div>
        <div className={styles.previewBody}>
          {body || "Your message will appear here…"}
        </div>
        <div className={styles.previewType}>{typeLabel}</div>
      </div>
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

function ConfirmModal({ payload, onConfirm, onClose, sending }) {
  const audienceLabel =
    payload.userIds?.length > 0
      ? `${payload.userIds.length} specific user${payload.userIds.length !== 1 ? "s" : ""}`
      : (AUDIENCE_OPTIONS.find((a) => a.value === (payload.role || ""))
          ?.label ?? "Everyone");

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <p className={styles.modalTitle}>Confirm Broadcast</p>
        <p className={styles.modalSub}>
          Review before sending — this cannot be undone.
        </p>

        <div className={styles.modalGrid}>
          <ModalRow label="To" value={audienceLabel} />
          <ModalRow
            label="Type"
            value={
              NOTIF_TYPES.find((t) => t.value === payload.type)?.label ||
              payload.type
            }
          />
          <ModalRow label="Title" value={payload.title} />
        </div>

        <div className={styles.modalBodyPreview}>
          <span className={styles.modalBodyLabel}>Message</span>
          <p className={styles.modalBodyText}>{payload.body}</p>
        </div>

        <div className={styles.modalActions}>
          <button
            className={styles.modalCancel}
            onClick={onClose}
            disabled={sending}
          >
            Cancel
          </button>
          <button
            className={styles.modalSend}
            onClick={onConfirm}
            disabled={sending}
          >
            {sending ? (
              <>
                <span className={styles.spinner} /> Sending…
              </>
            ) : (
              "📢 Confirm Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalRow({ label, value }) {
  return (
    <div className={styles.modalRow}>
      <span className={styles.modalRowLabel}>{label}</span>
      <span className={styles.modalRowValue}>{value}</span>
    </div>
  );
}

// ─── History Item ─────────────────────────────────────────────────────────────

function HistoryItem({ item }) {
  const audienceLabel =
    item.userIds?.length > 0
      ? `${item.userIds.length} users`
      : (AUDIENCE_OPTIONS.find((a) => a.value === (item.role || ""))?.label ??
        "Everyone");

  return (
    <div className={styles.historyItem}>
      <div className={styles.historyTop}>
        <span className={styles.historyTitle}>{item.title}</span>
        <span className={styles.historyMeta}>
          {fmtDate(item.sentAt)} {fmtTime(item.sentAt)}
        </span>
      </div>
      <div className={styles.historyBottom}>
        <span className={styles.historyTo}>→ {audienceLabel}</span>
        <span className={styles.historyRecipients}>
          ✉️ {item.recipients} sent
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState(""); // "" | "WORKER" | "HIRER" | "ADMIN" | "_custom"
  const [userIds, setUserIds] = useState(""); // raw textarea — comma-separated IDs
  const [notifType, setNotifType] = useState("PLATFORM_ANNOUNCEMENT");
  const [confirm, setConfirm] = useState(false); // show confirm modal
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]); // session-level send log

  // ── Derived ──────────────────────────────────────────────────────────────

  const isCustom = role === "_custom";

  // Parse userIds from textarea into an array
  const parsedUserIds = isCustom
    ? userIds
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const bodyLen = body.length;
  const bodyColor =
    bodyLen >= BODY_LIMIT
      ? "var(--red)"
      : bodyLen >= BODY_WARN
        ? "#eab308"
        : "var(--text-muted)";

  // Build the request payload
  function buildPayload() {
    const payload = {
      title: title.trim(),
      body: body.trim(),
      type: notifType,
    };
    if (isCustom && parsedUserIds.length > 0) {
      payload.userIds = parsedUserIds;
    } else if (!isCustom && role) {
      payload.role = role;
    }
    return payload;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  function handlePreSend(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim())
      return setError("Title and body are required.");
    if (isCustom && parsedUserIds.length === 0)
      return setError("Paste at least one user ID.");
    setError("");
    setResult(null);
    setConfirm(true);
  }

  async function handleConfirmedSend() {
    setSending(true);
    const payload = buildPayload();
    try {
      const r = await api.post("/admin/broadcast", payload);
      const recipients = r.data.data?.recipients ?? 0;
      setResult({ recipients });
      setHistory((prev) =>
        [
          {
            ...payload,
            recipients,
            sentAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 20),
      ); // keep last 20
      setTitle("");
      setBody("");
      setRole("");
      setUserIds("");
      setNotifType("PLATFORM_ANNOUNCEMENT");
      setConfirm(false);
    } catch (err) {
      setError(err.response?.data?.message || "Broadcast failed.");
      setConfirm(false);
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(t) {
    setTitle(t.title);
    setBody(t.body);
    setNotifType(t.type || "PLATFORM_ANNOUNCEMENT");
    setResult(null);
    setError("");
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Broadcast Message</h1>
            <p className={styles.sub}>
              Send platform-wide announcements to users
            </p>
          </div>
          {history.length > 0 && (
            <span className={styles.historyCount}>
              {history.length} sent this session
            </span>
          )}
        </div>

        <div className={styles.outerGrid}>
          {/* ── LEFT: Form ── */}
          <form className={styles.form} onSubmit={handlePreSend}>
            {/* Audience */}
            <div className={styles.field}>
              <label className={styles.label}>Target Audience</label>
              <div className={styles.audienceBtns}>
                {AUDIENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.audienceBtn} ${role === opt.value ? styles.audienceBtnActive : ""}`}
                    onClick={() => {
                      setRole(opt.value);
                      setUserIds("");
                    }}
                    title={opt.desc}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Custom user IDs textarea */}
              {isCustom && (
                <div className={styles.customIds}>
                  <label className={styles.subLabel}>
                    User IDs{" "}
                    <span className={styles.optional}>
                      (comma or newline separated)
                    </span>
                  </label>
                  <textarea
                    className={styles.textarea}
                    placeholder={"abc123, def456\nOr one per line..."}
                    value={userIds}
                    onChange={(e) => setUserIds(e.target.value)}
                    rows={3}
                  />
                  {parsedUserIds.length > 0 && (
                    <span className={styles.idCount}>
                      {parsedUserIds.length} user ID
                      {parsedUserIds.length !== 1 ? "s" : ""} detected
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Notification Type — sends "type" field the controller accepts */}
            <div className={styles.field}>
              <label className={styles.label}>Notification Type</label>
              <select
                className={styles.select}
                value={notifType}
                onChange={(e) => setNotifType(e.target.value)}
              >
                {NOTIF_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className={styles.field}>
              <label className={styles.label}>Title *</label>
              <input
                className={styles.input}
                placeholder="Announcement title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                required
              />
              <span
                className={styles.charCount}
                style={{
                  color: title.length > 100 ? "#eab308" : "var(--text-muted)",
                }}
              >
                {title.length} / 120
              </span>
            </div>

            {/* Body */}
            <div className={styles.field}>
              <label className={styles.label}>Message *</label>
              <textarea
                className={styles.textarea}
                placeholder="Write your announcement…"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={5}
                maxLength={BODY_LIMIT}
                required
              />
              <span className={styles.charCount} style={{ color: bodyColor }}>
                {bodyLen} / {BODY_LIMIT}
                {bodyLen >= BODY_WARN &&
                  bodyLen < BODY_LIMIT &&
                  " · Consider shortening"}
                {bodyLen >= BODY_LIMIT && " · Limit reached"}
              </span>
            </div>

            {/* Live preview */}
            <NotifPreview title={title} body={body} type={notifType} />

            {/* Feedback */}
            {error && <div className={styles.errorBox}>⚠️ {error}</div>}
            {result && (
              <div className={styles.successBox}>
                ✅ Broadcast sent to <strong>{result.recipients}</strong> user
                {result.recipients !== 1 ? "s" : ""} successfully.
              </div>
            )}

            <button type="submit" className={styles.sendBtn} disabled={sending}>
              📢 Review &amp; Send
            </button>
          </form>

          {/* ── RIGHT: Templates + History ── */}
          <div className={styles.sidebar}>
            {/* Templates */}
            <div className={styles.sideSection}>
              <p className={styles.sideTitle}>Quick Templates</p>
              <div className={styles.templateList}>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    className={styles.templateCard}
                    type="button"
                    onClick={() => applyTemplate(t)}
                  >
                    <div className={styles.templateTop}>
                      <span className={styles.templateIcon}>{t.icon}</span>
                      <span className={styles.templateLabel}>{t.label}</span>
                    </div>
                    <span className={styles.templateTitle}>{t.title}</span>
                    <span className={styles.templatePreview}>
                      {t.body.slice(0, 72)}…
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Session send history */}
            {history.length > 0 && (
              <div className={styles.sideSection}>
                <p className={styles.sideTitle}>Sent This Session</p>
                <div className={styles.historyList}>
                  {history.map((item, i) => (
                    <HistoryItem key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            {/* Tips */}
            <div className={styles.tipBox}>
              <p className={styles.tipTitle}>💡 Tips</p>
              <ul className={styles.tipList}>
                <li>Keep messages under 160 chars for push notifications</li>
                <li>Use [PLACEHOLDERS] to mark dynamic content</li>
                <li>Target specific roles to reduce notification fatigue</li>
                <li>Use Specific Users for sensitive personal notices</li>
                <li>Avoid sending more than 1 broadcast per day</li>
              </ul>
            </div>
          </div>
        </div>

        {/* ── Confirm Modal ── */}
        {confirm && (
          <ConfirmModal
            payload={buildPayload()}
            sending={sending}
            onConfirm={handleConfirmedSend}
            onClose={() => setConfirm(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
