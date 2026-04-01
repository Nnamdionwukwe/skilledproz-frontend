import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Notifications.module.css";
import api from "../../../../lib/api";
import { useAuthStore } from "../../../../store/authStore";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import HirerLayout from "../../../../components/layout/HirerLayout";

// ── Icon map by notification type ─────────────────────────────────────────────
const TYPE_ICON = {
  JOB_APPLICATION: "📋",
  APPLICATION_STATUS: "🎯",
  BOOKING_PENDING: "📅",
  BOOKING_ACCEPTED: "✅",
  BOOKING_REJECTED: "❌",
  BOOKING_CANCELLED: "🚫",
  BOOKING_COMPLETED: "🎉",
  BOOKING_IN_PROGRESS: "🔨",
  PAYMENT_HELD: "💳",
  PAYMENT_RELEASED: "💰",
  NEW_MESSAGE: "💬",
  REVIEW_REQUEST: "⭐",
  PROFILE_VIEWED: "👀",
  SYSTEM: "🔔",
};

// ── Action links by type ───────────────────────────────────────────────────────
function getActionLink(notif) {
  const d = notif.data || {};
  switch (notif.type) {
    case "JOB_APPLICATION":
      return d.jobPostId ? `/jobs/${d.jobPostId}/applications` : null;
    case "APPLICATION_STATUS":
      return d.jobPostId ? `/jobs/${d.jobPostId}` : null;
    case "BOOKING_PENDING":
    case "BOOKING_ACCEPTED":
    case "BOOKING_REJECTED":
    case "BOOKING_CANCELLED":
    case "BOOKING_COMPLETED":
    case "BOOKING_IN_PROGRESS":
      return d.bookingId ? `/bookings/${d.bookingId}` : null;
    case "PAYMENT_HELD":
    case "PAYMENT_RELEASED":
      return d.bookingId ? `/bookings/${d.bookingId}` : null;
    case "NEW_MESSAGE":
      return d.conversationId ? `/messages/${d.conversationId}` : "/messages";
    case "REVIEW_REQUEST":
      return d.bookingId ? `/bookings/${d.bookingId}/review` : null;
    default:
      return null;
  }
}

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function NotificationModal({ notif, onClose, onNavigate }) {
  if (!notif) return null;
  const actionLink = getActionLink(notif);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalIcon}>
            {TYPE_ICON[notif.type] || "🔔"}
          </span>
          <div className={styles.modalTitleWrap}>
            <h3 className={styles.modalTitle}>{notif.title}</h3>
            <span className={styles.modalTime}>{timeAgo(notif.createdAt)}</span>
          </div>
          <button className={styles.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalBodyText}>{notif.body}</p>

          {notif.data && Object.keys(notif.data).length > 0 && (
            <div className={styles.modalMeta}>
              <p className={styles.modalMetaLabel}>Details</p>
              {Object.entries(notif.data).map(
                ([k, v]) =>
                  v && (
                    <div key={k} className={styles.modalMetaRow}>
                      <span className={styles.modalMetaKey}>
                        {k
                          .replace(/([A-Z])/g, " $1")
                          .replace(/^./, (s) => s.toUpperCase())}
                      </span>
                      <span className={styles.modalMetaVal}>
                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ),
              )}
            </div>
          )}
        </div>

        {actionLink && (
          <div className={styles.modalFooter}>
            <button
              className={styles.modalActionBtn}
              onClick={() => onNavigate(actionLink)}
            >
              View Details →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Notifications() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [notifications, setNotifications] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // all | unread
  const [selected, setSelected] = useState(null);

  const fetchNotifications = async (p = 1, f = filter) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 20 });
      if (f === "unread") params.set("unreadOnly", "true");
      const res = await api.get(`/notifications?${params}`);
      const d = res.data.data;
      setNotifications(d.notifications || []);
      setTotal(d.total || 0);
      setUnreadCount(d.unreadCount || 0);
      setPages(d.pages || 1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1, filter);
  }, [filter]);

  async function handleClick(notif) {
    setSelected(notif);
    if (!notif.isRead) {
      await api.patch(`/notifications/${notif.id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
  }

  async function markAllRead() {
    await api.patch("/notifications/read-all");
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  async function clearAll() {
    if (!window.confirm("Clear all notifications?")) return;
    await api.delete("/notifications/clear-all");
    setNotifications([]);
    setTotal(0);
    setUnreadCount(0);
  }

  async function deleteOne(e, id) {
    e.stopPropagation();
    await api.delete(`/notifications/${id}`);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setTotal((c) => c - 1);
  }

  function handleNavigate(link) {
    setSelected(null);
    navigate(link);
  }

  return (
    <Layout unreadNotifications={unreadCount}>
      <div className={styles.page}>
        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>Notifications</h1>
            <p className={styles.pageSubtitle}>
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
                : "You're all caught up"}
            </p>
          </div>
          <div className={styles.headerActions}>
            {unreadCount > 0 && (
              <button className={styles.actionBtn} onClick={markAllRead}>
                ✓ Mark all read
              </button>
            )}
            {notifications.length > 0 && (
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={clearAll}
              >
                🗑 Clear all
              </button>
            )}
          </div>
        </div>

        {/* ── Filter tabs ── */}
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterBtn} ${filter === "all" ? styles.filterActive : ""}`}
            onClick={() => {
              setFilter("all");
              setPage(1);
            }}
          >
            All <span className={styles.filterCount}>{total}</span>
          </button>
          <button
            className={`${styles.filterBtn} ${filter === "unread" ? styles.filterActive : ""}`}
            onClick={() => {
              setFilter("unread");
              setPage(1);
            }}
          >
            Unread
            {unreadCount > 0 && (
              <span
                className={`${styles.filterCount} ${styles.filterCountUnread}`}
              >
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* ── List ── */}
        {loading ? (
          <div className={styles.list}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={styles.skeletonItem} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>🔔</span>
            <p className={styles.emptyTitle}>
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </p>
            <p className={styles.emptyText}>
              {filter === "unread"
                ? "Switch to 'All' to see past notifications."
                : "We'll notify you when something happens."}
            </p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`${styles.item} ${!notif.isRead ? styles.itemUnread : ""}`}
                onClick={() => handleClick(notif)}
              >
                <div className={styles.itemIcon}>
                  {TYPE_ICON[notif.type] || "🔔"}
                  {!notif.isRead && <span className={styles.unreadDot} />}
                </div>

                <div className={styles.itemContent}>
                  <div className={styles.itemTitleRow}>
                    <span className={styles.itemTitle}>{notif.title}</span>
                    <span className={styles.itemTime}>
                      {timeAgo(notif.createdAt)}
                    </span>
                  </div>
                  <p className={styles.itemBody}>{notif.body}</p>
                  {getActionLink(notif) && (
                    <span className={styles.itemLink}>
                      Tap to view details →
                    </span>
                  )}
                </div>

                <button
                  className={styles.itemDelete}
                  onClick={(e) => deleteOne(e, notif.id)}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => {
                setPage((p) => p - 1);
                fetchNotifications(page - 1);
              }}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => {
                setPage((p) => p + 1);
                fetchNotifications(page + 1);
              }}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Detail modal ── */}
      <NotificationModal
        notif={selected}
        onClose={() => setSelected(null)}
        onNavigate={handleNavigate}
      />
    </Layout>
  );
}
