// src/pages/admin/AdminBroadcast.jsx
// Full admin broadcast messaging.
//
// Endpoint:
//   POST /admin/broadcast   { title, body, type, role?, userIds? }
//
// Emojis removed. Fully responsive. Uses platform ConfirmationModal + AlertModal.

import { useState, useMemo } from "react";
import {
  Megaphone,
  Users,
  Hammer,
  Building2,
  Shield,
  Target,
  Wrench,
  PartyPopper,
  ScrollText,
  Rocket,
  Briefcase,
  Lock,
  Lightbulb,
  Send,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  MailCheck,
  ListChecks,
  Sparkles,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import styles from "./AdminBroadcast.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOTIF_TYPES = [
  {
    value: "PLATFORM_ANNOUNCEMENT",
    label: "Platform Announcement",
    Icon: Megaphone,
  },
  { value: "BOOKING_UPDATE", label: "Booking Update", Icon: ListChecks },
  { value: "PAYMENT_RELEASED", label: "Payment Notice", Icon: MailCheck },
  {
    value: "VERIFICATION_UPDATE",
    label: "Verification Notice",
    Icon: CheckCircle,
  },
  {
    value: "SUBSCRIPTION_UPDATE",
    label: "Subscription Notice",
    Icon: Sparkles,
  },
];

const AUDIENCE_OPTIONS = [
  { value: "", label: "Everyone", desc: "All active users", Icon: Users },
  {
    value: "WORKER",
    label: "Workers",
    desc: "Active workers only",
    Icon: Hammer,
  },
  {
    value: "HIRER",
    label: "Hirers",
    desc: "Active hirers only",
    Icon: Building2,
  },
  {
    value: "ADMIN",
    label: "Admins",
    desc: "Admin accounts only",
    Icon: Shield,
  },
  {
    value: "_custom",
    label: "Specific Users",
    desc: "Paste user IDs",
    Icon: Target,
  },
];

