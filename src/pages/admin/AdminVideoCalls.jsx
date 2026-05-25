// src/pages/videocalls/AdminVideoCalls.jsx
// Full admin video call oversight.
// Endpoints:
//   GET /admin/video-calls?page=&limit=

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminVideoCalls.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "INITIATED", label: "Initiated" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DECLINED", label: "Declined" },
  { key: "MISSED", label: "Missed" },
  { key: "ENDED", label: "Ended" },
];

const STATUS_META = {
  INITIATED: { label: "Initiated", color: "yellow", icon: "📲" },
  ACTIVE: { label: "Active", color: "green", icon: "🟢" },
  COMPLETED: { label: "Completed", color: "indigo", icon: "✅" },
  DECLINED: { label: "Declined", color: "red", icon: "❌" },
  MISSED: { label: "Missed", color: "orange", icon: "📵" },
  ENDED: { label: "Ended", color: "dim", icon: "⏹" },
};

const BOOKING_STATUS_META = {
  PENDING: { color: "#f97316" },
  ACCEPTED: { color: "#a78bfa" },
  IN_PROGRESS: { color: "#6366f1" },
  COMPLETED: { color: "#22c55e" },
  CANCELLED: { color: "#ef4444" },
  DISPUTED: { color: "#f43f5e" },
};

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  return (
    dt.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    " at " +
    dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

function fmtRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return fmtDate(d);
}

