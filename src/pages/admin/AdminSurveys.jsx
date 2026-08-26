// src/pages/admin/AdminSurveys.jsx

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminSurveys.module.css";

import {
  FiFileText,
  FiClock,
  FiCheckCircle,
  FiPhone,
  FiArchive,
  FiCalendar,
  FiSearch,
  FiX,
  FiEye,
  FiRefreshCw,
  FiDownload,
  FiUser,
  FiMail,
  FiMapPin,
  FiPhone as FiPhoneIcon,
  FiStar,
  FiMessageSquare,
  FiTag,
  FiArrowLeft,
  FiArrowRight,
} from "react-icons/fi";

import { FaStar, FaRegStar } from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  PENDING: "pending",
  REVIEWED: "reviewed",
  CONTACTED: "contacted",
  ARCHIVED: "archived",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  REVIEWED: "Reviewed",
  CONTACTED: "Contacted",
  ARCHIVED: "Archived",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "REVIEWED", label: "Reviewed" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "ARCHIVED", label: "Archived" },
];

const ROLE_LABELS = {
  hirer: "Hirer",
  worker: "Worker",
  both: "Both",
};

const ROLE_OPTIONS = [
  { value: "", label: "All Roles" },
  { value: "hirer", label: "Hirer" },
  { value: "worker", label: "Worker" },
  { value: "both", label: "Both" },
];

