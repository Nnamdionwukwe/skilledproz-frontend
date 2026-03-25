import { useState } from "react";
import { useFetch } from "../../../hooks/useFetch";
import { workerAPI } from "../../../services/api";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import ui from "../../../components/ui/ui.module.css";

function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewsPage() {
  const [page, setPage] = useState(1);
  const { data, loading, error } = useFetch(
    () => workerAPI.getReviews(page),
    [page],
  );
  const { reviews = [], total = 0, pages = 1, distribution = {} } = data || {};

  const totalReviews = Object.values(distribution).reduce((a, b) => a + b, 0);
  const avgRating = totalReviews
    ? (
        Object.entries(distribution).reduce(
          (s, [r, c]) => s + Number(r) * c,
          0,
        ) / totalReviews
      ).toFixed(1)
    : "—";

  return (
    <WorkerLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Rating summary */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "1.5rem",
          }}
        >
          <div
            className={ui.card}
            style={{ textAlign: "center", minWidth: 160 }}
          >
            <div
              style={{
                fontSize: "3.5rem",
                fontWeight: 800,
                letterSpacing: "-0.05em",
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              {avgRating}
            </div>
            <div
              className={ui.stars}
              style={{ fontSize: "1.25rem", margin: "0.5rem 0" }}
            >
              {"★".repeat(Math.round(parseFloat(avgRating) || 0))}
              {"☆".repeat(5 - Math.round(parseFloat(avgRating) || 0))}
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--ink-4)" }}>
              {totalReviews} total reviews
            </div>
          </div>

          <div className={ui.card}>
            <div className={ui.cardTitle} style={{ marginBottom: "0.875rem" }}>
              Rating breakdown
            </div>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = totalReviews ? (count / totalReviews) * 100 : 0;
              return (
                <div
                  key={star}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 700,
                      color: "var(--ink-3)",
                      minWidth: 16,
                    }}
                  >
                    {star}
                  </span>
                  <span style={{ color: "#f5a623", fontSize: "0.875rem" }}>
                    ★
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 8,
                      background: "var(--surface-2)",
                      borderRadius: "999px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--brand)",
                        borderRadius: "999px",
                        transition: "width 0.5s",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "0.75rem",
                      color: "var(--ink-4)",
                      minWidth: 24,
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reviews list */}
        <div className={ui.card}>
          <div className={ui.cardHeader}>
            <span className={ui.cardTitle}>All Reviews ({total})</span>
          </div>

          {loading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={ui.skeleton}
                  style={{ height: 80, marginBottom: 12 }}
                />
              ))}
            </div>
          ) : error ? (
            <div className={ui.empty}>
              <div className={ui.emptyDesc}>{error}</div>
            </div>
          ) : reviews.length === 0 ? (
            <div className={ui.empty}>
              <div className={ui.emptyIcon}>⭐</div>
              <div className={ui.emptyTitle}>No reviews yet</div>
              <div className={ui.emptyDesc}>
                Complete jobs to receive your first review
              </div>
            </div>
          ) : (
            reviews.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: "1.125rem 0",
                  borderBottom: "1px solid var(--surface-2)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      className={ui.avatar}
                      style={{
                        width: 38,
                        height: 38,
                        fontSize: "0.8125rem",
                        background: "var(--brand)",
                        color: "#fff",
                      }}
                    >
                      {r.giver?.firstName?.[0]}
                      {r.giver?.lastName?.[0]}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: 700 }}>
                        {r.giver?.firstName} {r.giver?.lastName}
                      </div>
                      <div
                        style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}
                      >
                        {r.booking?.title} · {r.booking?.category?.name}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className={ui.stars}>
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}>
                      {fmtDate(r.createdAt)}
                    </div>
                  </div>
                </div>
                {r.comment && (
                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--ink-3)",
                      lineHeight: 1.65,
                      paddingLeft: "calc(38px + 0.75rem)",
                    }}
                  >
                    "{r.comment}"
                  </p>
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