function fmtDuration(startedAt, endedAt) {
  if (!startedAt || !endedAt) return null;
  const diffMs = new Date(endedAt) - new Date(startedAt);
  if (diffMs <= 0) return null;
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const sec = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function truncate(str, n = 40) {
  if (!str) return "—";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user, index = 0, size = "sm" }) {
  const colors = [s.avatarOrange, s.avatarIndigo, s.avatarGreen, s.avatarRose];
  const sizeClass =
    { sm: s.avatar, md: s.avatarMd, lg: s.avatarLg, xs: s.avatarXs }[size] ??
    s.avatar;
  return (
    <div className={`${sizeClass} ${colors[index % colors.length]}`}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] ?? { label: status, color: "dim", icon: "📞" };
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>
      {m.icon} {m.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statValue}>{value ?? "—"}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

// ─── Participant Pair ─────────────────────────────────────────────────────────
function ParticipantPair({ initiator, receiver, size = "sm" }) {
  return (
    <div className={s.participantPair}>
      <div className={s.participant}>
        <Avatar user={initiator} index={0} size={size} />
        <div className={s.participantInfo}>
          <span className={s.participantName}>
            {initiator?.firstName} {initiator?.lastName}
          </span>
          <span className={s.participantRole}>Initiator</span>
        </div>
      </div>
      <div className={s.participantArrow}>📞</div>
      <div className={s.participant}>
        <Avatar user={receiver} index={1} size={size} />
        <div className={s.participantInfo}>
          <span className={s.participantName}>
            {receiver?.firstName} {receiver?.lastName}
          </span>
          <span className={s.participantRole}>Receiver</span>
        </div>
      </div>
    </div>
  );
}

// ─── Call Timeline ────────────────────────────────────────────────────────────
function CallTimeline({ call }) {
  const events = [
    { label: "Call initiated", time: call.createdAt, done: true, icon: "📲" },
    {
      label: call.status === "DECLINED" ? "Call declined" : "Call accepted",
      time: call.acceptedAt ?? call.declinedAt,
      done: ["ACTIVE", "COMPLETED", "ENDED", "DECLINED"].includes(call.status),
      icon: call.status === "DECLINED" ? "❌" : "✅",
      isNeg: call.status === "DECLINED",
    },
    {
      label: "In progress",
      time: call.startedAt,
      done: ["ACTIVE", "COMPLETED", "ENDED"].includes(call.status),
      icon: "📹",
    },
    {
      label: "Call ended",
      time: call.endedAt,
      done: ["COMPLETED", "ENDED"].includes(call.status),
      icon: "⏹",
    },
  ];

  return (
    <div className={s.timeline}>
      {events.map((ev, i) => (
        <div
          key={i}
          className={`${s.timelineItem} ${ev.done ? s.timelineDone : ""} ${ev.isNeg ? s.timelineNeg : ""}`}
        >
          <div
            className={`${s.timelineDot} ${ev.done ? (ev.isNeg ? s.dotNeg : s.dotDone) : s.dotPending}`}
          >
            {ev.icon}
          </div>
          {i < events.length - 1 && (
            <div
              className={`${s.timelineLine} ${ev.done && !ev.isNeg ? s.timelineLineDone : ""}`}
            />
          )}
          <div className={s.timelineInfo}>
            <span className={s.timelineLabel}>{ev.label}</span>
            {ev.time && (
              <span className={s.timelineTime}>{fmtDateTime(ev.time)}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ call, onClose }) {
  const duration = fmtDuration(call.startedAt, call.endedAt);
  const statusMeta = STATUS_META[call.status] ?? {
    label: call.status,
    color: "dim",
    icon: "📞",
  };
  const bookingColor =
    BOOKING_STATUS_META[call.booking?.status]?.color ?? "#888";

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitleRow}>
            <span className={s.modalIcon}>📹</span>
            <h3 className={s.modalTitle}>Video Call Detail</h3>
            <StatusBadge status={call.status} />
          </div>
          <button className={s.modalClose} onClick={onClose}>
            ✕
          </button>
        </div>

        <div className={s.modalBody}>
          {/* Participants hero */}
          <div className={s.participantsHero}>
            <div className={s.heroParticipant}>
              <Avatar user={call.initiator} index={0} size="lg" />
              <p className={s.heroName}>
                {call.initiator?.firstName} {call.initiator?.lastName}
              </p>
              <span className={s.heroRole}>Initiator</span>
            </div>

            <div className={s.heroDivider}>
              <div className={s.heroDividerLine} />
              <div className={s.heroDividerIcon}>
                {call.status === "ACTIVE" ? "🟢" : "📞"}
              </div>
              <div className={s.heroDividerLine} />
              {duration && <span className={s.heroDuration}>{duration}</span>}
            </div>

            <div className={s.heroParticipant}>
              <Avatar user={call.receiver} index={1} size="lg" />
              <p className={s.heroName}>
                {call.receiver?.firstName} {call.receiver?.lastName}
              </p>
              <span className={s.heroRole}>Receiver</span>
            </div>
          </div>

          {/* Stats mini row */}
          <div className={s.callStatsRow}>
            <div className={s.callStat}>
              <span className={s.callStatVal}>{fmtDate(call.createdAt)}</span>
              <span className={s.callStatLabel}>Initiated</span>
            </div>
            <div className={s.callStatDivider} />
            <div className={s.callStat}>
              <span className={s.callStatVal}>{duration ?? "—"}</span>
              <span className={s.callStatLabel}>Duration</span>
            </div>
            <div className={s.callStatDivider} />
            <div className={s.callStat}>
              <span className={s.callStatVal}>
                {statusMeta.icon} {statusMeta.label}
              </span>
              <span className={s.callStatLabel}>Status</span>
            </div>
          </div>

          {/* Booking link */}
          {call.booking && (
            <div
              className={s.bookingCard}
              style={{ borderLeftColor: bookingColor }}
            >
              <span className={s.bookingCardIcon}>📅</span>
              <div className={s.bookingCardInfo}>
                <span className={s.bookingCardTitle}>{call.booking.title}</span>
                <span
                  className={s.bookingCardStatus}
                  style={{ color: bookingColor }}
                >
                  {call.booking.status?.replace("_", " ")}
                </span>
              </div>
              <span className={s.bookingCardId}>
                #{call.bookingId?.slice(-6).toUpperCase()}
              </span>
            </div>
          )}

          {/* Timeline */}
          <div className={s.timelineSection}>
            <span className={s.timelineSectionTitle}>Call Timeline</span>
            <CallTimeline call={call} />
          </div>

          {/* Raw ID */}
          <div className={s.callIdRow}>
            <span className={s.callIdLabel}>Call ID</span>
            <span className={s.callIdVal}>{call.id}</span>
          </div>

          <button className={s.btnClose} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────
function CallRow({ call, index, onDetail }) {
  const duration = fmtDuration(call.startedAt, call.endedAt);
  const isActive = call.status === "ACTIVE";

  return (
    <div
      className={`${s.tableRow} ${isActive ? s.tableRowActive : ""}`}
      style={{ animationDelay: `${index * 0.025}s` }}
    >
      {/* Status indicator line */}
      {isActive && <div className={s.activeIndicator} />}

      {/* Participants */}
      <div className={s.tdParticipants}>
        <div className={s.tdParticipantStack}>
          <Avatar user={call.initiator} index={0} size="sm" />
          <Avatar user={call.receiver} index={1} size="sm" />
        </div>
        <div className={s.tdParticipantNames}>
          <span className={s.tdInitiatorName}>
            {call.initiator?.firstName} {call.initiator?.lastName}
          </span>
          <span className={s.tdReceiverName}>
            → {call.receiver?.firstName} {call.receiver?.lastName}
          </span>
        </div>
      </div>

      {/* Booking */}
      <div className={s.tdBooking}>
        {call.booking ? (
          <>
            <span
              className={s.bookingDot}
              style={{
                background:
                  BOOKING_STATUS_META[call.booking.status]?.color ?? "#888",
              }}
            />
            <span className={s.tdBookingTitle}>
              {truncate(call.booking.title)}
            </span>
          </>
        ) : (
          <span className={s.tdNone}>—</span>
        )}
      </div>

      {/* Status */}
      <div className={s.tdStatus}>
        <StatusBadge status={call.status} />
        {isActive && <span className={s.liveDot} />}
      </div>

      {/* Duration */}
      <div className={s.tdDuration}>
        {duration ? (
          <span className={s.durationVal}>{duration}</span>
        ) : (
          <span className={s.tdNone}>—</span>
        )}
      </div>

      {/* Date */}
      <div className={s.tdDate}>
        <span className={s.tdDateMain}>{fmtDate(call.createdAt)}</span>
        <span className={s.tdDateSub}>{fmtRelative(call.createdAt)}</span>
      </div>

      {/* Action */}
      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(call)}
          title="View detail"
        >
          👁 View
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminVideoCalls() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);
  const [detailCall, setDetailCall] = useState(null);

  const searchTimer = useRef(null);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const res = await api.get("/admin/video-calls", {
        params: { page: pg, limit: LIMIT },
      });
      const d = res.data.data;
      setCalls(d.calls);
      setTotal(d.total);
      setPages(d.pages);
      setPage(pg);
    } catch {
      showToast("error", "Failed to load video calls.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, []);

  // ── Client-side filter ───────────────────────────────────────────────────────
  const filtered = calls.filter((c) => {
    const matchStatus = filter === "ALL" || c.status === filter;
    const matchSearch =
      !search.trim() ||
      [
        c.initiator?.firstName,
        c.initiator?.lastName,
        c.receiver?.firstName,
        c.receiver?.lastName,
        c.booking?.title,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const activeCount = calls.filter((c) => c.status === "ACTIVE").length;
  const completedCount = calls.filter((c) =>
    ["COMPLETED", "ENDED"].includes(c.status),
  ).length;
  const declinedCount = calls.filter((c) =>
    ["DECLINED", "MISSED"].includes(c.status),
  ).length;

  // Avg duration from calls that have start+end
  const durations = calls
    .filter((c) => c.startedAt && c.endedAt)
    .map((c) => new Date(c.endedAt) - new Date(c.startedAt));
  const avgDurationMs = durations.length
    ? Math.floor(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 0;
  const avgDurStr =
    avgDurationMs > 0
      ? avgDurationMs >= 60000
        ? `${Math.floor(avgDurationMs / 60000)}m ${Math.floor((avgDurationMs % 60000) / 1000)}s`
        : `${Math.floor(avgDurationMs / 1000)}s`
      : "—";

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleSearchChange(e) {
    setSearch(e.target.value);
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Toast ── */}
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? "✅" : "❌"} {toast.msg}
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              ✕
            </button>
          </div>
        )}

        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Platform</p>
            <h1 className={s.pageTitle}>
              Video Calls
              {total > 0 && <span className={s.countPill}>{total}</span>}
              {activeCount > 0 && (
                <span className={s.livePill}>
                  <span className={s.livePillDot} /> {activeCount} live
                </span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Monitor all platform video calls — read-only oversight
            </p>
          </div>
          <div className={s.readOnlyTag}>
            <span className={s.readOnlyDot} />
            Read-only
          </div>
        </div>

        {/* ── Stats ── */}
        <div className={s.statsGrid}>
          <StatCard
            icon="📹"
            label="Total Calls"
            value={total}
            sub="All time"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon="🟢"
            label="Active Now"
            value={activeCount}
            sub={activeCount > 0 ? "Live on platform" : "No live calls"}
            accent="green"
            delay={0.05}
          />
          <StatCard
            icon="✅"
            label="Completed"
            value={completedCount}
            sub="This page"
            accent="indigo"
            delay={0.1}
          />
          <StatCard
            icon="⏱️"
            label="Avg Duration"
            value={avgDurStr}
            sub={`From ${durations.length} timed calls`}
            accent="yellow"
            delay={0.15}
          />
        </div>

        {/* ── Status breakdown chips ── */}
        <div className={s.statusBreakdown}>
          {STATUS_TABS.slice(1).map((tab) => {
            const count = calls.filter((c) => c.status === tab.key).length;
            const meta = STATUS_META[tab.key];
            if (count === 0) return null;
            return (
              <button
                key={tab.key}
                className={`${s.statusChip} ${s[`statusChip_${meta.color}`]} ${filter === tab.key ? s.statusChipActive : ""}`}
                onClick={() => setFilter(filter === tab.key ? "ALL" : tab.key)}
              >
                {meta.icon} {tab.label}
                <span className={s.statusChipCount}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* ── Toolbar ── */}
        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => {
                  setFilter(tab.key);
                  setSearch("");
                }}
              >
                {tab.label}
                {tab.key !== "ALL" &&
                  calls.filter((c) => c.status === tab.key).length > 0 && (
                    <span className={s.tabCount}>
                      {calls.filter((c) => c.status === tab.key).length}
                    </span>
                  )}
              </button>
            ))}
          </div>

          <div className={s.searchBar}>
            <span className={s.searchIcon}>🔍</span>
            <input
              className={s.searchInput}
              placeholder="Search participant or booking…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button className={s.searchClear} onClick={() => setSearch("")}>
                ✕
              </button>
            )}
          </div>
        </div>

        {/* ── Active calls alert ── */}
        {activeCount > 0 && filter === "ALL" && !search && (
          <div className={s.activeBanner}>
            <div className={s.activeBannerDot} />
            <p className={s.activeBannerText}>
              <strong>
                {activeCount} call{activeCount > 1 ? "s" : ""}
              </strong>{" "}
              currently active on the platform
            </p>
            <button
              className={s.activeBannerBtn}
              onClick={() => setFilter("ACTIVE")}
            >
              View live →
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <div className={s.tableWrap}>
          <div className={s.tableHead}>
            <span>Participants</span>
            <span>Booking</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Initiated</span>
            <span>Actions</span>
          </div>

          <div className={s.tableBody}>
            {loading ? (
              <SkeletonRows />
            ) : filtered.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>📹</span>
                <p className={s.emptyTitle}>
                  {filter === "ALL" && !search
                    ? "No video calls yet"
                    : "No calls match your filters"}
                </p>
                <p className={s.emptySub}>
                  {filter !== "ALL" || search
                    ? "Try clearing your search or filters."
                    : "Video calls between users will appear here."}
                </p>
                {(filter !== "ALL" || search) && (
                  <button
                    className={s.emptyReset}
                    onClick={() => {
                      setFilter("ALL");
                      setSearch("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              filtered.map((call, i) => (
                <CallRow
                  key={call.id}
                  call={call}
                  index={i}
                  onDetail={setDetailCall}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && !search && filter === "ALL" && (
          <div className={s.pager}>
            <button
              className={s.pageBtn}
              disabled={page === 1 || loading}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailCall && (
        <DetailModal call={detailCall} onClose={() => setDetailCall(null)} />
      )}
    </AdminLayout>
  );
}
