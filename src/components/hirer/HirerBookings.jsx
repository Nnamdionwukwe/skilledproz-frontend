import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import api from "../../lib/api";

const STATUS_OPTIONS = [
  "",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const STATUS_COLORS = {
  PENDING: { bg: "rgba(249,115,22,0.12)", color: "#f97316" },
  ACCEPTED: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  IN_PROGRESS: { bg: "rgba(59,130,246,0.12)", color: "#3b82f6" },
  COMPLETED: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
  CANCELLED: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
  DISPUTED: { bg: "rgba(239,68,68,0.12)", color: "#ef4444" },
};

function fmt(n) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

export default function HirerBookings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ page });
    if (status) params.set("status", status);
    api
      .get(`/hirers/me/bookings?${params}`)
      .then((res) => setData(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [status, page]);

  const { bookings = [], total = 0, pages = 1 } = data || {};

  return (
    <HirerLayout>
      <div>
        {/* Filters */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            style={{
              background: "var(--bg-panel)",
              border: "1px solid var(--border)",
              color: "var(--text)",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              fontSize: "0.875rem",
              cursor: "pointer",
            }}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s || "All Statuses"}
              </option>
            ))}
          </select>
          <span style={{ color: "var(--text-dim)", fontSize: "0.875rem" }}>
            {total} booking{total !== 1 ? "s" : ""}
          </span>
          <Link
            to="/dashboard/hirer/post-job"
            style={{
              marginLeft: "auto",
              background: "var(--orange)",
              color: "#000",
              padding: "0.5rem 1.25rem",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "0.875rem",
            }}
          >
            + Post a Job
          </Link>
        </div>

        {/* Table */}
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          {loading ? (
            [1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  height: 64,
                  background: "rgba(255,255,255,0.02)",
                  margin: "1px 0",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))
          ) : bookings.length === 0 ? (
            <div
              style={{
                padding: "3rem",
                textAlign: "center",
                color: "var(--text-dim)",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📋</div>
              <div style={{ fontWeight: 700 }}>No bookings found</div>
              <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
                Post a job to get started
              </div>
            </div>
          ) : (
            bookings.map((b, idx) => {
              const s = STATUS_COLORS[b.status] || STATUS_COLORS.PENDING;
              return (
                <Link
                  key={b.id}
                  to={`/bookings/${b.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "1rem 1.5rem",
                    borderBottom:
                      idx < bookings.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(255,255,255,0.02)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: "var(--bg-card)",
                      border: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.8rem",
                      flexShrink: 0,
                    }}
                  >
                    {b.worker?.firstName?.[0]}
                    {b.worker?.lastName?.[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        marginBottom: 2,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b.title}
                    </div>
                    <div
                      style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}
                    >
                      {b.worker?.firstName} {b.worker?.lastName} ·{" "}
                      {b.category?.name}
                    </div>
                  </div>
                  {b.payment && (
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: 700,
                        color: "var(--orange)",
                        flexShrink: 0,
                      }}
                    >
                      {fmt(b.payment.amount)}
                    </div>
                  )}
                  <span
                    style={{
                      background: s.bg,
                      color: s.color,
                      fontSize: "0.6875rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: "999px",
                      flexShrink: 0,
                    }}
                  >
                    {b.status.replace("_", " ")}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "0.5rem",
              marginTop: "1.5rem",
            }}
          >
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
              style={{
                padding: "0.4rem 0.875rem",
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              ←
            </button>
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "0.4rem 0.875rem",
                  background: p === page ? "var(--orange)" : "var(--bg-panel)",
                  border: "1px solid var(--border)",
                  color: p === page ? "#000" : "var(--text)",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: p === page ? 700 : 400,
                }}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page === pages}
              style={{
                padding: "0.4rem 0.875rem",
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                color: "var(--text)",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              →
            </button>
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
