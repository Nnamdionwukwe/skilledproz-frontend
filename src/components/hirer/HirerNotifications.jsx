import { useState, useEffect } from "react";
import styles from "./HirerNotifications.module.css";
import api from "../../lib/api";

export default function HirerNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/hirers/me/notifications").then((res) => {
      setNotifications(res.data.data.notifications);
      setUnread(res.data.data.unread);
      setLoading(false);
    });
  }, []);

  async function markAllRead() {
    await api.patch("/hirers/me/notifications/read");
    setNotifications((n) => n.map((item) => ({ ...item, isRead: true })));
    setUnread(0);
  }

  const typeIcon = {
    booking_request: "📋",
    booking_accepted: "✅",
    booking_cancelled: "❌",
    payment_held: "💳",
    payment_released: "💸",
    message: "💬",
    review: "⭐",
  };

  if (loading) return <NotificationsSkeleton />;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <p className={styles.eyebrow}>Inbox</p>
          <h1 className={styles.title}>
            Notifications
            {unread > 0 && <span className={styles.unreadBadge}>{unread}</span>}
          </h1>
        </div>
        {unread > 0 && (
          <button className={styles.markAllBtn} onClick={markAllRead}>
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🔔</span>
          <p className={styles.emptyTitle}>All clear</p>
          <p className={styles.emptyText}>No notifications yet.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {notifications.map((n, i) => (
            <div
              key={n.id}
              className={`${styles.item} ${!n.isRead ? styles.itemUnread : ""}`}
              style={{ animationDelay: `${i * 0.03}s` }}
            >
              <div className={styles.itemIcon}>{typeIcon[n.type] || "🔔"}</div>
              <div className={styles.itemBody}>
                <p className={styles.itemTitle}>{n.title}</p>
                <p className={styles.itemText}>{n.body}</p>
                <p className={styles.itemTime}>
                  {timeAgo(new Date(n.createdAt))}
                </p>
              </div>
              {!n.isRead && <div className={styles.unreadDot} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function timeAgo(date) {
  const diff = (Date.now() - date) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationsSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skeletonHeader} />
      <div className={styles.list}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className={styles.skeletonItem} />
        ))}
      </div>
    </div>
  );
}
