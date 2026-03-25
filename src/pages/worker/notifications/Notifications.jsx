import { useState } from "react";
import { useFetch } from "../../../hooks/useFetch";
import { workerAPI } from "../../../services/api";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import ui from "../../../components/ui/ui.module.css";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const TYPE_ICON = {
  BOOKING_REQUEST: "📋",
  BOOKING_ACCEPTED: "✅",
  PAYMENT_RECEIVED: "₦",
  REVIEW_RECEIVED: "⭐",
  MESSAGE: "💬",
  SYSTEM: "🔔",
};

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error, refetch } = useFetch(
    () => workerAPI.getNotifications(page),
    [page],
  );
  const {
    notifications = [],
    total = 0,
    pages = 1,
    unreadCount = 0,
  } = data || {};

  const markAllRead = async () => {
    await workerAPI.markAllNotificationsRead();
    refetch();
  };

  return (
    <WorkerLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <span className={ui.cardTitle}>
              Notifications
              {unreadCount > 0 && (
                <span
                  style={{
                    marginLeft: "0.5rem",
                    background: "var(--brand)",
                    color: "#fff",
                    fontSize: "0.6875rem",
                    fontWeight: 800,
                    padding: "2px 8px",
                    borderRadius: "999px",
                  }}
                >
                  {unreadCount} new
                </span>
              )}
            </span>
            {unreadCount > 0 && (
              <button
                className={`${ui.btn} ${ui.btnOutline} ${ui.btnSm}`}
                onClick={markAllRead}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading ? (
            <div>
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={ui.skeleton}
                  style={{ height: 64, marginBottom: 10 }}
                />
              ))}
            </div>
          ) : error ? (
            <div className={ui.empty}>
              <div className={ui.emptyDesc}>{error}</div>
            </div>
          ) : notifications.length === 0 ? (
            <div className={ui.empty}>
              <div className={ui.emptyIcon}>🔔</div>
              <div className={ui.emptyTitle}>All caught up!</div>
              <div className={ui.emptyDesc}>No notifications yet</div>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "0.875rem 0",
                  borderBottom: "1px solid var(--surface-2)",
                  background: n.isRead ? "transparent" : "var(--brand-light)",
                  margin: n.isRead ? 0 : "0 -1.5rem",
                  padding: n.isRead ? "0.875rem 0" : "0.875rem 1.5rem",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: n.isRead
                      ? "var(--surface-2)"
                      : "var(--brand-light)",
                    border: n.isRead
                      ? "1px solid var(--surface-3)"
                      : "1px solid var(--brand-border)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                    flexShrink: 0,
                  }}
                >
                  {TYPE_ICON[n.type] || "🔔"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: n.isRead ? 500 : 700,
                      color: "var(--ink)",
                      marginBottom: "2px",
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--ink-3)",
                      marginBottom: "4px",
                    }}
                  >
                    {n.message}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}>
                    {fmtDate(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--brand)",
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 4,
                    }}
                  />
                )}
              </div>
            ))
          )}

          {pages > 1 && (
            <div className={ui.pagination}>
              <button
                className={ui.pageBtn}
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                ←
              </button>
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`${ui.pageBtn} ${p === page ? ui.active : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className={ui.pageBtn}
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
              >
                →
              </button>
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
