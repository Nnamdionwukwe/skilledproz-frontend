// src/pages/videocalls/AdminVideoCalls.jsx
// Full admin video call oversight.
//
// Endpoints:
//   GET /admin/video-calls?page=&limit=
//
// Every field the backend sends is rendered. Emojis replaced with Lucide
// icons. Fully responsive. Uses platform AlertModal.

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Video,
  Radio,
  CheckCircle,
  Timer,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  PhoneOff,
  PhoneMissed,
  Play,
  Square,
  Clock,
  Calendar,
  User,
  Copy,
  Check,
  AlertTriangle,
  Inbox,
  Ban,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import api from "../../lib/api";
import s from "./AdminVideoCalls.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "INITIATED", label: "Initiated" }, // legacy alias
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "DECLINED", label: "Declined" },
  { key: "MISSED", label: "Missed" },
  { key: "ENDED", label: "Ended" },
];

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow", Icon: PhoneCall },
  INITIATED: { label: "Initiated", color: "yellow", Icon: PhoneCall },
  ACTIVE: { label: "Active", color: "green", Icon: Radio },
  COMPLETED: { label: "Completed", color: "indigo", Icon: CheckCircle },
  DECLINED: { label: "Declined", color: "red", Icon: PhoneOff },
  MISSED: { label: "Missed", color: "orange", Icon: PhoneMissed },
  ENDED: { label: "Ended", color: "dim", Icon: Square },
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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ─── CopyPill ─────────────────────────────────────────────────────────────────
function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={s.dimText}>—</span>;
  return (
    <span className={s.copyPill} title={String(text)}>
      <span className={s.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={s.copyPillBtn}
        onClick={async (e) => {
          e.stopPropagation();
          if (await copyText(text)) {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }
        }}
        aria-label="Copy"
      >
        {ok ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
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
  const m = STATUS_META[status] ?? {
    label: status,
    color: "dim",
    Icon: PhoneCall,
  };
  const Icon = m.Icon;
  return (
    <span className={`${s.badge} ${s[`badge_${m.color}`]}`}>
      <Icon size={10} /> {m.label}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{Icon ? <Icon size={16} /> : null}</span>
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

// ─── Call Timeline ────────────────────────────────────────────────────────────
function CallTimeline({ call }) {
  // Backend never sets acceptedAt/declinedAt — fall back to startedAt/updatedAt
  const acceptedTime =
    call.acceptedAt ?? (call.status !== "PENDING" ? call.startedAt : null);
  const declinedTime =
    call.declinedAt ?? (call.status === "DECLINED" ? call.updatedAt : null);
  const isDeclined = call.status === "DECLINED";

  const events = [
    {
      label: "Call initiated",
      time: call.createdAt,
      done: true,
      Icon: PhoneCall,
    },
    {
      label: isDeclined ? "Call declined" : "Call accepted",
      time: isDeclined ? declinedTime : acceptedTime,
      done: ["ACTIVE", "COMPLETED", "ENDED", "DECLINED"].includes(call.status),
      Icon: isDeclined ? PhoneOff : CheckCircle,
      isNeg: isDeclined,
    },
    {
      label: "In progress",
      time: call.startedAt,
      done: ["ACTIVE", "COMPLETED", "ENDED"].includes(call.status),
      Icon: Video,
    },
    {
      label: "Call ended",
      time: call.endedAt,
      done: ["COMPLETED", "ENDED"].includes(call.status),
      Icon: Square,
    },
  ];

  return (
    <div className={s.timeline}>
      {events.map((ev, i) => {
        const Icon = ev.Icon;
        return (
          <div
            key={i}
            className={`${s.timelineItem} ${ev.done ? s.timelineDone : ""} ${ev.isNeg ? s.timelineNeg : ""}`}
          >
            <div
              className={`${s.timelineDot} ${ev.done ? (ev.isNeg ? s.dotNeg : s.dotDone) : s.dotPending}`}
            >
              <Icon size={13} />
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
        );
      })}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function DetailModal({ call, onClose }) {
  const duration = fmtDuration(call.startedAt, call.endedAt);
  const statusMeta = STATUS_META[call.status] ?? {
    label: call.status,
    color: "dim",
    Icon: PhoneCall,
  };
  const StatusIcon = statusMeta.Icon;
  const bookingColor =
    BOOKING_STATUS_META[call.booking?.status]?.color ?? "#888";

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <div className={s.modalTitleRow}>
            <span className={s.modalIcon}>
              <Video size={16} />
            </span>
            <h3 className={s.modalTitle}>Video Call Detail</h3>
            <StatusBadge status={call.status} />
          </div>
          <button className={s.modalClose} onClick={onClose} aria-label="Close">
            <X size={15} />
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
              {call.initiator?.id && (
                <CopyPill
                  text={call.initiator.id}
                  label={`id ${call.initiator.id.slice(0, 8)}…`}
                />
              )}
            </div>

            <div className={s.heroDivider}>
              <div className={s.heroDividerLine} />
              <div className={s.heroDividerIcon}>
                {call.status === "ACTIVE" ? (
                  <Radio size={18} />
                ) : (
                  <PhoneCall size={16} />
                )}
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
              {call.receiver?.id && (
                <CopyPill
                  text={call.receiver.id}
                  label={`id ${call.receiver.id.slice(0, 8)}…`}
                />
              )}
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
                <StatusIcon size={12} /> {statusMeta.label}
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
              <span className={s.bookingCardIcon}>
                <Calendar size={16} />
              </span>
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

          {/* Identifiers */}
          <div className={s.idGrid}>
            <div className={s.idCell}>
              <span className={s.idCellLabel}>Call ID</span>
              <CopyPill text={call.id} label={call.id.slice(0, 12) + "…"} />
            </div>
            {call.bookingId && (
              <div className={s.idCell}>
                <span className={s.idCellLabel}>Booking ID</span>
                <CopyPill
                  text={call.bookingId}
                  label={call.bookingId.slice(0, 12) + "…"}
                />
              </div>
            )}
            {call.roomId && (
              <div className={s.idCell}>
                <span className={s.idCellLabel}>Room ID</span>
                <CopyPill
                  text={call.roomId}
                  label={
                    call.roomId.length > 20
                      ? call.roomId.slice(0, 20) + "…"
                      : call.roomId
                  }
                />
              </div>
            )}
            {call.initiatorId && (
              <div className={s.idCell}>
                <span className={s.idCellLabel}>Initiator ID</span>
                <CopyPill
                  text={call.initiatorId}
                  label={call.initiatorId.slice(0, 12) + "…"}
                />
              </div>
            )}
            {call.receiverId && (
              <div className={s.idCell}>
                <span className={s.idCellLabel}>Receiver ID</span>
                <CopyPill
                  text={call.receiverId}
                  label={call.receiverId.slice(0, 12) + "…"}
                />
              </div>
            )}
            {call.updatedAt && (
              <div className={s.idCell}>
                <span className={s.idCellLabel}>Updated</span>
                <span className={s.idCellVal}>
                  {fmtDateTime(call.updatedAt)}
                </span>
              </div>
            )}
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
  const isDeclined = call.status === "DECLINED";

  return (
    <div
      className={`${s.tableRow} ${isActive ? s.tableRowActive : ""} ${isDeclined ? s.tableRowDeclined : ""}`}
      style={{ animationDelay: `${index * 0.025}s` }}
    >
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
        <span className={s.tdDateSub} title={fmtDateTime(call.createdAt)}>
          {fmtRelative(call.createdAt)}
        </span>
      </div>

      {/* Action */}
      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(call)}
          title="View detail"
        >
          View
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
  const [notify, setNotify] = useState(null);
  const [detailCall, setDetailCall] = useState(null);

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
  }, [load]);

  // ── Client-side filter ───────────────────────────────────────────────────────
  const filtered = calls.filter((c) => {
    // Treat INITIATED as equivalent to PENDING (backend uses PENDING)
    const matchStatus =
      filter === "ALL" ||
      c.status === filter ||
      (filter === "INITIATED" && c.status === "PENDING") ||
      (filter === "PENDING" && c.status === "INITIATED");
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

  function showToast(type, msg) {
    setNotify({ type, text: msg });
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div className={s.page}>
        {/* ── Header ── */}
        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Platform</p>
            <h1 className={s.pageTitle}>
              <Video size={18} />
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
            icon={Video}
            label="Total Calls"
            value={total}
            sub="All time"
            accent="orange"
            delay={0}
          />
          <StatCard
            icon={Radio}
            label="Active Now"
            value={activeCount}
            sub={activeCount > 0 ? "Live on platform" : "No live calls"}
            accent="green"
            delay={0.05}
          />
          <StatCard
            icon={CheckCircle}
            label="Completed"
            value={completedCount}
            sub="This page"
            accent="indigo"
            delay={0.1}
          />
          <StatCard
            icon={Timer}
            label="Avg Duration"
            value={avgDurStr}
            sub={`From ${durations.length} timed calls`}
            accent="yellow"
            delay={0.15}
          />
        </div>

        {/* ── Status breakdown chips ── */}
        {calls.length > 0 && (
          <div className={s.statusBreakdown}>
            {STATUS_TABS.slice(1).map((tab) => {
              const count = calls.filter(
                (c) =>
                  c.status === tab.key ||
                  (tab.key === "INITIATED" && c.status === "PENDING") ||
                  (tab.key === "PENDING" && c.status === "INITIATED"),
              ).length;
              if (count === 0) return null;
              const meta = STATUS_META[tab.key];
              const Icon = meta.Icon;
              return (
                <button
                  key={tab.key}
                  className={`${s.statusChip} ${s[`statusChip_${meta.color}`]} ${filter === tab.key ? s.statusChipActive : ""}`}
                  onClick={() =>
                    setFilter(filter === tab.key ? "ALL" : tab.key)
                  }
                >
                  <Icon size={11} /> {tab.label}
                  <span className={s.statusChipCount}>{count}</span>
                </button>
              );
            })}
          </div>
        )}

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
                  (() => {
                    const cnt = calls.filter(
                      (c) =>
                        c.status === tab.key ||
                        (tab.key === "INITIATED" && c.status === "PENDING") ||
                        (tab.key === "PENDING" && c.status === "INITIATED"),
                    ).length;
                    return cnt > 0 ? (
                      <span className={s.tabCount}>{cnt}</span>
                    ) : null;
                  })()}
              </button>
            ))}
          </div>

          <div className={s.searchBar}>
            <span className={s.searchIcon}>
              <Search size={13} />
            </span>
            <input
              className={s.searchInput}
              placeholder="Search participant or booking…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className={s.searchClear}
                onClick={() => setSearch("")}
                aria-label="Clear search"
              >
                <X size={13} />
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
              View live
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
                <span className={s.emptyIcon}>
                  <Inbox size={40} />
                </span>
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
              <ChevronLeft size={13} /> Prev
            </button>
            <span className={s.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={s.pageBtn}
              disabled={page === pages || loading}
              onClick={() => load(page + 1)}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* ── Detail Modal ── */}
      {detailCall && (
        <DetailModal call={detailCall} onClose={() => setDetailCall(null)} />
      )}

      {/* ── Platform AlertModal ── */}
      <AlertModal
        isOpen={!!notify}
        onClose={() => setNotify(null)}
        title={notify?.type === "error" ? "Something went wrong" : "Done"}
        subtitle={
          notify?.type === "error"
            ? "The action could not be completed."
            : "The action was completed successfully."
        }
        alerts={
          notify
            ? [
                {
                  icon: notify.type === "error" ? AlertTriangle : CheckCircle,
                  label: notify.type === "error" ? "Error" : "Success",
                  description: notify.text,
                  variant: notify.type === "error" ? "red" : "green",
                },
              ]
            : []
        }
      />
    </AdminLayout>
  );
}
