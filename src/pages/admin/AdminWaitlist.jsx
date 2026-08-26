// src/pages/admin/AdminWaitlist.jsx

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
  FiUser,
  FiTag,
  FiArrowLeft,
  FiArrowRight,
  FiAward,
  FiGift,
  FiCopy,
  FiCheck,
  FiLink,
  FiShare2,
  FiTrendingUp,
  FiUserCheck,
  FiUserPlus,
  FiDollarSign,
  FiPackage,
} from "react-icons/fi";

import { FaWhatsapp, FaTwitter, FaFacebook } from "react-icons/fa";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  REWARDED: "rewarded",
  EXPIRED: "expired",
};

const STATUS_LABELS = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  REWARDED: "Rewarded",
  EXPIRED: "Expired",
};

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "REWARDED", label: "Rewarded" },
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

function truncateText(text, max = 30) {
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

function DetailModal({ entry, onClose }) {
  if (!entry) return null;

  const referralCount = entry._count?.referredEntries || 0;

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
          {/* Header */}
          <div className={styles.detailHeader}>
            <div className={styles.detailUser}>
              <div className={styles.detailAvatar}>
                {entry.name?.[0] || entry.email?.[0] || "?"}
              </div>
              <div>
                <p className={styles.detailName}>{entry.name || "Anonymous"}</p>
                <p className={styles.detailEmail}>
                  <FiMail size={12} /> {entry.email}
                </p>
              </div>
            </div>
            <StatusBadge status={entry.status} />
          </div>

          {/* Info grid */}
          <div className={styles.detailGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Referral Code</span>
              <span className={styles.detailValue}>
                <FiTag size={12} /> {entry.referralCode || "—"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Total Referrals</span>
              <span className={styles.detailValue}>
                <FiUsers size={12} /> {referralCount}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Referred By</span>
              <span className={styles.detailValue}>
                {entry.referredByEntry?.email || "Direct Signup"}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Bonuses</span>
              <span className={styles.detailValue}>
                <FiGift size={12} /> {entry.bonuses?.length || 0} bonuses
              </span>
            </div>
          </div>

          {/* Bonuses List */}
          {entry.bonuses && entry.bonuses.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Bonuses</p>
              <div className={styles.bonusesList}>
                {entry.bonuses.map((bonus) => (
                  <div key={bonus.id} className={styles.bonusItem}>
                    <span className={styles.bonusType}>
                      {bonus.type === "SIGNUP" && <FiUserPlus size={12} />}
                      {bonus.type === "REFERRAL" && <FiShare2 size={12} />}
                      {bonus.type === "SOCIAL" && <FiTrendingUp size={12} />}
                      {bonus.type === "EARLY_BIRD" && <FiAward size={12} />}
                      {bonus.type}
                    </span>
                    <span className={styles.bonusAmount}>
                      <FiDollarSign size={10} /> {bonus.amount}
                    </span>
                    <StatusBadge status={bonus.status} />
                    {bonus.description && (
                      <span className={styles.bonusDesc}>
                        {bonus.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Referrals List */}
          {entry.referredEntries && entry.referredEntries.length > 0 && (
            <div className={styles.detailSection}>
              <p className={styles.detailSectionLabel}>Referred Users</p>
              <div className={styles.referralsList}>
                {entry.referredEntries.map((ref) => (
                  <div key={ref.referred.id} className={styles.referralItem}>
                    <span className={styles.referralEmail}>
                      {ref.referred.email}
                    </span>
                    <StatusBadge status={ref.status} />
                    <span className={styles.referralDate}>
                      {formatDate(ref.referred.confirmedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
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
            {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
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

function EntryCard({ entry, onView, onStatusChange }) {
  const referralCount = entry._count?.referredEntries || 0;

  return (
    <div className={styles.entryCard}>
      <div className={styles.cardHeader}>
        <div className={styles.cardUser}>
          <div className={styles.cardAvatar}>
            {entry.name?.[0] || entry.email?.[0] || "?"}
          </div>
          <div>
            <p className={styles.cardName}>{entry.name || "Anonymous"}</p>
            <p className={styles.cardEmail}>
              <FiMail size={10} /> {entry.email}
            </p>
          </div>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      <div className={styles.cardBody}>
        <div className={styles.cardStats}>
          <span className={styles.statItem}>
            <FiTag size={12} /> {entry.referralCode || "—"}
          </span>
          <span className={styles.statItem}>
            <FiUsers size={12} /> {referralCount} referrals
          </span>
          <span className={styles.statItem}>
            <FiGift size={12} /> {entry.bonuses?.length || 0} bonuses
          </span>
        </div>
        {entry.referredByEntry && (
          <p className={styles.cardReferredBy}>
            Referred by: {entry.referredByEntry.email}
          </p>
        )}
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
      .get("/waitlist/admin/stats")
      .then((r) => setStats(r.data.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // ── Fetch Entries ──
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

  // ── Export CSV ──
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

  // ── Render ──

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Waitlist</p>
            <h1 className={styles.pageTitle}>
              Waitlist Management
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
              icon={FiAward}
              label="Rewarded"
              value={stats.rewarded}
              accent="purple"
            />
            <StatChip
              icon={FiXCircle}
              label="Expired"
              value={stats.expired}
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
              placeholder="Search by name, email, or code…"
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

        {/* ── Grid ── */}
        {loading ? (
          <div className={styles.entryGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className={styles.empty}>
            <FiUsers size={48} opacity={0.4} />
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
            entry={detailModal}
            onClose={() => setDetailModal(null)}
          />
        )}

        {/* ── Status Modal ── */}
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
      </div>
    </AdminLayout>
  );
}
