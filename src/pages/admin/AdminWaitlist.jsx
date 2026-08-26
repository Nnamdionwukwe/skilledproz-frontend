// src/pages/admin/AdminWaitlist.jsx
// Complete Admin Waitlist Management with Email Broadcast

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminWaitlist.module.css";

import {
  FiUsers,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiSearch,
  FiX,
  FiEye,
  FiRefreshCw,
  FiDownload,
  FiMail,
  FiArrowLeft,
  FiArrowRight,
  FiMapPin,
  FiGlobe,
  FiSmartphone,
  FiMonitor,
  FiTablet,
  FiAward,
  FiGift,
  FiZap,
  FiTrash2,
  FiAlertTriangle,
  FiSend,
  FiEdit3,
  FiPlus,
  FiList,
  FiFileText,
  FiInbox,
  FiTrendingUp,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  EXPIRED: "expired",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  EXPIRED: "Expired",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "EXPIRED", label: "Expired" },
];

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date) {
  if (!date) return "—";
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDeviceIcon(deviceType) {
  switch (deviceType?.toLowerCase()) {
    case "mobile":
      return <FiSmartphone size={14} />;
    case "tablet":
      return <FiTablet size={14} />;
    case "desktop":
      return <FiMonitor size={14} />;
    default:
      return <FiMonitor size={14} />;
  }
}

function getCountryFlag(country) {
  if (!country) return null;
  const flags = {
    NG: "🇳🇬",
    US: "🇺🇸",
    GB: "🇬🇧",
    CA: "🇨🇦",
    AU: "🇦🇺",
    DE: "🇩🇪",
    FR: "🇫🇷",
    IT: "🇮🇹",
    ES: "🇪🇸",
    PT: "🇵🇹",
    BR: "🇧🇷",
    IN: "🇮🇳",
    CN: "🇨🇳",
    JP: "🇯🇵",
    KE: "🇰🇪",
    GH: "🇬🇭",
    ZA: "🇿🇦",
    EG: "🇪🇬",
    MA: "🇲🇦",
  };
  return flags[country.toUpperCase()] || "🌍";
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon: Icon, label, value, accent, subtext }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>{Icon && <Icon size={16} />}</span>
      <div>
        <div className={styles.chipVal}>{value ?? "—"}</div>
        <div className={styles.chipLabel}>{label}</div>
        {subtext && <div className={styles.chipSubtext}>{subtext}</div>}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  return (
    <span
      className={`${styles.statusBadge} ${styles[STATUS_COLORS[status] || "pending"]}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Email Broadcast Modal ──────────────────────────────────────────────────

function BroadcastModal({ onClose, onSent }) {
  const [form, setForm] = useState({
    subject: "",
    content: "",
    type: "BROADCAST",
    targetStatus: "CONFIRMED",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);

  const PRESET_TEMPLATES = {
    launch: {
      subject: "🚀 SkilledProz is LIVE! Your Early Adopter Benefits Await",
      content: `
        <h2>Hello {{name}},</h2>
        <p>🚀 <strong>SkilledProz is officially LIVE!</strong></p>
        <p>As an early adopter, you get:</p>
        <ul>
          <li>✅ Free lifetime registration</li>
          <li>💰 ₦5,000 credit (hirers) / Premium badge (workers)</li>
          <li>♾️ 0% commission forever</li>
          <li>⭐ VIP support priority</li>
        </ul>
        <p><a href="https://skilledproz.com">👉 Claim Your Benefits Now</a></p>
      `,
    },
    countdown: {
      subject: "⏳ Only 7 Days Until SkilledProz Launch!",
      content: `
        <h2>Hello {{name}},</h2>
        <p>The countdown is on! <strong>SkilledProz launches in just 7 days.</strong></p>
        <p>Here's what to expect:</p>
        <ul>
          <li>🎯 Instant access to top workers</li>
          <li>💰 Early adopter bonuses ready to claim</li>
          <li>⭐ Your VIP support is waiting</li>
        </ul>
        <p>Get ready to experience the future of work!</p>
      `,
    },
    share_earn: {
      subject: "💰 Share SkilledProz & Earn ₦2,000 per Friend!",
      content: `
        <h2>Hello {{name}},</h2>
        <p>Did you know you can <strong>earn ₦2,000</strong> for every friend you invite?</p>
        <p>Your referral code: <strong>{{referralCode}}</strong></p>
        <p>When your friend joins, you both get ₦2,000 in platform credit!</p>
        <p>Share now and build your network.</p>
      `,
    },
    welcome: {
      subject: "🎉 Welcome to SkilledProz! Your Benefits Are Ready",
      content: `
        <h2>Hello {{name}},</h2>
        <p>Welcome to the <strong>SkilledProz</strong> early adopter community! 🚀</p>
        <p>You've unlocked:</p>
        <ul>
          <li>✅ Early Access to the platform</li>
          <li>💰 ₦5,000 credit / Premium badge</li>
          <li>♾️ 0% commission for life</li>
          <li>⭐ VIP support</li>
        </ul>
        <p>We're building something extraordinary, and you're part of it from day one.</p>
      `,
    },
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.subject || !form.content) {
      setError("Subject and content are required");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await api.post("/waitlist/admin/broadcast", form);
      onSent("Broadcast sent successfully!");
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send broadcast");
    } finally {
      setSubmitting(false);
    }
  }

  function applyTemplate(template) {
    setForm({
      ...form,
      subject: PRESET_TEMPLATES[template].subject,
      content: PRESET_TEMPLATES[template].content,
    });
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalLarge}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>
            <FiSend size={18} /> Email Broadcast
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <form onSubmit={handleSubmit}>
            {/* Preset Templates */}
            <div className={styles.templateSection}>
              <label className={styles.formLabel}>Quick Templates</label>
              <div className={styles.templateButtons}>
                <button type="button" onClick={() => applyTemplate("welcome")}>
                  <FiGift /> Welcome
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("countdown")}
                >
                  <FiClock /> Countdown
                </button>
                <button type="button" onClick={() => applyTemplate("launch")}>
                  <FiZap /> Launch
                </button>
                <button
                  type="button"
                  onClick={() => applyTemplate("share_earn")}
                >
                  <FiTrendingUp /> Share & Earn
                </button>
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Subject *</label>
              <input
                type="text"
                className={styles.input}
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject line..."
                required
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Content *</label>
              <div className={styles.contentHint}>
                <small>
                  Use <strong>{`{{name}}`}</strong> to personalize with the
                  recipient's name
                </small>
              </div>
              <textarea
                className={`${styles.textarea} ${styles.textareaLarge}`}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Write your email content here... Use {{name}} for personalization"
                rows={10}
                required
              />
            </div>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.formLabel}>Email Type</label>
                <select
                  className={styles.select}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  <option value="BROADCAST">General Broadcast</option>
                  <option value="LAUNCH_ANNOUNCEMENT">
                    Launch Announcement
                  </option>
                  <option value="BENEFIT_UNLOCKED">Benefit Unlocked</option>
                </select>
              </div>

              <div className={styles.formField}>
                <label className={styles.formLabel}>Target Audience</label>
                <select
                  className={styles.select}
                  value={form.targetStatus}
                  onChange={(e) =>
                    setForm({ ...form, targetStatus: e.target.value })
                  }
                >
                  <option value="CONFIRMED">Confirmed Users</option>
                  <option value="PENDING">Pending Users</option>
                  <option value="ALL">All Users</option>
                </select>
              </div>
            </div>

            {error && <div className={styles.inlineError}>⚠️ {error}</div>}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className={styles.spinner} /> Sending…
                  </>
                ) : (
                  <>
                    <FiSend size={16} /> Send Broadcast
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirmation Modal ──────────────────────────────────────────────

function DeleteModal({ entry, onClose, onConfirm, loading }) {
  if (!entry) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle} style={{ color: "var(--red)" }}>
            <FiAlertTriangle size={18} /> Delete Entry
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.deletePreview}>
            <div className={styles.deleteIconWrapper}>
              <FiMail size={28} />
            </div>
            <div>
              <p className={styles.deleteEmail}>{entry.email}</p>
              {entry.name && <p className={styles.deleteName}>{entry.name}</p>}
              <p className={styles.deleteStatus}>
                Status: <StatusBadge status={entry.status} />
              </p>
              <p className={styles.deleteDate}>
                Joined: {formatDate(entry.createdAt)}
              </p>
            </div>
          </div>

          <div className={styles.deleteWarning}>
            <FiAlertTriangle size={18} />
            <span>
              This action <strong>cannot be undone</strong>. This will
              permanently delete this waitlist entry.
            </span>
          </div>

          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.modalDelete}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className={styles.spinner} /> Deleting…
                </>
              ) : (
                <>
                  <FiTrash2 size={14} /> Delete Entry
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({ entry, onClose }) {
  if (!entry) return null;

  const benefitLabels = {
    EARLY_ACCESS: { icon: <FiZap />, label: "Early Access", color: "#F59E0B" },
    EXCLUSIVE_BONUS: {
      icon: <FiGift />,
      label: "Exclusive Bonus",
      color: "#10B981",
    },
    LIFETIME_BENEFITS: {
      icon: <FiAward />,
      label: "Lifetime Benefits",
      color: "#8B5CF6",
    },
    VIP_SUPPORT: {
      icon: <FiCheckCircle />,
      label: "VIP Support",
      color: "#3B82F6",
    },
  };

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Waitlist Entry Details</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailHeader}>
            <div className={styles.detailUser}>
              <div className={styles.detailAvatar}>
                {entry.email?.[0]?.toUpperCase() || "?"}
              </div>
              <div>
                <p className={styles.detailEmail}>
                  <FiMail size={12} /> {entry.email}
                </p>
                {entry.name && (
                  <p className={styles.detailName}>{entry.name}</p>
                )}
              </div>
            </div>
            <StatusBadge status={entry.status} />
          </div>

          {(entry.country || entry.region || entry.city) && (
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>
                <FiGlobe size={12} /> Location
              </p>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Country</span>
                  <span className={styles.detailValue}>
                    {getCountryFlag(entry.country)} {entry.country || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Region/State</span>
                  <span className={styles.detailValue}>
                    {entry.region || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>City</span>
                  <span className={styles.detailValue}>
                    {entry.city || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Timezone</span>
                  <span className={styles.detailValue}>
                    {entry.timezone || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {(entry.deviceType || entry.osName || entry.browserName) && (
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>
                {getDeviceIcon(entry.deviceType)} Device Information
              </p>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Device Type</span>
                  <span className={styles.detailValue}>
                    {getDeviceIcon(entry.deviceType)} {entry.deviceType || "—"}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>OS</span>
                  <span className={styles.detailValue}>
                    {entry.osName || "—"} {entry.osVersion || ""}
                  </span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Browser</span>
                  <span className={styles.detailValue}>
                    {entry.browserName || "—"} {entry.browserVersion || ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          {entry.unlockedBenefits && entry.unlockedBenefits.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>
                <FiAward size={12} /> Unlocked Benefits
              </p>
              <div className={styles.benefitsList}>
                {entry.unlockedBenefits.map((benefit) => {
                  const info = benefitLabels[benefit] || {
                    label: benefit,
                    color: "#6B7280",
                  };
                  return (
                    <span
                      key={benefit}
                      className={styles.benefitTag}
                      style={{ borderColor: info.color, color: info.color }}
                    >
                      {info.icon} {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.detailMeta}>
            <span>
              <FiCalendar size={12} /> Joined: {formatDate(entry.createdAt)} at{" "}
              {formatTime(entry.createdAt)}
            </span>
            {entry.confirmedAt && (
              <span>
                <FiCheckCircle size={12} /> Confirmed:{" "}
                {formatDate(entry.confirmedAt)}
              </span>
            )}
            {entry.ipAddress && <span>📡 IP: {entry.ipAddress}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Modal ─────────────────────────────────────────────────────

function StatusModal({ entry, onClose, onSaved }) {
  const [status, setStatus] = useState(entry?.status || "PENDING");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!entry) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/waitlist/admin/entries/${entry.id}/status`, { status });
      onSaved(`Status updated to ${STATUS_LABELS[status]}`);
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Update Status</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Status</label>
            <select
              className={styles.select}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.filter((o) => o.value).map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <div className={styles.inlineError}>⚠️ {error}</div>}

          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.modalCancel}
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className={styles.spinner} /> Saving…
                </>
              ) : (
                "Update Status"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Entry Card ──────────────────────────────────────────────────────────────

function EntryCard({ entry, onView, onStatusChange, onDelete }) {
  return (
    <div className={styles.entryCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardUser}>
          <div className={styles.cardAvatar}>
            {entry.email?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <p className={styles.cardEmail}>
              <FiMail size={10} /> {entry.email}
            </p>
            {entry.name && <p className={styles.cardName}>{entry.name}</p>}
          </div>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <div className={styles.cardBody}>
        {(entry.country || entry.city) && (
          <p className={styles.cardLocation}>
            <FiMapPin size={10} /> {getCountryFlag(entry.country)}{" "}
            {entry.city || entry.country || "—"}
          </p>
        )}
        <div className={styles.cardMeta}>
          {entry.deviceType && (
            <span className={styles.metaItem}>
              {getDeviceIcon(entry.deviceType)} {entry.deviceType}
            </span>
          )}
          {entry.osName && (
            <span className={styles.metaItem}>{entry.osName}</span>
          )}
          {entry.unlockedBenefits && entry.unlockedBenefits.length > 0 && (
            <span className={styles.metaItem}>
              <FiAward size={10} /> {entry.unlockedBenefits.length} benefits
            </span>
          )}
        </div>
      </div>

      <div className={styles.cardFooter}>
        <span className={styles.cardDate}>
          <FiCalendar size={10} /> {formatDate(entry.createdAt)}
        </span>
        <div className={styles.cardActions}>
          <button
            className={styles.viewBtn}
            onClick={() => onView(entry)}
            title="View details"
          >
            <FiEye size={14} />
          </button>
          <button
            className={styles.statusBtn}
            onClick={() => onStatusChange(entry)}
            title="Change status"
          >
            <FiRefreshCw size={14} />
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(entry)}
            title="Delete entry"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminWaitlist() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";

  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [detailModal, setDetailModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  const fetchStats = useCallback(() => {
    api
      .get("/waitlist/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchEntries = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 24 };
    if (search) params.search = search;
    if (status) params.status = status;

    api
      .get("/waitlist/admin/entries", { params })
      .then((r) => {
        const d = r.data.data;
        setEntries(d.entries || []);
        setTotal(d.pagination?.total || 0);
        setPages(d.pagination?.pages || 1);
      })
      .catch(() => showToast("Failed to load entries", "error"))
      .finally(() => setLoading(false));
  }, [search, page, status]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await api.delete(`/waitlist/admin/entries/${deleteModal.id}`);
      showToast(`✅ Deleted: ${deleteModal.email}`, "success");
      setDeleteModal(null);
      fetchEntries();
      fetchStats();
    } catch (error) {
      showToast("Failed to delete entry", "error");
    } finally {
      setDeleting(false);
    }
  };

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);

      const response = await api.get(
        `/waitlist/admin/export/csv?${params.toString()}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `waitlist-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("CSV exported successfully");
    } catch (error) {
      showToast("Failed to export CSV", "error");
    }
  }

  const handleLaunchAnnouncement = async () => {
    if (!confirm("Send launch announcement to all confirmed waitlist users?"))
      return;
    try {
      await api.post("/waitlist/admin/launch");
      showToast("🚀 Launch announcement sent successfully!", "success");
    } catch (error) {
      showToast("Failed to send launch announcement", "error");
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Waitlist</p>
            <h1 className={styles.pageTitle}>
              Waitlist Management
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <button
              className={styles.primaryBtn}
              onClick={() => setBroadcastModal(true)}
            >
              <FiSend size={16} /> Broadcast
            </button>
            <button
              className={styles.primaryBtn}
              onClick={handleLaunchAnnouncement}
            >
              <FiZap size={16} /> Launch
            </button>
            <button className={styles.primaryBtn} onClick={handleExportCSV}>
              <FiDownload size={16} /> Export CSV
            </button>
          </div>
        </div>

        {stats && (
          <div className={styles.statsBar}>
            <StatChip icon={FiUsers} label="Total" value={stats.total} />
            <StatChip
              icon={FiClock}
              label="Pending"
              value={stats.pending}
              accent="orange"
            />
            <StatChip
              icon={FiCheckCircle}
              label="Confirmed"
              value={stats.confirmed}
              accent="green"
            />
            <StatChip
              icon={FiXCircle}
              label="Expired"
              value={stats.expired}
              accent="gray"
            />
            <StatChip icon={FiCalendar} label="Today" value={stats.today} />
            {stats.topCountries && stats.topCountries.length > 0 && (
              <StatChip
                icon={FiGlobe}
                label="Top Country"
                value={stats.topCountries[0]?.country || "—"}
                subtext={`${stats.topCountries[0]?.count || 0} signups`}
              />
            )}
          </div>
        )}

        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <FiSearch size={14} />
            </span>
            <input
              className={styles.searchInput}
              placeholder="Search by email or name…"
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
            />
            {search && (
              <button
                className={styles.clearBtn}
                onClick={() => setParam("search", "")}
              >
                <FiX size={14} />
              </button>
            )}
          </div>
          <div className={styles.filterGroup}>
            <select
              className={styles.filterSelect}
              value={status}
              onChange={(e) => setParam("status", e.target.value)}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <span className={styles.totalPill}>{total} entries</span>
        </div>

        {loading ? (
          <div className={styles.entryGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <FiMail size={48} opacity={0.4} />
            <p>
              {search || status
                ? "No entries match your filters"
                : "No waitlist entries yet"}
            </p>
          </div>
        ) : (
          <div className={styles.entryGrid}>
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onView={setDetailModal}
                onStatusChange={setStatusModal}
                onDelete={setDeleteModal}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              <FiArrowLeft size={14} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <FiArrowRight size={14} />
            </button>
          </div>
        )}

        {detailModal && (
          <DetailModal
            entry={detailModal}
            onClose={() => setDetailModal(null)}
          />
        )}
        {statusModal && (
          <StatusModal
            entry={statusModal}
            onClose={() => setStatusModal(null)}
            onSaved={(msg) => {
              showToast(msg);
              fetchEntries();
              fetchStats();
            }}
          />
        )}
        {deleteModal && (
          <DeleteModal
            entry={deleteModal}
            onClose={() => setDeleteModal(null)}
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
        {broadcastModal && (
          <BroadcastModal
            onClose={() => setBroadcastModal(false)}
            onSent={(msg) => {
              showToast(msg);
              fetchStats();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
