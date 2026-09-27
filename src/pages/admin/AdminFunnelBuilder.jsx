import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import analyticsApi from "../../lib/analytics/analyticsApi";
import { fmtFull, timeAgo } from "../../lib/analytics/formatUtils";
import styles from "./AdminAnalytics.module.css";

import {
  FiFilter,
  FiRefreshCw,
  FiChevronRight,
  FiArrowRight,
  FiUser,
  FiAlertTriangle,
  FiCheckCircle,
  FiPlay,
  FiRotateCcw,
  FiX,
  FiPlus,
  FiTrash2,
  FiInfo,
} from "react-icons/fi";

// ─────────────────────────────────────────────────────────────────────────────
// Preset funnel definitions
// Each preset is a sequence of steps the admin can load with one click.
// The event names MUST match what the tracker actually sends — check
// UserEvent table before editing.
// ─────────────────────────────────────────────────────────────────────────────
const PRESETS = {
  hirer: {
    label: "Hirer Journey",
    description:
      "From search to a completed booking with a review — the primary money path.",
    role: "HIRER",
    steps: [
      { eventName: "page.search.view", label: "Lands on Search" },
      { eventName: "search.executed", label: "Runs a search" },
      { eventName: "page.workerProfile.view", label: "Views a worker" },
      { eventName: "workerProfile.book.clicked", label: "Clicks 'Book Now'" },
      { eventName: "page.createBooking.view", label: "Opens booking form" },
      { eventName: "createBooking.success", label: "Submits booking" },
      { eventName: "page.initiatePayment.view", label: "Opens payment page" },
      {
        eventName: "bookingDetail.status.changed",
        label: "Booking progresses",
      },
      { eventName: "leaveReview.submitted", label: "Leaves a review" },
    ],
  },
  worker: {
    label: "Worker Journey",
    description:
      "From login through discovery to accepting and completing a job.",
    role: "WORKER",
    steps: [
      { eventName: "page.workerDashboard.view", label: "Opens dashboard" },
      { eventName: "page.search.view", label: "Browses jobs" },
      { eventName: "search.executed", label: "Runs a search" },
      {
        eventName: "hirerProfile.job.apply.attempt",
        label: "Attempts to apply",
      },
      { eventName: "hirerProfile.job.applied", label: "Applies to a job" },
      {
        eventName: "bookingDetail.status.changed",
        label: "Booking progresses",
      },
      { eventName: "page.messages.view", label: "Engages via messages" },
      { eventName: "page.workerEarnings.view", label: "Views earnings" },
    ],
  },
  onboarding: {
    label: "Onboarding",
    description:
      "How new signups get from landing page to first action inside the app.",
    role: "ALL",
    steps: [
      { eventName: "page.landing.view", label: "Lands on home" },
      { eventName: "landing.hero.hireWorker", label: "Clicks Hire CTA" },
      { eventName: "page.register.view", label: "Opens registration" },
      { eventName: "register.role.submitted", label: "Picks a role" },
      { eventName: "page.registerHirer.view", label: "Opens hirer form" },
      { eventName: "registerHirer.success", label: "Completes signup" },
      { eventName: "page.verifyEmail.view", label: "Sees verification" },
      { eventName: "page.hirerDashboard.view", label: "Reaches dashboard" },
    ],
  },
  engagement: {
    label: "Daily Engagement",
    description:
      "How often users come back and what they do once they're inside.",
    role: "ALL",
    steps: [
      { eventName: "page.messages.view", label: "Opens messages" },
      {
        eventName: "messages.conversation.opened",
        label: "Opens a conversation",
      },
      { eventName: "messages.sent", label: "Sends a message" },
      { eventName: "page.feed.view", label: "Opens the feed" },
      { eventName: "feed.loaded", label: "Loads posts" },
      { eventName: "feed.post.created", label: "Creates a post" },
    ],
  },
};

const DATE_OPTIONS = [
  { value: 7, label: "7D" },
  { value: 30, label: "30D" },
  { value: 90, label: "90D" },
];

