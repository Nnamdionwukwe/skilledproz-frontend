// src/pages/admin/AdminFeedback.jsx
// Complete Admin Feedback Management

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminFeedback.module.css";

import {
  FiMessageSquare,
  FiStar,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiEye,
  FiFilter,
  FiSearch,
  FiDownload,
  FiTrash2,
  FiArrowLeft,
  FiArrowRight,
  FiSend,
  FiEdit3,
  FiPlus,
  FiList,
  FiFileText,
  FiInbox,
  FiTrendingUp,
  FiAlertTriangle,
  FiRefreshCw,
  FiX,
  FiCalendar,
  FiUser,
  FiMail,
  FiTag,
  FiGlobe,
  FiLink,
} from "react-icons/fi";

// ─── Constants ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  praise: { label: "Praise", icon: "🌟", color: "#10B981" },
  suggestion: { label: "Suggestion", icon: "💡", color: "#F59E0B" },
  bug: { label: "Bug Report", icon: "🐛", color: "#EF4444" },
  feature: { label: "Feature Request", icon: "❤️", color: "#8B5CF6" },
  general: { label: "General", icon: "💬", color: "#3B82F6" },
};

const STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "#F59E0B", icon: <FiClock size={14} /> },
  REVIEWED: { label: "Reviewed", color: "#3B82F6", icon: <FiEye size={14} /> },
  RESOLVED: {
    label: "Resolved",
    color: "#10B981",
    icon: <FiCheckCircle size={14} />,
  },
  DISMISSED: {
    label: "Dismissed",
    color: "#6B7280",
    icon: <FiXCircle size={14} />,
  },
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "DISMISSED", label: "Dismissed" },
];

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "praise", label: "Praise" },
  { value: "suggestion", label: "Suggestion" },
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "general", label: "General" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function getStars(rating) {
  return "⭐".repeat(rating) + "☆".repeat(5 - rating);
}

// ─── Toast ──────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, subtitle }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardIcon} style={{ color }}>
        <Icon size={20} />
      </div>
      <div>
        <div className={styles.statCardValue}>{value ?? "—"}</div>
        <div className={styles.statCardLabel}>{label}</div>
        {subtitle && <div className={styles.statCardSubtitle}>{subtitle}</div>}
      </div>
    </div>
  );
}

// ─── Status Badge ────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span
      className={styles.statusBadge}
      style={{ background: `${config.color}15`, color: config.color }}
    >
      {config.icon} {config.label}
    </span>
  );
}

// ─── Type Badge ─────────────────────────────────────────────────────────────

function TypeBadge({ type }) {
  const config = TYPE_CONFIG[type] || TYPE_CONFIG.general;
  return (
    <span
      className={styles.typeBadge}
      style={{ background: `${config.color}15`, color: config.color }}
    >
      {config.icon} {config.label}
    </span>
  );
}

// ─── Rating Stars ────────────────────────────────────────────────────────────

function RatingStars({ rating }) {
  return (
    <span className={styles.ratingStars}>
      {getStars(rating)}
      <span className={styles.ratingNumber}>{rating}</span>
    </span>
  );
}