const INDUSTRY_LABELS = {
  plumbing: "Plumbing",
  electrical: "Electrical",
  carpentry: "Carpentry",
  cleaning: "Cleaning",
  hvac: "HVAC",
  painting: "Painting",
  office: "Office/Admin",
  other: "Other",
};

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncateText(text, max = 80) {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
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

function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>{Icon && <Icon size={16} />}</span>
      <div>
        <div className={styles.chipVal}>{value ?? "—"}</div>
        <div className={styles.chipLabel}>{label}</div>
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

// ─── Detail Modal ────────────────────────────────────────────────────────────

function DetailModal({ response, onClose }) {
  if (!response) return null;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Survey Response Details</p>
          <button className={styles.modalClose} onClick={onClose}>
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Header */}
          <div className={styles.detailHeader}>
            <div className={styles.detailUser}>
              <div className={styles.detailAvatar}>
                {response.name?.[0] || "?"}
              </div>
              <div>
                <p className={styles.detailName}>
                  {response.name || "Anonymous"}
                </p>
                <p className={styles.detailEmail}>
                  <FiMail size={12} /> {response.email}
                </p>
              </div>
            </div>
            <StatusBadge status={response.status} />
          </div>

          {/* Info grid */}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Role</span>
              <span className={styles.detailValue}>
                {ROLE_LABELS[response.role] || response.role}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Industry</span>
              <span className={styles.detailValue}>
                {INDUSTRY_LABELS[response.industry] || response.industry}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Experience</span>
              <span className={styles.detailValue}>{response.experience}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Rating</span>
              <span className={styles.detailValue}>
                {response.rating > 0
                  ? Array.from({ length: response.rating }, (_, i) => (
                      <FaStar key={i} size={14} color="#F59E0B" />
                    ))
                  : "Not rated"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Phone</span>
              <span className={styles.detailValue}>
                {response.phone || "Not provided"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Location</span>
              <span className={styles.detailValue}>
                {response.location || "Not provided"}
              </span>
            </div>
          </div>

          {/* Problem */}
          <div className={styles.detailSection}>
            <p className={styles.detailSectionLabel}>Biggest Challenge</p>
            <p className={styles.detailSectionText}>{response.problem}</p>
          </div>

          {/* Feature */}
          <div className={styles.detailSection}>
            <p className={styles.detailSectionLabel}>Desired Feature</p>
            <p className={styles.detailSectionText}>{response.feature}</p>
          </div>

          {/* Additional Feedback */}
          {response.additionalFeedback && (
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Additional Feedback</p>
              <p className={styles.detailSectionText}>
                {response.additionalFeedback}
              </p>
            </div>
          )}

          {/* Meta */}
          <div className={styles.detailMeta}>
            <span>
              <FiCalendar size={12} /> Submitted:{" "}
              {formatDate(response.createdAt)} at{" "}
              {formatTime(response.createdAt)}
            </span>
            {response.ipAddress && <span>IP: {response.ipAddress}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Status Change Modal ─────────────────────────────────────────────────────

function StatusModal({ response, onClose, onSaved }) {
  const [status, setStatus] = useState(response?.status || "PENDING");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!response) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await api.patch(`/survey/admin/responses/${response.id}/status`, {
        status,
        notes: notes.trim() || undefined,
      });
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

          <div className={styles.formField}>
            <label className={styles.formLabel}>Notes (optional)</label>
            <textarea
              className={styles.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes about this response..."
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

// ─── Response Card ────────────────────────────────────────────────────────────

function ResponseCard({ response, onView, onStatusChange }) {
  return (
    <div className={styles.responseCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardUser}>
          <div className={styles.cardAvatar}>{response.name?.[0] || "?"}</div>
          <div>
            <p className={styles.cardName}>{response.name || "Anonymous"}</p>
            <p className={styles.cardEmail}>
              <FiMail size={10} /> {response.email}
            </p>
          </div>
        </div>
        <StatusBadge status={response.status} />
      </div>

      <div className={styles.cardBody}>
        <p className={styles.cardProblem}>
          {truncateText(response.problem, 100)}
        </p>
        <p className={styles.cardFeature}>
          {truncateText(response.feature, 100)}
        </p>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.cardTags}>
          <span className={styles.tag}>
            <FiUser size={10} /> {ROLE_LABELS[response.role] || response.role}
          </span>
          <span className={styles.tag}>
            <FiTag size={10} />{" "}
            {INDUSTRY_LABELS[response.industry] || response.industry}
          </span>
          {response.rating > 0 && (
            <span className={styles.tag}>
              {Array.from({ length: response.rating }, (_, i) => (
                <FaStar key={i} size={10} color="#F59E0B" />
              ))}
            </span>
          )}
        </div>
        <div className={styles.cardActions}>
          <span className={styles.cardDate}>
            <FiCalendar size={10} /> {formatDate(response.createdAt)}
          </span>
          <button
            className={styles.viewBtn}
            onClick={() => onView(response)}
            title="View details"
          >
            <FiEye size={14} />
          </button>
          <button
            className={styles.statusBtn}
            onClick={() => onStatusChange(response)}
            title="Change status"
          >
            <FiRefreshCw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminSurveys() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const status = searchParams.get("status") || "";
  const role = searchParams.get("role") || "";

  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [detailModal, setDetailModal] = useState(null);
  const [statusModal, setStatusModal] = useState(null);
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

  // ── Fetch Stats ──
  const fetchStats = useCallback(() => {
    api
      .get("/survey/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Fetch Responses ──
  const fetchResponses = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 24 };
    if (search) params.search = search;
    if (status) params.status = status;
    if (role) params.role = role;

    api
      .get("/survey/admin/responses", { params })
      .then((r) => {
        const d = r.data.data;
        setResponses(d.responses || []);
        setTotal(d.pagination?.total || 0);
        setPages(d.pagination?.pages || 1);
      })
      .catch(() => showToast("Failed to load responses", "error"))
      .finally(() => setLoading(false));
  }, [search, page, status, role]);

  useEffect(() => {
    fetchResponses();
  }, [fetchResponses]);

  // ── Export CSV ──
  async function handleExportCSV() {
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (role) params.set("role", role);

      const response = await api.get(
        `/survey/admin/export/csv?${params.toString()}`,
        {
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `survey-responses-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast("CSV exported successfully");
    } catch (error) {
      showToast("Failed to export CSV", "error");
    }
  }

  // ── Render ──

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Feedback</p>
            <h1 className={styles.pageTitle}>
              Survey Responses
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
          <button className={styles.primaryBtn} onClick={handleExportCSV}>
            <FiDownload size={16} /> Export CSV
          </button>
        </div>

        {/* ── Stats Bar ── */}
        {stats && (
          <div className={styles.statsBar}>
            <StatChip icon={FiFileText} label="Total" value={stats.total} />
            <StatChip
              icon={FiClock}
              label="Pending"
              value={stats.pending}
              accent="orange"
            />
            <StatChip
              icon={FiCheckCircle}
              label="Reviewed"
              value={stats.reviewed}
              accent="green"
            />
            <StatChip
              icon={FiPhone}
              label="Contacted"
              value={stats.contacted}
              accent="blue"
            />
            <StatChip
              icon={FiArchive}
              label="Archived"
              value={stats.archived}
              accent="gray"
            />
            <StatChip icon={FiCalendar} label="Today" value={stats.today} />
          </div>
        )}

        {/* ── Filters ── */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <FiSearch size={14} />
            </span>
            <input
              className={styles.searchInput}
              placeholder="Search by name, email, or phone…"
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
              value={role}
              onChange={(e) => setParam("role", e.target.value)}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <span className={styles.totalPill}>{total} responses</span>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className={styles.responseGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : responses.length === 0 ? (
          <div className={styles.empty}>
            <FiFileText size={48} opacity={0.4} />
            <p>
              {search || status || role
                ? "No responses match your filters"
                : "No survey responses yet"}
            </p>
          </div>
        ) : (
          <div className={styles.responseGrid}>
            {responses.map((r) => (
              <ResponseCard
                key={r.id}
                response={r}
                onView={setDetailModal}
                onStatusChange={setStatusModal}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
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

        {/* ── Detail Modal ── */}
        {detailModal && (
          <DetailModal
            response={detailModal}
            onClose={() => setDetailModal(null)}
          />
        )}

        {/* ── Status Modal ── */}
        {statusModal && (
          <StatusModal
            response={statusModal}
            onClose={() => setStatusModal(null)}
            onSaved={(msg) => {
              showToast(msg);
              fetchResponses();
              fetchStats();
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