const TEMPLATES = [
  {
    label: "Maintenance",
    Icon: Wrench,
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Scheduled Maintenance",
    body: "SkilledProz will be unavailable for maintenance on [DATE] from [START_TIME] to [END_TIME]. We apologise for any inconvenience.",
  },
  {
    label: "New Feature",
    Icon: PartyPopper,
    type: "PLATFORM_ANNOUNCEMENT",
    title: "New Feature Launched",
    body: "We've just launched [FEATURE NAME]! Log in now to check it out and let us know what you think.",
  },
  {
    label: "Policy Update",
    Icon: ScrollText,
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Platform Policy Update",
    body: "We've updated our Terms of Service effective [DATE]. Please review the changes at [LINK] to continue using SkilledProz.",
  },
  {
    label: "Worker Promo",
    Icon: Rocket,
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Boost Your Visibility This Week",
    body: "Featured listings are [X]% off this week only. Get your profile seen by more hirers — upgrade now before slots run out.",
  },
  {
    label: "Hirer Promo",
    Icon: Briefcase,
    type: "PLATFORM_ANNOUNCEMENT",
    title: "Find Skilled Workers Near You",
    body: "Over [N] verified workers are available in your area. Post a job today and get matched within minutes.",
  },
  {
    label: "Security Alert",
    Icon: Lock,
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
  const typeMeta = NOTIF_TYPES.find((t) => t.value === type) ?? NOTIF_TYPES[0];
  const TypeIcon = typeMeta.Icon;
  return (
    <div className={styles.preview}>
      <p className={styles.previewLabel}>
        <Eye size={11} /> Live Preview
      </p>
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
        <div className={styles.previewType}>
          <TypeIcon size={10} /> {typeMeta.label}
        </div>
      </div>
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
          <MailCheck size={11} /> {item.recipients} sent
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBroadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [role, setRole] = useState("");
  const [userIds, setUserIds] = useState("");
  const [notifType, setNotifType] = useState("PLATFORM_ANNOUNCEMENT");
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);
  const [notify, setNotify] = useState(null);

  const isCustom = role === "_custom";

  const parsedUserIds = useMemo(() => {
    if (!isCustom) return [];
    const seen = new Set();
    return userIds
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter((s) => {
        if (!s || seen.has(s)) return false;
        seen.add(s);
        return true;
      });
  }, [isCustom, userIds]);

  const bodyLen = body.length;
  const bodyColor =
    bodyLen >= BODY_LIMIT
      ? "var(--red)"
      : bodyLen >= BODY_WARN
        ? "#eab308"
        : "var(--text-muted)";

  const audienceLabel = isCustom
    ? `${parsedUserIds.length} specific user${parsedUserIds.length !== 1 ? "s" : ""}`
    : (AUDIENCE_OPTIONS.find((a) => a.value === role)?.label ?? "Everyone");

  const selectedTypeMeta =
    NOTIF_TYPES.find((t) => t.value === notifType) ?? NOTIF_TYPES[0];

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

  function showToast(type, text) {
    setNotify({ type, text });
  }

  function handlePreSend(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim())
      return showToast("error", "Title and body are required.");
    if (isCustom && parsedUserIds.length === 0)
      return showToast("error", "Paste at least one user ID.");
    setConfirm(true);
  }

  async function handleConfirmedSend() {
    setSending(true);
    const payload = buildPayload();
    try {
      const r = await api.post("/admin/broadcast", payload);
      const recipients = r.data.data?.recipients ?? 0;
      setHistory((prev) =>
        [
          {
            ...payload,
            recipients,
            sentAt: new Date().toISOString(),
          },
          ...prev,
        ].slice(0, 20),
      );
      setTitle("");
      setBody("");
      setRole("");
      setUserIds("");
      setNotifType("PLATFORM_ANNOUNCEMENT");
      setConfirm(false);
      showToast(
        "success",
        `Broadcast sent to ${recipients} user${recipients !== 1 ? "s" : ""}.`,
      );
    } catch (err) {
      setConfirm(false);
      showToast("error", err.response?.data?.message || "Broadcast failed.");
    } finally {
      setSending(false);
    }
  }

  function applyTemplate(t) {
    setTitle(t.title);
    setBody(
      t.body.length > BODY_LIMIT
        ? t.body.slice(0, BODY_LIMIT - 1) + "…"
        : t.body,
    );
    setNotifType(t.type || "PLATFORM_ANNOUNCEMENT");
  }

  const canSend =
    title.trim().length > 0 &&
    body.trim().length > 0 &&
    (!isCustom || parsedUserIds.length > 0);

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.headerRow}>
          <div className={styles.headerText}>
            <p className={styles.eyebrow}>Messaging</p>
            <h1 className={styles.title}>
              <Megaphone size={20} /> Broadcast Message
            </h1>
            <p className={styles.sub}>
              Send platform-wide announcements to users
            </p>
          </div>
          {history.length > 0 && (
            <span className={styles.historyCount}>
              <Send size={11} /> {history.length} sent this session
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
                {AUDIENCE_OPTIONS.map((opt) => {
                  const Icon = opt.Icon;
                  const active = role === opt.value;
                  return (
                    <button
                      key={opt.value || "all"}
                      type="button"
                      className={`${styles.audienceBtn} ${active ? styles.audienceBtnActive : ""}`}
                      onClick={() => {
                        setRole(opt.value);
                        setUserIds("");
                      }}
                      title={opt.desc}
                    >
                      <Icon size={12} /> {opt.label}
                    </button>
                  );
                })}
              </div>

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
                      <CheckCircle size={11} /> {parsedUserIds.length} user ID
                      {parsedUserIds.length !== 1 ? "s" : ""} detected
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Notification Type */}
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

            <button
              type="submit"
              className={styles.sendBtn}
              disabled={sending || !canSend}
            >
              <Send size={14} /> Review &amp; Send
            </button>
          </form>

          {/* ── RIGHT: Templates + History + Tips ── */}
          <div className={styles.sidebar}>
            <div className={styles.sideSection}>
              <p className={styles.sideTitle}>
                <Sparkles size={11} /> Quick Templates
              </p>
              <div className={styles.templateList}>
                {TEMPLATES.map((t) => {
                  const Icon = t.Icon;
                  return (
                    <button
                      key={t.label}
                      className={styles.templateCard}
                      type="button"
                      onClick={() => applyTemplate(t)}
                    >
                      <div className={styles.templateTop}>
                        <span className={styles.templateIconWrap}>
                          <Icon size={12} />
                        </span>
                        <span className={styles.templateLabel}>{t.label}</span>
                      </div>
                      <span className={styles.templateTitle}>{t.title}</span>
                      <span className={styles.templatePreview}>
                        {t.body.slice(0, 72)}…
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {history.length > 0 && (
              <div className={styles.sideSection}>
                <p className={styles.sideTitle}>
                  <MailCheck size={11} /> Sent This Session
                </p>
                <div className={styles.historyList}>
                  {history.map((item, i) => (
                    <HistoryItem key={i} item={item} />
                  ))}
                </div>
              </div>
            )}

            <div className={styles.tipBox}>
              <p className={styles.tipTitle}>
                <Lightbulb size={12} /> Tips
              </p>
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

        {/* ── Platform ConfirmationModal ── */}
        <ConfirmationModal
          isOpen={confirm}
          onClose={() => !sending && setConfirm(false)}
          onConfirm={handleConfirmedSend}
          title="Confirm broadcast"
          message={`This will send "${title.trim()}" to ${audienceLabel}. This cannot be undone.`}
          confirmLabel={sending ? "Sending…" : `Send to ${audienceLabel}`}
          cancelLabel="Cancel"
          confirmVariant="primary"
        />

        {/* ── Platform AlertModal ── */}
        <AlertModal
          isOpen={!!notify}
          onClose={() => setNotify(null)}
          title={notify?.type === "error" ? "Something went wrong" : "Done"}
          subtitle={
            notify?.type === "error"
              ? "The action could not be completed."
              : "The action was completed successfully."
          }
          alerts={
            notify
              ? [
                  {
                    icon: notify.type === "error" ? AlertTriangle : CheckCircle,
                    label: notify.type === "error" ? "Error" : "Success",
                    description: notify.text,
                    variant: notify.type === "error" ? "red" : "green",
                  },
                ]
              : []
          }
        />
      </div>
    </AdminLayout>
  );
}