// ─── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({ feedback, onClose }) {
  if (!feedback) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Feedback Details</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.detailHeader}>
            <div>
              <div className={styles.detailTitle}>{feedback.title}</div>
              <div className={styles.detailMeta}>
                <TypeBadge type={feedback.type} />
                <RatingStars rating={feedback.rating} />
                <StatusBadge status={feedback.status} />
              </div>
            </div>
            <div className={styles.detailDate}>
              {formatDate(feedback.createdAt)} at{" "}
              {formatTime(feedback.createdAt)}
            </div>
          </div>

          <div className={styles.detailDescription}>
            <p>{feedback.description}</p>
          </div>

          {(feedback.name || feedback.email) && (
            <div className={styles.detailContact}>
              <p className={styles.detailSectionLabel}>Contact Information</p>
              <div className={styles.detailGrid}>
                {feedback.name && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>
                      <FiUser size={12} /> Name
                    </span>
                    <span className={styles.detailValue}>{feedback.name}</span>
                  </div>
                )}
                {feedback.email && (
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>
                      <FiMail size={12} /> Email
                    </span>
                    <span className={styles.detailValue}>{feedback.email}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {feedback.tags && feedback.tags.length > 0 && (
            <div className={styles.detailTags}>
              <p className={styles.detailSectionLabel}>
                <FiTag size={12} /> Tags
              </p>
              <div className={styles.tagsList}>
                {feedback.tags.map((tag) => (
                  <span key={tag} className={styles.tagItem}>
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {feedback.screenUrl && (
            <div className={styles.detailUrl}>
              <p className={styles.detailSectionLabel}>
                <FiLink size={12} /> Page URL
              </p>
              <a
                href={feedback.screenUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {feedback.screenUrl}
              </a>
            </div>
          )}

          {feedback.adminNotes && (
            <div className={styles.detailNotes}>
              <p className={styles.detailSectionLabel}>Admin Notes</p>
              <div className={styles.adminNotes}>{feedback.adminNotes}</div>
            </div>
          )}

          <div className={styles.detailFooter}>
            <span>
              <FiCalendar size={12} /> Submitted:{" "}
              {formatDate(feedback.submittedAt)}
            </span>
            {feedback.ipAddress && (
              <span>
                <FiGlobe size={12} /> IP: {feedback.ipAddress}
              </span>
            )}
            {feedback.userAgent && (
              <span className={styles.userAgent}>
                {feedback.userAgent.substring(0, 60)}...
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Update Modal ────────────────────────────────────────────────────

function StatusModal({ feedback, onClose, onSaved }) {
  const [status, setStatus] = useState(feedback?.status || "PENDING");
  const [adminNotes, setAdminNotes] = useState(feedback?.adminNotes || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!feedback) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/feedback/admin/${feedback.id}/status`, {
        status,
        adminNotes,
      });
      onSaved(`Status updated to ${STATUS_CONFIG[status].label}`);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Update Feedback Status</p>
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

          <div className={styles.formField}>
            <label className={styles.formLabel}>Admin Notes</label>
            <textarea
              className={styles.textarea}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this feedback..."
              rows={3}
            />
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

// ─── Delete Modal ───────────────────────────────────────────────────────────

function DeleteModal({ feedback, onClose, onConfirm, loading }) {
  if (!feedback) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle} style={{ color: "var(--red)" }}>
            <FiAlertTriangle size={18} /> Delete Feedback
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.deletePreview}>
            <div className={styles.deleteIconWrapper}>
              <FiMessageSquare size={28} />
            </div>
            <div>
              <p className={styles.deleteTitle}>{feedback.title}</p>
              <p className={styles.deleteType}>
                <TypeBadge type={feedback.type} />
              </p>
              <p className={styles.deleteDate}>
                Submitted: {formatDate(feedback.createdAt)}
              </p>
            </div>
          </div>

          <div className={styles.deleteWarning}>
            <FiAlertTriangle size={18} />
            <span>
              This action <strong>cannot be undone</strong>. This will
              permanently delete this feedback.
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
                  <FiTrash2 size={14} /> Delete Feedback
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feedback Card ──────────────────────────────────────────────────────────

function FeedbackCard({ feedback, onView, onStatusChange, onDelete }) {
  return (
    <div className={styles.feedbackCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardTitle}>
          <h4>{feedback.title}</h4>
          <div className={styles.cardBadges}>
            <TypeBadge type={feedback.type} />
            <RatingStars rating={feedback.rating} />
          </div>
        </div>
        <StatusBadge status={feedback.status} />
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardDescription}>
          {feedback.description.length > 120
            ? `${feedback.description.substring(0, 120)}...`
            : feedback.description}
        </p>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.cardMeta}>
          {feedback.name && (
            <span className={styles.metaItem}>
              <FiUser size={10} /> {feedback.name}
            </span>
          )}
          {feedback.email && (
            <span className={styles.metaItem}>
              <FiMail size={10} /> {feedback.email}
            </span>
          )}
          {feedback.tags && feedback.tags.length > 0 && (
            <span className={styles.metaItem}>
              <FiTag size={10} /> {feedback.tags.slice(0, 2).join(", ")}
              {feedback.tags.length > 2 && ` +${feedback.tags.length - 2}`}
            </span>
          )}
        </div>
        <div className={styles.cardActions}>
          <span className={styles.cardDate}>
            <FiCalendar size={10} /> {formatDate(feedback.createdAt)}
          </span>
          <button
            className={styles.viewBtn}
            onClick={() => onView(feedback)}
            title="View details"
          >
            <FiEye size={14} />
          </button>
          <button
            className={styles.statusBtn}
            onClick={() => onStatusChange(feedback)}
            title="Change status"
          >
            <FiRefreshCw size={14} />
          </button>
          <button
            className={styles.deleteBtn}
            onClick={() => onDelete(feedback)}
            title="Delete feedback"
          >
            <FiTrash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminFeedback() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";
  const type = searchParams.get("type") || "";
  const rating = searchParams.get("rating") || "";

  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [detailModal, setDetailModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
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
      .get("/feedback/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchFeedback = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (type) params.type = type;
    if (rating) params.rating = rating;

    api
      .get("/feedback/admin", { params })
      .then((r) => {
        const d = r.data.data;
        setFeedback(d.feedback || []);
        setTotal(d.pagination?.total || 0);
        setPages(d.pagination?.pages || 1);
        if (d.stats) setStats(d.stats);
      })
      .catch(() => showToast("Failed to load feedback", "error"))
      .finally(() => setLoading(false));
  }, [search, page, status, type, rating]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  const handleDelete = async () => {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      await api.delete(`/feedback/admin/${deleteModal.id}`);
      showToast(`✅ Deleted: ${deleteModal.title}`, "success");
      setDeleteModal(null);
      fetchFeedback();
      fetchStats();
    } catch (error) {
      showToast("Failed to delete feedback", "error");
    } finally {
      setDeleting(false);
    }
  };

  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (type) params.set("type", type);
      if (rating) params.set("rating", rating);
      if (search) params.set("search", search);

      const response = await api.get(
        `/feedback/admin/export/csv?${params.toString()}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `feedback-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("CSV exported successfully");
    } catch (error) {
      showToast("Failed to export CSV", "error");
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Feedback</p>
            <h1 className={styles.pageTitle}>
              Feedback Management
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.primaryBtn} onClick={handleExportCSV}>
              <FiDownload size={16} /> Export CSV
            </button>
          </div>
        </div>

        {stats && (
          <div className={styles.statsBar}>
            <StatCard
              icon={FiInbox}
              label="Total"
              value={stats.total}
              color="#6B7280"
            />
            <StatCard
              icon={FiClock}
              label="Pending"
              value={stats.pending}
              color="#F59E0B"
            />
            <StatCard
              icon={FiEye}
              label="Reviewed"
              value={stats.reviewed}
              color="#3B82F6"
            />
            <StatCard
              icon={FiCheckCircle}
              label="Resolved"
              value={stats.resolved}
              color="#10B981"
            />
            <StatCard
              icon={FiStar}
              label="Avg Rating"
              value={stats.avgRating?.toFixed(1) || "—"}
              color="#F59E0B"
              subtitle={`${stats.ratingDistribution?.[5] || 0} five-star`}
            />
          </div>
        )}

        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <FiSearch size={14} />
            </span>
            <input
              className={styles.searchInput}
              placeholder="Search by title, description, email, or name…"
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
            <select
              className={styles.filterSelect}
              value={type}
              onChange={(e) => setParam("type", e.target.value)}
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <select
              className={styles.filterSelect}
              value={rating}
              onChange={(e) => setParam("rating", e.target.value)}
            >
              <option value="">All Ratings</option>
              <option value="5">5 ⭐</option>
              <option value="4">4 ⭐</option>
              <option value="3">3 ⭐</option>
              <option value="2">2 ⭐</option>
              <option value="1">1 ⭐</option>
            </select>
          </div>
          <span className={styles.totalPill}>{total} entries</span>
        </div>

        {loading ? (
          <div className={styles.feedbackGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : feedback.length === 0 ? (
          <div className={styles.empty}>
            <FiMessageSquare size={48} opacity={0.4} />
            <p>
              {search || status || type || rating
                ? "No feedback matches your filters"
                : "No feedback yet"}
            </p>
          </div>
        ) : (
          <div className={styles.feedbackGrid}>
            {feedback.map((item) => (
              <FeedbackCard
                key={item.id}
                feedback={item}
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
            feedback={detailModal}
            onClose={() => setDetailModal(null)}
          />
        )}
        {statusModal && (
          <StatusModal
            feedback={statusModal}
            onClose={() => setStatusModal(null)}
            onSaved={(msg) => {
              showToast(msg);
              fetchFeedback();
              fetchStats();
            }}
          />
        )}
        {deleteModal && (
          <DeleteModal
            feedback={deleteModal}
            onClose={() => setDeleteModal(null)}
            onConfirm={handleDelete}
            loading={deleting}
          />
        )}
      </div>
    </AdminLayout>
  );
}