const ROLE_OPTIONS = [
  { value: "ALL", label: "All roles" },
  { value: "HIRER", label: "Hirers only" },
  { value: "WORKER", label: "Workers only" },
];

// Known events that admins can pick from when building a custom funnel.
// Ordered by area. Not exhaustive — the admin can also type a raw event name.
const KNOWN_EVENTS = {
  Authentication: [
    "page.login.view",
    "login.submit.attempt",
    "login.success",
    "login.failed",
    "page.register.view",
    "register.role.submitted",
    "registerHirer.success",
    "workerRegister.success",
  ],
  Discovery: [
    "page.search.view",
    "search.executed",
    "search.results",
    "search.filter.applied",
    "search.workerCard.clicked",
    "page.workerProfile.view",
    "workerProfile.book.clicked",
    "workerProfile.save.toggled",
    "workerProfile.message.clicked",
  ],
  Booking: [
    "page.createBooking.view",
    "createBooking.submit.attempt",
    "createBooking.success",
    "page.bookingDetail.view",
    "bookingDetail.status.attempt",
    "bookingDetail.status.changed",
    "bookingDetail.cancel.submitted",
    "page.bookingList.view",
  ],
  Payment: [
    "page.initiatePayment.view",
    "initiatePayment.method.selected",
    "initiatePayment.card.attempt",
    "initiatePayment.card.redirecting",
    "initiatePayment.bank.confirmed",
    "initiatePayment.crypto.confirmed",
  ],
  Reviews: [
    "page.leaveReview.view",
    "leaveReview.rating.selected",
    "leaveReview.submit.attempt",
    "leaveReview.submitted",
    "page.hirerReviewsReceived.view",
    "page.hirerReviewsGiven.view",
  ],
  Engagement: [
    "page.messages.view",
    "messages.conversation.opened",
    "messages.sent",
    "messages.file.uploaded",
    "page.feed.view",
    "feed.loaded",
    "feed.post.created",
  ],
  Retention: [
    "page.workerEarnings.view",
    "page.workerDashboard.view",
    "page.hirerDashboard.view",
    "page.referralDashboard.view",
    "referralDashboard.link.copied",
    "referral.withdraw.success",
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function StepRow({ step, index, isFirst, isLast, onRemove, canRemove }) {
  const [showDrops, setShowDrops] = useState(false);
  const dropCount = step.dropoffFromPrev || 0;
  const hasDropoff = dropCount > 0 && index > 0;

  return (
    <div className={styles.funnelRow}>
      {/* Left rail with connector line */}
      <div className={styles.funnelRail}>
        <div className={styles.funnelRailDot}>
          {index === 0 ? <FiPlay size={11} /> : index}
        </div>
        {!isLast && <div className={styles.funnelRailLine} />}
      </div>

      {/* Step body */}
      <div className={styles.funnelStepBody}>
        <div className={styles.funnelStepHeader}>
          <div className={styles.funnelStepMeta}>
            <span className={styles.funnelStepLabel}>
              {step.label || step.eventName}
            </span>
            <code className={styles.funnelStepCode}>{step.eventName}</code>
          </div>
          <div className={styles.funnelStepRight}>
            <span className={styles.funnelStepCount}>
              {fmtFull(step.count)}
            </span>
            {canRemove && (
              <button
                type="button"
                className={styles.funnelRemoveBtn}
                onClick={() => onRemove(index)}
                title="Remove step"
              >
                <FiX size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className={styles.funnelBarWrap}>
          <div className={styles.funnelBarTrack}>
            <div
              className={styles.funnelBarFillNew}
              style={{
                width: `${Math.max(step.conversionFromTop || 0, 1)}%`,
              }}
            />
          </div>
          <span className={styles.funnelBarPct}>
            {(step.conversionFromTop || 0).toFixed(1)}%
          </span>
        </div>

        {/* Drop-off indicator — shown between this step and the next */}
        {!isLast && (
          <div
            className={`${styles.funnelDropoff} ${hasDropoff ? styles.funnelDropoffWarn : ""}`}
          >
            <div className={styles.funnelDropoffLeft}>
              <FiArrowRight size={12} />
              <span>
                {hasDropoff ? (
                  <>
                    <strong>{fmtFull(dropCount)}</strong> dropped off
                    <span className={styles.funnelDropoffPct}>
                      ·{" "}
                      {step.conversionFromPrev !== undefined &&
                      step.conversionFromPrev > 0
                        ? `${(100 - step.conversionFromPrev).toFixed(1)}%`
                        : ""}
                    </span>
                  </>
                ) : (
                  "No drop-off data"
                )}
              </span>
            </div>
            {hasDropoff && (
              <button
                type="button"
                className={styles.funnelDropoffToggle}
                onClick={() => setShowDrops((v) => !v)}
              >
                {showDrops ? "Hide" : "Show"} users
                <FiChevronRight
                  size={12}
                  style={{
                    transform: showDrops ? "rotate(90deg)" : "none",
                    transition: "transform 0.15s",
                  }}
                />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Drop-off users drawer — rendered after the step when expanded */}
      {showDrops && step._dropoffUsers && step._dropoffUsers.length > 0 && (
        <div className={styles.funnelDropoffDrawer}>
          <div className={styles.funnelDropoffDrawerHeader}>
            Users who did <code>{step.eventName}</code> but not the next step
          </div>
          {step._dropoffUsers.map((u) => (
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
      )}
    </div>
  );
}

function PresetPicker({ onPick }) {
  return (
    <div className={styles.funnelPresetGrid}>
      {Object.entries(PRESETS).map(([key, p]) => (
        <button
          key={key}
          type="button"
          className={styles.funnelPresetCard}
          onClick={() => onPick(key)}
        >
          <div className={styles.funnelPresetTop}>
            <span className={styles.funnelPresetBadge}>{p.role}</span>
            <FiArrowRight size={14} className={styles.funnelPresetArrow} />
          </div>
          <div className={styles.funnelPresetTitle}>{p.label}</div>
          <div className={styles.funnelPresetDesc}>{p.description}</div>
          <div className={styles.funnelPresetSteps}>{p.steps.length} steps</div>
        </button>
      ))}
    </div>
  );
}

function EventPicker({ onAdd, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return KNOWN_EVENTS;
    const q = search.toLowerCase();
    const out = {};
    for (const [group, events] of Object.entries(KNOWN_EVENTS)) {
      const matches = events.filter((e) => e.toLowerCase().includes(q));
      if (matches.length) out[group] = matches;
    }
    return out;
  }, [search]);

  return (
    <div className={styles.funnelEventPicker}>
      <div className={styles.funnelEventPickerHeader}>
        <input
          type="text"
          className={styles.funnelEventSearch}
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        <button
          type="button"
          className={styles.funnelRemoveBtn}
          onClick={onClose}
        >
          <FiX size={14} />
        </button>
      </div>
      <div className={styles.funnelEventPickerBody}>
        {Object.entries(filtered).map(([group, events]) => (
          <div key={group} className={styles.funnelEventGroup}>
            <div className={styles.funnelEventGroupLabel}>{group}</div>
            {events.map((e) => (
              <button
                key={e}
                type="button"
                className={styles.funnelEventOption}
                onClick={() => {
                  onAdd(e);
                  onClose();
                }}
              >
                <code>{e}</code>
              </button>
            ))}
          </div>
        ))}
        {Object.keys(filtered).length === 0 && (
          <div className={styles.funnelEventNoResults}>
            No events match "{search}"
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminFunnelBuilder() {
  const [steps, setSteps] = useState([]);
  const [presetKey, setPresetKey] = useState(null);
  const [days, setDays] = useState(30);
  const [role, setRole] = useState("ALL");
  const [includeDropoff, setIncludeDropoff] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  const hasSteps = steps.length >= 2;

  // ── Load a preset ──────────────────────────────────────────────────────────
  const loadPreset = (key) => {
    const p = PRESETS[key];
    if (!p) return;
    setPresetKey(key);
    setSteps(p.steps.map((s) => ({ eventName: s.eventName, label: s.label })));
    setRole(p.role);
    setData(null);
  };

  // ── Reset to preset picker ─────────────────────────────────────────────────
  const resetToPicker = () => {
    setPresetKey(null);
    setSteps([]);
    setData(null);
    setError(null);
  };

  // ── Add a step ─────────────────────────────────────────────────────────────
  const addStep = (eventName) => {
    if (steps.length >= 12) return;
    setSteps((prev) => [...prev, { eventName }]);
    setPresetKey(null);
  };

  // ── Remove a step ──────────────────────────────────────────────────────────
  const removeStep = (index) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    setPresetKey(null);
  };

  // ── Run the funnel ─────────────────────────────────────────────────────────
  const runFunnel = useCallback(async () => {
    if (steps.length < 2) return;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        steps: steps.map((s) => s.eventName).join(","),
        days: String(days),
        role,
        includeDropoff: String(includeDropoff),
      });

      const res = await analyticsApi.funnelBuilder(params.toString());
      const payload = res.data.data;

      // Merge dropoffUsers into steps so each step knows its drop-off drawer
      const dropoffMap = {};
      for (const d of payload.dropoffUsers || []) {
        dropoffMap[d.fromStep] = d;
      }

      const enrichedSteps = payload.steps.map((s, i) => {
        const original = steps[i];
        const drop = dropoffMap[s.eventName];
        return {
          ...s,
          label: original?.label || s.label,
          _dropoffUsers: drop?.users || [],
        };
      });

      setData({ ...payload, steps: enrichedSteps });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to run funnel. Check the console for details.",
      );
      console.error("[funnel] error:", err);
    } finally {
      setLoading(false);
    }
  }, [steps, days, role, includeDropoff]);

  // ── Auto-run when the funnel is loaded and params change ───────────────────
  useEffect(() => {
    if (steps.length >= 2) {
      runFunnel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, days, role, includeDropoff]);

  return (
    <AdminLayout>
      <div className={styles.page}>
        {/* ── Page header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Analytics</p>
            <h1 className={styles.pageTitle}>Funnel Builder</h1>
            <p className={styles.panelSub}>
              Track how users move through a sequence of actions.
            </p>
          </div>
          <div className={styles.headerRight}>
            {hasSteps && (
              <button
                className={styles.refreshBtn}
                onClick={resetToPicker}
                title="Pick a different preset"
              >
                <FiRotateCcw size={14} />
              </button>
            )}
            {hasSteps && (
              <button
                className={styles.refreshBtn}
                onClick={runFunnel}
                disabled={loading}
                title="Refresh"
              >
                <FiRefreshCw size={14} style={{ opacity: loading ? 0.5 : 1 }} />
              </button>
            )}
          </div>
        </div>

        {/* ── Preset picker (shown when no funnel loaded) ── */}
        {!hasSteps && (
          <>
            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Start with a preset</h3>
                <p className={styles.panelSub}>
                  Choose a pre-built funnel or start from scratch
                </p>
              </div>
              <div className={styles.panelBody}>
                <PresetPicker onPick={loadPreset} />
                <div className={styles.funnelCustomCta}>
                  <button
                    type="button"
                    className={styles.funnelCustomBtn}
                    onClick={() => {
                      setSteps([
                        {
                          eventName: "page.search.view",
                          label: "Lands on Search",
                        },
                        {
                          eventName: "search.executed",
                          label: "Runs a search",
                        },
                      ]);
                      setPresetKey(null);
                    }}
                  >
                    <FiPlus size={14} /> Build a custom funnel
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Controls bar ── */}
        {hasSteps && (
          <div className={styles.panel}>
            <div className={styles.panelBody}>
              <div className={styles.funnelControls}>
                <div className={styles.funnelControlGroup}>
                  <span className={styles.funnelControlLabel}>Window</span>
                  <div className={styles.rangeGroup}>
                    {DATE_OPTIONS.map((d) => (
                      <button
                        key={d.value}
                        type="button"
                        className={`${styles.rangeBtn} ${days === d.value ? styles.rangeBtnActive : ""}`}
                        onClick={() => setDays(d.value)}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.funnelControlGroup}>
                  <span className={styles.funnelControlLabel}>Role</span>
                  <div className={styles.rangeGroup}>
                    {ROLE_OPTIONS.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        className={`${styles.rangeBtn} ${role === r.value ? styles.rangeBtnActive : ""}`}
                        onClick={() => setRole(r.value)}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.funnelControlGroup}>
                  <label className={styles.funnelToggleLabel}>
                    <input
                      type="checkbox"
                      checked={includeDropoff}
                      onChange={(e) => setIncludeDropoff(e.target.checked)}
                    />
                    <span>Include drop-off user lists</span>
                  </label>
                </div>

                <div className={styles.funnelControlGroupEnd}>
                  <button
                    type="button"
                    className={styles.funnelAddBtn}
                    onClick={() => setShowPicker(true)}
                    disabled={steps.length >= 12}
                  >
                    <FiPlus size={12} /> Add step
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Error ── */}
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

        {/* ── Summary ── */}
        {data && !loading && (
          <div className={styles.funnelSummary}>
            <div className={styles.funnelSummaryCard}>
              <span className={styles.funnelSummaryLabel}>Entered</span>
              <span className={styles.funnelSummaryValue}>
                {fmtFull(data.summary.enteredAt)}
              </span>
              <span className={styles.funnelSummarySub}>
                {data.window} · {data.role}
              </span>
            </div>
            <div className={styles.funnelSummaryCard}>
              <span className={styles.funnelSummaryLabel}>Completed</span>
              <span className={styles.funnelSummaryValue}>
                {fmtFull(data.summary.completed)}
              </span>
              <span className={styles.funnelSummarySub}>
                {data.summary.totalSteps}-step funnel
              </span>
            </div>
            <div className={styles.funnelSummaryCard}>
              <span className={styles.funnelSummaryLabel}>
                Overall conversion
              </span>
              <span className={styles.funnelSummaryValue}>
                {data.summary.overallConversion}%
              </span>
              <span className={styles.funnelSummarySub}>
                entered → completed
              </span>
            </div>
          </div>
        )}

        {/* ── Funnel visualization ── */}
        {hasSteps && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Funnel</h3>
              <p className={styles.panelSub}>
                {data
                  ? `${data.steps.length} steps · ${data.window}`
                  : loading
                    ? "Loading…"
                    : "Configure above and run"}
              </p>
            </div>
            <div className={styles.panelBody}>
              {loading && !data && (
                <div className={styles.funnelSkeleton}>
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className={styles.funnelSkeletonRow}
                      style={{ animationDelay: `${i * 60}ms` }}
                    />
                  ))}
                </div>
              )}

              {data && (
                <div className={styles.funnelViz}>
                  {data.steps.map((step, i) => (
                    <StepRow
                      key={`${step.eventName}-${i}`}
                      step={step}
                      index={i}
                      isFirst={i === 0}
                      isLast={i === data.steps.length - 1}
                      onRemove={removeStep}
                      canRemove={steps.length > 2}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Event picker overlay ── */}
        {showPicker && (
          <div
            className={styles.funnelPickerBackdrop}
            onClick={() => setShowPicker(false)}
          >
            <div
              className={styles.funnelPickerModal}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.funnelPickerHeader}>
                <h3 className={styles.panelTitle}>Add a step</h3>
                <p className={styles.panelSub}>
                  Pick an event from the list. Events fire server-side as users
                  interact with the platform.
                </p>
              </div>
              <EventPicker
                onAdd={addStep}
                onClose={() => setShowPicker(false)}
              />
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
