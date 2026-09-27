import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import analyticsApi from "../../lib/analytics/analyticsApi";
import { fmtFull, timeAgo, fmtDuration } from "../../lib/analytics/formatUtils";
import styles from "./AdminAnalytics.module.css";

import {
  FiRefreshCw,
  FiCreditCard,
  FiDollarSign,
  FiArrowRight,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiChevronRight,
  FiInfo,
} from "react-icons/fi";
import { SiBitcoin } from "react-icons/si";

const DATE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const METHOD_META = {
  card: { label: "Card / Mobile Money", icon: FiCreditCard, color: "#60a5fa" },
  bank_transfer: {
    label: "Bank Transfer",
    icon: FiDollarSign,
    color: "var(--orange)",
  },
  crypto: { label: "Crypto", icon: SiBitcoin, color: "#a78bfa" },
};

const TIMING_LABELS = {
  under_5min: "< 5 min",
  "5_to_30min": "5–30 min",
  "30min_to_2h": "30 min – 2h",
  "2h_to_1d": "2h – 1 day",
  "1d_to_7d": "1–7 days",
  over_7d: "> 7 days",
};

function StageRow({ stage, index, totalSteps, onShowUsers, showUsers }) {
  const hasDropoff = stage.dropoffFromPrev > 0 && index < totalSteps - 1;

  return (
    <div className={styles.funnelRow}>
      <div className={styles.funnelRail}>
        <div className={styles.funnelRailDot}>{index + 1}</div>
        {index < totalSteps - 1 && <div className={styles.funnelRailLine} />}
      </div>

      <div className={styles.funnelStepBody}>
        <div className={styles.funnelStepHeader}>
          <div className={styles.funnelStepMeta}>
            <span className={styles.funnelStepLabel}>{stage.label}</span>
            <code className={styles.funnelStepCode}>
              {stage.eventNames.join(" · ")}
            </code>
          </div>
          <div className={styles.funnelStepRight}>
            <span className={styles.funnelStepCount}>
              {fmtFull(stage.count)}
            </span>
          </div>
        </div>

        <div className={styles.funnelBarWrap}>
          <div className={styles.funnelBarTrack}>
            <div
              className={styles.funnelBarFillNew}
              style={{
                width: `${Math.max(stage.conversionFromTop, 1)}%`,
                background:
                  index === totalSteps - 1
                    ? "linear-gradient(90deg, var(--green), #22c55e)"
                    : undefined,
              }}
            />
          </div>
          <span className={styles.funnelBarPct}>
            {stage.conversionFromTop.toFixed(1)}%
          </span>
        </div>

        {index < totalSteps - 1 && (
          <div
            className={`${styles.funnelDropoff} ${hasDropoff ? styles.funnelDropoffWarn : ""}`}
          >
            <div className={styles.funnelDropoffLeft}>
              <FiArrowRight size={12} />
              <span>
                {hasDropoff ? (
                  <>
                    <strong>{fmtFull(stage.dropoffFromPrev)}</strong> dropped
                    <span className={styles.funnelDropoffPct}>
                      ·{" "}
                      {stage.conversionFromPrev > 0
                        ? `${(100 - stage.conversionFromPrev).toFixed(1)}%`
                        : "—"}
                    </span>
                  </>
                ) : (
                  "No drop-off"
                )}
              </span>
            </div>
            {hasDropoff && (
              <button
                type="button"
                className={styles.funnelDropoffToggle}
                onClick={onShowUsers}
              >
                {showUsers ? "Hide" : "Show"} users
                <FiChevronRight
                  size={12}
                  style={{
                    transform: showUsers ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DropoffDrawer({ dropoff }) {
  if (!dropoff || !dropoff.users?.length) return null;

  return (
    <div className={styles.funnelDropoffDrawer}>
      <div className={styles.funnelDropoffDrawerHeader}>
        Users who reached <strong>{dropoff.fromLabel}</strong> but not{" "}
        <strong>{dropoff.toLabel}</strong> — showing top {dropoff.users.length}{" "}
        of {fmtFull(dropoff.droppedCount)}
      </div>
      {dropoff.users.map((u) => (
        <Link
          key={u.id}
          to={`/admin/analytics/user/${u.id}`}
          className={styles.funnelDropoffUser}
        >
          <div className={styles.funnelDropoffAvatar}>
            {u.avatar ? (
              <img src={u.avatar} alt="" />
            ) : (
              `${u.firstName?.[0] || ""}${u.lastName?.[0] || ""}`
            )}
          </div>
          <div className={styles.funnelDropoffUserInfo}>
            <span className={styles.funnelDropoffUserName}>
              {u.firstName} {u.lastName}
            </span>
            <span className={styles.funnelDropoffUserMeta}>
              {u.role} · {u.email}
            </span>
          </div>
          <span className={styles.funnelDropoffUserTime}>
            {u.lastSeen ? timeAgo(u.lastSeen) : "never"}
          </span>
        </Link>
      ))}
    </div>
  );
}

function MethodCard({ method, meta }) {
  const Icon = meta.icon;
  return (
    <div className={styles.methodCardNew}>
      <div className={styles.methodCardNewTop}>
        <span
          className={styles.methodCardNewIcon}
          style={{ color: meta.color, background: `${meta.color}15` }}
        >
          <Icon size={18} />
        </span>
        <span className={styles.methodCardNewLabel}>{meta.label}</span>
      </div>

      <div className={styles.methodCardNewGrid}>
        <div>
          <div className={styles.methodCardNewValue}>
            {fmtFull(method.attempted)}
          </div>
          <div className={styles.methodCardNewLabelSmall}>Attempts</div>
        </div>
        <div>
          <div
            className={styles.methodCardNewValue}
            style={{ color: "var(--green)" }}
          >
            {fmtFull(method.confirmed)}
          </div>
          <div className={styles.methodCardNewLabelSmall}>Confirmed</div>
        </div>
        <div>
          <div
            className={styles.methodCardNewValue}
            style={{
              color:
                method.successRate >= 50
                  ? "var(--green)"
                  : method.successRate > 0
                    ? "var(--orange)"
                    : "var(--text-muted)",
            }}
          >
            {method.successRate}%
          </div>
          <div className={styles.methodCardNewLabelSmall}>Success</div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentFunnel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGap, setExpandedGap] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    analyticsApi
      .paymentFunnel(days)
      .then((res) => setData(res.data.data))
      .catch((err) => {
        setError(
          err.response?.data?.message || "Failed to load payment funnel",
        );
      })
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  // Compute timing buckets max for bar chart scaling
  const timingBuckets = data?.timing?.buckets || {};
  const maxBucket = Math.max(...Object.values(timingBuckets), 1);
  const totalTimingSamples = data?.timing?.sampleSize || 0;

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Analytics</p>
            <h1 className={styles.pageTitle}>Payment Funnel</h1>
            <p className={styles.panelSub}>
              Booking → Payment page → Method → Attempt → Confirmed → Escrow
              held.
            </p>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.rangeGroup}>
              {DATE_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  className={`${styles.rangeBtn} ${days === d.value ? styles.rangeBtnActive : ""}`}
                  onClick={() => setDays(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              className={styles.refreshBtn}
              onClick={load}
              disabled={loading}
              title="Refresh"
            >
              <FiRefreshCw size={14} style={{ opacity: loading ? 0.5 : 1 }} />
            </button>
          </div>
        </div>

        {error && (
          <div className={styles.panel}>
            <div className={styles.panelBody}>
              <div className={styles.funnelError}>
                <FiAlertTriangle size={16} />
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}

        {/* Escrow event warning — shown when payment.held isn't firing */}
        {data && !data.hasEscrowEvent && (
          <div className={styles.panel}>
            <div className={styles.panelBody}>
              <div
                className={styles.funnelError}
                style={{
                  background: "rgba(234,179,8,0.08)",
                  borderColor: "rgba(234,179,8,0.25)",
                  color: "#ca8a04",
                }}
              >
                <FiInfo size={16} />
                <span>
                  <strong>Note:</strong> the final "Escrow held" stage shows 0
                  because <code>payment.held</code> isn't being tracked
                  server-side yet. The pipeline works (payments are held in
                  escrow) — we just don't emit an analytics event from the
                  backend. To fix: add{" "}
                  <code>tracker.track("payment.held", ...)</code> in{" "}
                  <code>payment.controller.js</code> when the payment is
                  released into escrow. Everything above is real data.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Funnel */}
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h3 className={styles.panelTitle}>Conversion stages</h3>
            <p className={styles.panelSub}>{data ? data.window : "Loading…"}</p>
          </div>

          {loading && !data && (
            <div className={styles.panelBody}>
              <div className={styles.funnelSkeleton}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className={styles.funnelSkeletonRow}
                    style={{ animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          {data && (
            <div className={styles.panelBody}>
              <div className={styles.funnelViz}>
                {data.steps.map((stage, i) => (
                  <div key={stage.key}>
                    <StageRow
                      stage={stage}
                      index={i}
                      totalSteps={data.steps.length}
                      onShowUsers={() =>
                        setExpandedGap(
                          expandedGap === stage.key ? null : stage.key,
                        )
                      }
                      showUsers={expandedGap === stage.key}
                    />
                    {expandedGap === stage.key && (
                      <DropoffDrawer
                        dropoff={data.dropoffUsers.find(
                          (d) => d.fromStage === stage.key,
                        )}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Payment methods */}
        {data && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Payment method breakdown</h3>
              <p className={styles.panelSub}>
                Users who attempted and successfully confirmed per method
              </p>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.methodGridNew}>
                {data.methods.map((m) => {
                  const meta = METHOD_META[m.method] || {
                    label: m.method,
                    icon: FiCreditCard,
                    color: "var(--orange)",
                  };
                  return <MethodCard key={m.method} method={m} meta={meta} />;
                })}
              </div>
            </div>
          </div>
        )}

        {/* Time-to-payment */}
        {data && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Time to payment</h3>
              <p className={styles.panelSub}>
                How long from booking creation to payment initiation ·{" "}
                {data.timing.sampleSize} sample
                {data.timing.sampleSize !== 1 ? "s" : ""}
              </p>
            </div>
            <div className={styles.panelBody}>
              {data.timing.sampleSize === 0 ? (
                <div className={styles.noData}>
                  Not enough data yet — users need to complete both a booking
                  and a payment initiation for this to populate.
                </div>
              ) : (
                <>
                  <div className={styles.timingStats}>
                    <div className={styles.timingStatBox}>
                      <span className={styles.timingStatLabel}>Average</span>
                      <span className={styles.timingStatValue}>
                        {fmtDuration(data.timing.avgMs)}
                      </span>
                    </div>
                    <div className={styles.timingStatBox}>
                      <span className={styles.timingStatLabel}>Median</span>
                      <span className={styles.timingStatValue}>
                        {fmtDuration(data.timing.medianMs)}
                      </span>
                    </div>
                  </div>

                  <div className={styles.timingBuckets}>
                    {Object.entries(TIMING_LABELS).map(([key, label]) => {
                      const count = timingBuckets[key] || 0;
                      const pct = (count / maxBucket) * 100;
                      return (
                        <div key={key} className={styles.timingBucketRow}>
                          <span className={styles.timingBucketLabel}>
                            {label}
                          </span>
                          <div className={styles.timingBucketTrack}>
                            <div
                              className={styles.timingBucketFill}
                              style={{ width: `${Math.max(pct, 1)}%` }}
                            />
                          </div>
                          <span className={styles.timingBucketCount}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
