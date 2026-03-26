import { useState, useEffect } from "react";
import HirerLayout from "../../components/layout/HirerLayout";
import api from "../../lib/api";

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

export default function HirerNotifications() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = () => {
    api
      .get("/hirers/me/notifications")
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const markAllRead = async () => {
    await api.patch("/hirers/me/notifications/read");
    setData((d) => ({
      ...d,
      unread: 0,
      notifications: d.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  };

  const { notifications = [], unread = 0 } = data || {};

  return (
    <HirerLayout unreadNotifications={unread}>
      <div style={{ maxWidth: 720 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.125rem",
              fontWeight: 800,
            }}
          >
            Notifications{" "}
            {unread > 0 && (
              <span
                style={{
                  marginLeft: "0.5rem",
                  background: "var(--orange)",
                  color: "#000",
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: "999px",
                }}
              >
                {unread} new
              </span>
            )}
          </h2>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                color: "var(--text-dim)",
                padding: "0.4rem 1rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "0.8125rem",
              }}
            >
              Mark all read
            </button>
          )}
        </div>

        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 72,
                  background: "rgba(255,255,255,0.03)",
                  margin: "1px 0",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))
          ) : notifications.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔔</div>
              <div style={{ fontWeight: 700 }}>All caught up!</div>
              <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                No notifications yet
              </div>
            </div>
          ) : (
            notifications.map((n, idx) => (
              <div
                key={n.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  padding: "1rem 1.5rem",
                  background: n.isRead
                    ? "transparent"
                    : "rgba(249,115,22,0.06)",
                  borderBottom:
                    idx < notifications.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    flexShrink: 0,
                    background: n.isRead
                      ? "var(--bg-card)"
                      : "var(--orange-dim)",
                    border: `1px solid ${n.isRead ? "var(--border)" : "var(--orange-glow)"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1rem",
                  }}
                >
                  {TYPE_ICON[n.type] || "🔔"}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: n.isRead ? 500 : 700,
                      fontSize: "0.9rem",
                      color: "var(--text)",
                      marginBottom: 2,
                    }}
                  >
                    {n.title}
                  </div>
                  <div
                    style={{
                      fontSize: "0.8125rem",
                      color: "var(--text-dim)",
                      marginBottom: 4,
                    }}
                  >
                    {n.message}
                  </div>
                  <div
                    style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}
                  >
                    {fmtDate(n.createdAt)}
                  </div>
                </div>
                {!n.isRead && (
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      background: "var(--orange)",
                      borderRadius: "50%",
                      flexShrink: 0,
                      marginTop: 6,
                    }}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </HirerLayout>
  );
}
