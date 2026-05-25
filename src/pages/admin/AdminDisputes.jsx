import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminDisputes.module.css";

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
        {isHirer ? "🧑 Hirer" : "🔨 Worker"}
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

// ─── Resolution Button ────────────────────────────────────────────────────────

const RESOLUTIONS = [
  {
    key: "REFUND",
    label: "💸 Refund Hirer",
    sub: "Cancel booking · mark payment refunded",
    cls: "refundBtn",
    body: { refundHirer: true, releaseToWorker: false },
  },
  {
    key: "SPLIT",
    label: "✂️ Manual Split",
    sub: "Complete booking · payment stays held",
    cls: "splitBtn",
    body: { refundHirer: false, releaseToWorker: false },
  },
  {
    key: "RELEASE",
    label: "✅ Release to Worker",
    sub: "Complete booking · release escrow",
    cls: "releaseBtn",
    body: { refundHirer: false, releaseToWorker: true },
  },
];

// ─── Dispute Card ─────────────────────────────────────────────────────────────

function DisputeCard({ dispute: d, isResolved, onResolved, i }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [resolving, setResolving] = useState(null); // resolution key being processed
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleResolve(res) {
    const def = RESOLUTIONS.find((r) => r.key === res);
    setResolving(res);
    try {
      await api.patch(`/admin/disputes/${d.id}/resolve`, {
        resolution: res,
        notes, // controller expects "notes" not "adminNotes"
        ...def.body,
      });
      showToast(
        res === "REFUND"
          ? "Hirer refunded — booking cancelled"
          : res === "RELEASE"
            ? "Payment released to worker — booking completed"
            : "Split marked — handle payment manually",
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
          <div className={styles.da}>{d.hirer?.firstName?.[0] ?? "?"}</div>
          <div className={`${styles.da} ${styles.daB}`}>
            {d.worker?.firstName?.[0] ?? "?"}
          </div>
        </div>

        <div className={styles.disputeMain}>
          <h3 className={styles.disputeTitle}>
            {d.title || "Untitled Booking"}
          </h3>
          <p className={styles.disputePeople}>
            <span className={styles.hirerSpan}>
              🧑 {d.hirer?.firstName} {d.hirer?.lastName}
            </span>
            <span className={styles.vsDot}>vs</span>
            <span className={styles.workerSpan}>
              🔨 {d.worker?.firstName} {d.worker?.lastName}
            </span>
          </p>
          <p className={styles.disputeMeta}>
            {d.category?.name && <span>{d.category.name}</span>}
            {d.category?.name && <span className={styles.metaDot}>·</span>}
            <span>Opened {timeAgo(d.updatedAt)}</span>
            {d.createdAt && (
              <>
                <span className={styles.metaDot}>·</span>
                <span>Booked {fmtDate(d.createdAt)}</span>
              </>
            )}
          </p>
        </div>

        <div className={styles.disputeRight}>
          <span className={styles.disputeAmount}>₦{fmt(d.agreedRate)}</span>
          {d.payment && (
            <span
              className={`${styles.payStatusPill} ${styles[`payStatus_${d.payment.status}`]}`}
            >
              {d.payment.status === "HELD" ? "🔒 Escrow" : d.payment.status}
            </span>
          )}
          <span className={styles.chevron}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded Detail ── */}
      {open && (
        <div className={styles.disputeDetail}>
          {/* Parties */}
          <div className={styles.partyRow}>
            <PartyCard user={d.hirer} role="hirer" />
            <div className={styles.vsBlock}>
              <span className={styles.vsText}>vs</span>
            </div>
            <PartyCard user={d.worker} role="worker" />
          </div>

          {/* Payment breakdown */}
          {d.payment && (
            <div className={styles.paymentBlock}>
              <p className={styles.blockTitle}>Payment Breakdown</p>
              <div className={styles.payGrid}>
                <PayRow
                  label="Total Paid"
                  value={`₦${fmt(d.payment.amount)}`}
                />
                <PayRow
                  label="Worker Payout"
                  value={`₦${fmt(d.payment.workerPayout)}`}
                />
                <PayRow
                  label="Platform Fee"
                  value={`₦${fmt(d.payment.platformFee)}`}
                />
                <PayRow label="Provider" value={d.payment.provider || "—"} />
                <PayRow
                  label="Payment Status"
                  value={d.payment.status}
                  highlight
                />
                {d.payment.refundedAt && (
                  <PayRow
                    label="Refunded At"
                    value={fmtDate(d.payment.refundedAt)}
                  />
                )}
              </div>
            </div>
          )}

          {/* Timeline chips */}
          <div className={styles.timelineRow}>
            {[
              { label: "Booking created", val: d.createdAt },
              { label: "Dispute raised", val: d.updatedAt },
            ].map((t) => (
              <div key={t.label} className={styles.timelineChip}>
                <span className={styles.timelineLabel}>{t.label}</span>
                <span className={styles.timelineVal}>{fmtDate(t.val)}</span>
              </div>
            ))}
          </div>

          {/* Admin notes — key fixed to "notes" matching the controller */}
          {!isResolved && (
            <>
              <div className={styles.notesSection}>
                <label className={styles.notesLabel}>
                  Admin notes{" "}
                  <span className={styles.optional}>
                    (sent to both parties)
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

              {/* Resolution actions */}
              <div className={styles.resolutionBlock}>
                <p className={styles.blockTitle}>Choose a Resolution</p>
                <div className={styles.resolveActions}>
                  {RESOLUTIONS.map((res) => (
                    <button
                      key={res.key}
                      className={`${styles.resolveBtn} ${styles[res.cls]}`}
                      onClick={() => handleResolve(res.key)}
                      disabled={resolving !== null}
                      title={res.sub}
                    >
                      {resolving === res.key ? (
                        <span className={styles.spinnerText}>Processing…</span>
                      ) : (
                        <>
                          <span className={styles.resolveBtnLabel}>
                            {res.label}
                          </span>
                          <span className={styles.resolveBtnSub}>
                            {res.sub}
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
                <p className={styles.splitNote}>
                  ✂️ Manual Split keeps the booking completed and payment held —
                  process individual transfers outside the platform.
                </p>
              </div>
            </>
          )}

          {/* Resolved state */}
          {isResolved && (
            <div className={styles.resolvedBadge}>
              ✅ This dispute has been resolved
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

  // resolved=false → open disputes (default)
  // resolved=true  → resolved disputes history
  const tab = searchParams.get("tab") || "open"; // "open" | "resolved"
  const page = parseInt(searchParams.get("page") || "1");

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  const isResolved = tab === "resolved";

  const fetchDisputes = useCallback(() => {
    setLoading(true);
    const params = {
      page,
      limit: 15,
      resolved: isResolved ? "true" : "false",
    };
    api
      .get("/admin/disputes", { params })
      .then((r) => {
        const d = r.data.data;
        setDisputes(d.disputes || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
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
            icon="⚖️"
            label="Showing"
            value={total}
            accent={!isResolved && total > 0 ? "red" : undefined}
          />
          <StatCard icon="📋" label="This page" value={disputes.length} />
          <StatCard icon="📄" label="Pages" value={pages} />
        </div>

        {/* ── Tab Row ── */}
        <div className={styles.tabRow}>
          <div className={styles.tabGroup}>
            <button
              className={`${styles.tab} ${!isResolved ? styles.tabActive : ""}`}
              onClick={() => setParam("tab", "")}
            >
              ⚖️ Open Disputes
            </button>
            <button
              className={`${styles.tab} ${isResolved ? styles.tabActive : ""}`}
              onClick={() => setParam("tab", "resolved")}
            >
              ✅ Resolved History
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
            <span>{isResolved ? "📂" : "⚖️"}</span>
            <p>{isResolved ? "No resolved disputes" : "No active disputes"}</p>
            <small>
              {isResolved
                ? "Nothing has been resolved yet."
                : "All disputes have been resolved. Great work! 🎉"}
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
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages} · {fmt(total)} total
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
