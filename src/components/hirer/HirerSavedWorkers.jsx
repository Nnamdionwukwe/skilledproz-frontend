import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import api from "../../lib/api";
import FeatureGate from "../subscription/FeatureGate";

export default function HirerSavedWorkers() {
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/hirers/me/saved-workers")
      .then((res) => setWorkers(res.data.data?.workers || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <HirerLayout>
      <div>
        <p
          style={{
            color: "var(--text-dim)",
            fontSize: "0.875rem",
            marginBottom: "1.5rem",
          }}
        >
          Workers you've hired before — ready to book again.
        </p>

        {loading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1rem",
            }}
          >
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  height: 120,
                  background: "var(--bg-panel)",
                  borderRadius: "12px",
                  animation: "pulse 1.5s infinite",
                }}
              />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div
            style={{
              padding: "3rem",
              textAlign: "center",
              color: "var(--text-dim)",
              background: "var(--bg-panel)",
              borderRadius: "12px",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔖</div>
            <div style={{ fontWeight: 700 }}>No saved workers yet</div>
            <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Workers you hire will appear here
            </div>
          </div>
        ) : (
          <>
            <FeatureGate feature="analytics">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "1rem",
                }}
              >
                {workers.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      background: "var(--bg-panel)",
                      border: "1px solid var(--border)",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.875rem",
                      }}
                    >
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: "50%",
                          background: "var(--orange-dim)",
                          border: "1.5px solid var(--orange-glow)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 800,
                          color: "var(--orange)",
                          fontSize: "1rem",
                          flexShrink: 0,
                        }}
                      >
                        {w.avatar ? (
                          <img
                            src={w.avatar}
                            alt=""
                            style={{
                              width: "100%",
                              height: "100%",
                              borderRadius: "50%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          `${w.firstName?.[0]}${w.lastName?.[0]}`
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                          {w.firstName} {w.lastName}
                        </div>
                        <div
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-dim)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {w.workerProfile?.title}
                        </div>
                      </div>
                      {w.workerProfile?.avgRating && (
                        <div
                          style={{
                            fontSize: "0.875rem",
                            fontWeight: 700,
                            color: "var(--orange)",
                            flexShrink: 0,
                          }}
                        >
                          ★ {w.workerProfile.avgRating.toFixed(1)}
                        </div>
                      )}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        fontSize: "0.8rem",
                        color: "var(--text-dim)",
                      }}
                    >
                      <span>
                        {w.city}
                        {w.city && w.country ? ", " : ""}
                        {w.country}
                      </span>
                      {w.workerProfile?.isAvailable && (
                        <span
                          style={{
                            marginLeft: "auto",
                            color: "var(--green)",
                            fontWeight: 600,
                          }}
                        >
                          ● Available
                        </span>
                      )}
                    </div>
                    {w.lastCategory && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        Last hired for: {w.lastCategory.name}
                      </div>
                    )}
                    <Link
                      to={`/workers/${w.id}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "0.5rem",
                        background: "var(--orange-dim)",
                        color: "var(--orange)",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "0.8125rem",
                        border: "1px solid var(--orange-glow)",
                      }}
                    >
                      View Profile →
                    </Link>
                  </div>
                ))}
              </div>
            </FeatureGate>
          </>
        )}
      </div>
    </HirerLayout>
  );
}
