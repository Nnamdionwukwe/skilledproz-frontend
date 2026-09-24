import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminDisputes.module.css";

// ─── Icons (react-icons — Feather family) ─────────────────────────────────────
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiFolder,
  FiUser,
  FiTool,
  FiCheck,
  FiX,
  FiChevronLeft,
  FiChevronRight,
  FiRefreshCw,
  FiDollarSign,
  FiExternalLink,
  FiInfo,
} from "react-icons/fi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n, currency = "") {
  if (!n && n !== 0) return "—";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(n);
  return currency ? `${currency} ${formatted}` : formatted;
}

function timeAgo(d) {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>{icon}</span>
      <div>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
      </div>
    </div>
  );
}

// ─── Party Card ───────────────────────────────────────────────────────────────

function PartyCard({ user, role }) {
  const isHirer = role === "hirer";
  return (
    <div
      className={`${styles.partyCard} ${isHirer ? styles.partyCardHirer : styles.partyCardWorker}`}
    >
      <div className={styles.partyLabel}>
        {isHirer ? (
          <>
            <FiUser size={11} /> Hirer
          </>
        ) : (
          <>
            <FiTool size={11} /> Worker
          </>
        )}
      </div>
      <div className={styles.partyAvatar}>
        {user?.avatar ? (
          <img src={user.avatar} alt="" />
        ) : (
          `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
        )}
      </div>
      <div className={styles.partyName}>
        {user?.firstName} {user?.lastName}
      </div>
      <div className={styles.partyEmail}>{user?.email ?? "—"}</div>
      {user?.phone && <div className={styles.partyPhone}>{user.phone}</div>}
    </div>
  );
}

// ─── Resolution Buttons ───────────────────────────────────────────────────────

const RESOLUTIONS = [
  {
    key: "REFUND",
    label: "Refund Hirer",
    icon: FiDollarSign,
    sub: "Create refund · cancel booking · move money",
    cls: "refundBtn",
  },
  {
    key: "RELEASE",
    label: "Release to Worker",
    icon: FiCheckCircle,
    sub: "Release escrow · complete booking · pay worker",
    cls: "releaseBtn",
  },
];

// ─── Dispute Card ─────────────────────────────────────────────────────────────

function DisputeCard({ dispute: d, isResolved, onResolved, i }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [refundPercent, setRefundPercent] = useState(100);
  const [resolving, setResolving] = useState(null); // resolution key being processed
  const [toast, setToast] = useState(null);

  // ── Dispute-model field reads ─────────────────────────────────────────────
  const booking = d.booking || {};
  // Backend tells us who raised → the other party is "against"
  const hirer = d.raisedByRole === "HIRER" ? d.raisedBy : d.against;
  const worker = d.raisedByRole === "WORKER" ? d.raisedBy : d.against;
  const rawStatus = d.rawStatus || d.status;
  const isOpen = rawStatus === "PENDING_REVIEW";

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleResolve(res) {
    setResolving(res);
    try {
      // ── Body shape matches dispute.controller.js §4 ─────────────────────
      const body = {
        resolution: res,
        adminNotes: notes || undefined,
      };
      if (res === "REFUND") {
        const pct = Math.max(1, Math.min(100, Number(refundPercent) || 100));
        body.refundPercentage = pct;
      }
      await api.patch(`/disputes/admin/${d.id}/resolve`, body);
      showToast(
        res === "REFUND"
          ? `Hirer refunded (${refundPercent}%) — booking cancelled, refund created`
          : "Escrow released to worker — booking completed",
      );
      setTimeout(() => onResolved(d.id), 1500);
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Failed to resolve dispute",
        "error",
      );
    } finally {
      setResolving(null);
    }
  }

  return (
    <div
      className={`${styles.disputeCard} ${open ? styles.disputeCardOpen : ""} ${isResolved ? styles.disputeCardResolved : ""}`}
      style={{ animationDelay: `${i * 45}ms` }}
    >
      <Toast toast={toast} />

      {/* ── Card Header ── */}
      <div
        className={styles.disputeCardHeader}
        onClick={() => setOpen((o) => !o)}
      >
        <div className={styles.disputeAvatars}>
          <div className={styles.da}>{hirer?.firstName?.[0] ?? "?"}</div>
          <div className={`${styles.da} ${styles.daB}`}>
            {worker?.firstName?.[0] ?? "?"}
          </div>
        </div>

        <div className={styles.disputeMain}>
          <h3 className={styles.disputeTitle}>
            {booking.title || "Untitled Booking"}
          </h3>
          <p className={styles.disputePeople}>
            <span className={styles.hirerSpan}>
              <FiUser size={11} /> {hirer?.firstName} {hirer?.lastName}
            </span>
            <span className={styles.vsDot}>vs</span>
            <span className={styles.workerSpan}>
              <FiTool size={11} /> {worker?.firstName} {worker?.lastName}
            </span>
          </p>
          <p className={styles.disputeMeta}>
            {/* ── Category (backend sends on booking.category) ── */}
            {booking.category?.name && (
              <span>
                {booking.category.icon ? `${booking.category.icon} ` : ""}
                {booking.category.name}
              </span>
            )}
            {booking.category?.name && (
              <span className={styles.metaDot}>·</span>
            )}
            <span>Raised {timeAgo(d.createdAt)}</span>
            {/* ── Raw status chip ── */}
            <span className={styles.metaDot}>·</span>
            <span style={{ textTransform: "capitalize" }}>
              {rawStatus.replace("_", " ").toLowerCase()}
            </span>
          </p>
        </div>

        <div className={styles.disputeRight}>
          <span className={styles.disputeAmount}>
            {booking.currency || "₦"}
            {fmt(booking.agreedRate)}
          </span>
          {/* ── Refund summary if a refund was created from this dispute ── */}
          {d.refund && (
            <span
              className={`${styles.payStatusPill} ${styles[`payStatus_${d.refund.status}`]}`}
            >
              Refund {d.refund.status}
            </span>
          )}
          <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {open && (
        <div className={styles.disputeDetail}>
          {/* ── Dispute reason block (Dispute model fields) ── */}
          <div className={styles.paymentBlock}>
            <p className={styles.blockTitle}>Dispute Details</p>
            <div className={styles.payGrid}>
              {d.disputeReason && (
                <PayRow label="Reason" value={d.disputeReason} highlight />
              )}
              {d.disputeDescription && (
                <PayRow label="Description" value={d.disputeDescription} />
              )}
              {Array.isArray(d.disputeEvidence) &&
                d.disputeEvidence.length > 0 && (
                  <PayRow
                    label="Evidence"
                    value={
                      <span style={{ display: "inline-flex", gap: "0.5rem" }}>
                        {d.disputeEvidence.map((url, idx) => (
                          <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                            }}
                          >
                            File {idx + 1} <FiExternalLink size={10} />
                          </a>
                        ))}
                      </span>
                    }
                  />
                )}
              <PayRow label="Raised By" value={d.raisedByRole || "—"} />
              <PayRow label="Raised On" value={fmtDate(d.createdAt)} />
              <PayRow
                label="Previous Booking Status"
                value={booking.status || "—"}
              />
            </div>
          </div>

          {/* ── Booking meta ── */}
          <div className={styles.paymentBlock}>
            <p className={styles.blockTitle}>Booking Details</p>
            <div className={styles.payGrid}>
              {booking.description && (
                <PayRow label="Description" value={booking.description} />
              )}
              {booking.address && (
                <PayRow label="Address" value={booking.address} />
              )}
              {booking.jobType && (
                <PayRow label="Job Type" value={booking.jobType} />
              )}
              {booking.locationType && (
                <PayRow label="Location Type" value={booking.locationType} />
              )}
              {booking.scheduledAt && (
                <PayRow
                  label="Scheduled"
                  value={fmtDate(booking.scheduledAt)}
                />
              )}
              {booking.estimatedHours != null && (
                <PayRow
                  label="Estimated Hours"
                  value={booking.estimatedHours}
                />
              )}
              {booking.estimatedUnit && (
                <PayRow label="Unit" value={booking.estimatedUnit} />
              )}
              {booking.estimatedValue && (
                <PayRow
                  label="Estimated Value"
                  value={booking.estimatedValue}
                />
              )}
              {booking.quantity != null && booking.quantity !== 1 && (
                <PayRow label="Quantity" value={booking.quantity} />
              )}
              {booking.isNegotiated && (
                <PayRow label="Was Negotiated" value="Yes" />
              )}
              {booking.negotiatedRate != null && (
                <PayRow
                  label="Negotiated Rate"
                  value={`${booking.currency || "₦"}${fmt(booking.negotiatedRate)}`}
                />
              )}
              {booking.negotiationNote && (
                <PayRow
                  label="Negotiation Note"
                  value={booking.negotiationNote}
                />
              )}
              {booking.completedAt && (
                <PayRow
                  label="Completed"
                  value={fmtDate(booking.completedAt)}
                />
              )}
              {booking.cancelReason && (
                <PayRow label="Cancel Reason" value={booking.cancelReason} />
              )}
            </div>
          </div>

          {/* Parties */}
          <div className={styles.partyRow}>
            <PartyCard user={hirer} role="hirer" />
            <div className={styles.vsBlock}>
              <span className={styles.vsText}>vs</span>
            </div>
            <PartyCard user={worker} role="worker" />
          </div>

          {/* ── Refund summary (if created from this dispute) ── */}
          {d.refund && (
            <div className={styles.paymentBlock}>
              <p className={styles.blockTitle}>Linked Refund</p>
              <div className={styles.payGrid}>
                <PayRow label="Reference" value={d.refund.reference} />
                <PayRow
                  label="Amount"
                  value={`${d.refund.currency || "₦"}${fmt(d.refund.amount)}`}
                />
                <PayRow label="Status" value={d.refund.status} highlight />
                <PayRow label="Type" value={d.refund.refundType || "DISPUTE"} />
              </div>
            </div>
          )}

          {/* ── Resolution info if already resolved ── */}
          {!isOpen && (
            <div className={styles.paymentBlock}>
              <p className={styles.blockTitle}>Resolution</p>
              <div className={styles.payGrid}>
                {d.resolution && (
                  <PayRow label="Resolution" value={d.resolution} highlight />
                )}
                {d.resolvedAt && (
                  <PayRow label="Resolved At" value={fmtDate(d.resolvedAt)} />
                )}
                {d.resolvedBy && (
                  <PayRow
                    label="Resolved By"
                    value={`${d.resolvedBy.firstName ?? ""} ${d.resolvedBy.lastName ?? ""}`.trim()}
                  />
                )}
                {d.adminNotes && (
                  <PayRow label="Admin Notes" value={d.adminNotes} />
                )}
              </div>
            </div>
          )}

          {/* Timeline chips */}
          <div className={styles.timelineRow}>
            {[
              { label: "Dispute raised", val: d.createdAt },
              { label: "Booking created", val: booking.createdAt },
            ]
              .filter((t) => t.val)
              .map((t) => (
                <div key={t.label} className={styles.timelineChip}>
                  <span className={styles.timelineLabel}>{t.label}</span>
                  <span className={styles.timelineVal}>{fmtDate(t.val)}</span>
                </div>
              ))}
          </div>

          {/* ── Admin notes + resolution actions (only when open) ── */}
          {!isResolved && isOpen && (
            <>
              <div className={styles.notesSection}>
                <label className={styles.notesLabel}>
                  Admin notes{" "}
                  <span className={styles.optional}>
                    (shared with both parties)
                  </span>
                </label>
                <textarea
                  className={styles.notesInput}
                  placeholder="Document your ruling. This message is included in the notification to both parties..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={styles.resolutionBlock}>
                <p className={styles.blockTitle}>Choose a Resolution</p>

                {/* ── Refund percentage selector ── */}
                <div className={styles.refundPercentRow}>
                  <label htmlFor={`pct-${d.id}`}>Refund %</label>
                  <input
                    id={`pct-${d.id}`}
                    type="number"
                    min={1}
                    max={100}
                    value={refundPercent}
                    onChange={(e) => setRefundPercent(e.target.value)}
                    className={styles.refundPercentInput}
                  />
                  <span className={styles.refundPercentHint}>
                    1–100 · only used when REFUND is chosen
                  </span>
                </div>

                <div className={styles.resolveActions}>
                  {RESOLUTIONS.map((res) => {
                    const Icon = res.icon;
                    return (
                      <button
                        key={res.key}
                        className={`${styles.resolveBtn} ${styles[res.cls]}`}
                        onClick={() => handleResolve(res.key)}
                        disabled={resolving !== null}
                        title={res.sub}
                      >
                        {resolving === res.key ? (
                          <span className={styles.spinnerText}>
                            <FiRefreshCw size={13} style={{ marginRight: 4 }} />
                            Processing…
                          </span>
                        ) : (
                          <>
                            <span className={styles.resolveBtnLabel}>
                              <Icon size={13} /> {res.label}
                            </span>
                            <span className={styles.resolveBtnSub}>
                              {res.sub}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className={styles.splitNote}>
                  <FiInfo size={12} />
                  Refund creates a Refund record and moves money back to the
                  hirer. Release pays the worker from escrow. Both close the
                  dispute immediately — a full history is visible in the Refunds
                  page.
                </p>
              </div>
            </>
          )}

          {/* ── Already resolved ── */}
          {isResolved && (
            <div className={styles.resolvedBadge}>
              <FiCheckCircle size={14} />
              This dispute has been resolved
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PayRow({ label, value, highlight }) {
  return (
    <div className={styles.payRow}>
      <span className={styles.payRowLabel}>{label}</span>
      <span
        className={`${styles.payRowValue} ${highlight ? styles.payRowHighlight : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminDisputes() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [disputes, setDisputes] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [pageToast, setPageToast] = useState(null);

  // tab: "open" | "resolved"
  const tab = searchParams.get("tab") || "open";
  const page = parseInt(searchParams.get("page") || "1");

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  const isResolved = tab === "resolved";

  // Backend `getAllDisputes` accepts `?status=` and paginates by Dispute rows.
  //   open    → status = PENDING_REVIEW
  //   resolved → no status filter (returns all); we filter client-side for
  //              resolved ones because the backend filter is a single status
  const fetchDisputes = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (!isResolved) params.status = "PENDING_REVIEW";

    api
      .get("/disputes/admin/all", { params })
      .then((r) => {
        const data = r.data.data;
        let list = data.disputes || [];
        if (isResolved) {
          // Keep only resolved statuses when on the resolved tab
          list = list.filter(
            (d) =>
              d.rawStatus &&
              ["RESOLVED_REFUND", "RESOLVED_RELEASE", "CANCELLED"].includes(
                d.rawStatus,
              ),
          );
        }
        setDisputes(list);
        setTotal(data.total || 0);
        setPages(data.pages || 1);
      })
      .catch(() => {
        setPageToast({ msg: "Failed to load disputes", type: "error" });
        setTimeout(() => setPageToast(null), 3000);
      })
      .finally(() => setLoading(false));
  }, [page, isResolved]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  function handleResolved(id) {
    setDisputes((prev) => prev.filter((d) => d.id !== id));
    setTotal((t) => Math.max(0, t - 1));
    if (!isResolved) {
      setPageToast({
        msg: "Dispute resolved and removed from queue",
        type: "success",
      });
      setTimeout(() => setPageToast(null), 3500);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={pageToast} />

        {/* ── Stats Bar ── */}
        <div className={styles.statsBar}>
          <StatCard
            icon={<FiAlertCircle size={16} />}
            label="Showing"
            value={total}
            accent={!isResolved && total > 0 ? "red" : undefined}
          />
          <StatCard
            icon={<FiFileText size={16} />}
            label="This page"
            value={disputes.length}
          />
          <StatCard
            icon={<FiFileText size={16} />}
            label="Pages"
            value={pages}
          />
        </div>

        {/* ── Tab Row ── */}
        <div className={styles.tabRow}>
          <div className={styles.tabGroup}>
            <button
              className={`${styles.tab} ${!isResolved ? styles.tabActive : ""}`}
              onClick={() => setParam("tab", "")}
            >
              <FiAlertCircle size={13} /> Open Disputes
            </button>
            <button
              className={`${styles.tab} ${isResolved ? styles.tabActive : ""}`}
              onClick={() => setParam("tab", "resolved")}
            >
              <FiCheckCircle size={13} /> Resolved History
            </button>
          </div>
          <div className={styles.totalPill}>
            {fmt(total)} {isResolved ? "resolved" : "open"}
          </div>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className={styles.skList}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={styles.skeleton} style={{ height: 96 }} />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className={styles.empty}>
            <span>
              {isResolved ? (
                <FiFolder size={40} />
              ) : (
                <FiAlertCircle size={40} />
              )}
            </span>
            <p>{isResolved ? "No resolved disputes" : "No active disputes"}</p>
            <small>
              {isResolved
                ? "Nothing has been resolved yet."
                : "All disputes have been resolved. Great work!"}
            </small>
          </div>
        ) : (
          <div className={styles.disputeList}>
            {disputes.map((d, i) => (
              <DisputeCard
                key={d.id}
                dispute={d}
                isResolved={isResolved}
                onResolved={handleResolved}
                i={i}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              <FiChevronLeft size={13} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages} · {fmt(total)} total
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <FiChevronRight size={13} />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
