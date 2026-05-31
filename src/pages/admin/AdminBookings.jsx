import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminBookings.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUSES = [
  "ALL",
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

const STATUS_META = {
  PENDING: { label: "Pending", cls: "yellow" },
  ACCEPTED: { label: "Accepted", cls: "blue" },
  IN_PROGRESS: { label: "In Progress", cls: "orange" },
  COMPLETED: { label: "Completed", cls: "green" },
  CANCELLED: { label: "Cancelled", cls: "dim" },
  DISPUTED: { label: "Disputed", cls: "red" },
};

const PAYMENT_META = {
  PENDING: { label: "Pending", cls: "dim" },
  HELD: { label: "Held", cls: "indigo" },
  RELEASED: { label: "Released", cls: "green" },
  REFUNDED: { label: "Refunded", cls: "blue" },
  FAILED: { label: "Failed", cls: "red" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
function fmtAmt(amount, currency = "₦") {
  if (!amount && amount !== 0) return "—";
  return `${currency} ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}
function timeAgo(d) {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { label: status, cls: "dim" };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}

function PayBadge({ status }) {
  if (!status) return null;
  const m = PAYMENT_META[status] || { label: status, cls: "dim" };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}

function Avatar({ user, size = 30 }) {
  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
      )}
    </div>
  );
}

// ─── Status Override Modal ────────────────────────────────────────────────────

const VALID_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

function StatusModal({ booking, onConfirm, onClose, loading }) {
  const [status, setStatus] = useState(booking.status);
  const [notes, setNotes] = useState("");

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>Override Booking Status</p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            Both parties will be notified of this change.
          </p>
          <div className={styles.statusOptions}>
            {VALID_STATUSES.map((s) => (
              <button
                key={s}
                className={`${styles.statusOption} ${status === s ? styles.statusOptionActive : ""} ${styles[`statusOpt_${STATUS_META[s]?.cls}`]}`}
                onClick={() => setStatus(s)}
              >
                {STATUS_META[s]?.label || s}
              </button>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            placeholder="Admin note (sent to both parties in notification)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.modalConfirm}
              onClick={() => onConfirm(status, notes)}
              disabled={loading || status === booking.status}
            >
              {loading ? <span className={styles.spinner} /> : "Apply Override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Action Modal ─────────────────────────────────────────────────────

function PaymentModal({ bookingId, action, onConfirm, onClose, loading }) {
  const [notes, setNotes] = useState("");
  const isRelease = action === "release";
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p
            className={styles.modalTitle}
            style={{ color: isRelease ? "var(--green)" : "var(--blue)" }}
          >
            {isRelease ? "💰 Release Payment to Worker" : "💸 Refund Hirer"}
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            {isRelease
              ? "Releases escrow to the worker. Booking will be marked Completed."
              : "Refunds the hirer. Booking will be marked Cancelled."}
          </p>
          <textarea
            className={styles.textarea}
            placeholder="Reason / audit note (optional)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
          />
          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={isRelease ? styles.modalRelease : styles.modalRefund}
              onClick={() => onConfirm(notes)}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : isRelease ? (
                "✅ Confirm Release"
              ) : (
                "💸 Confirm Refund"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Booking Detail Panel ─────────────────────────────────────────────────────

function BookingDetailPanel({ bookingId, onStatusOverride, onPaymentAction }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // GET /admin/bookings/:bookingId — getAdminBookingDetail
    api
      .get(`/admin/bookings/${bookingId}`)
      .then((r) => setDetail(r.data.data?.booking))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className={styles.detailPanel}>
        {[1, 2, 3].map((i) => (
          <div key={i} className={styles.detailSk} />
        ))}
      </div>
    );
  }

  if (!detail) {
    return (
      <div className={styles.detailPanel}>
        <p className={styles.detailErr}>Failed to load detail.</p>
      </div>
    );
  }

  const pmt = detail.payment;
  const msgs = detail.conversation?.messages || [];

  return (
    <div className={styles.detailPanel}>
      {/* Parties */}
      <div className={styles.detailRow}>
        {/* Hirer */}
        <div className={styles.partyCard}>
          <p className={styles.partyRole}>🧑 Hirer</p>
          <div className={styles.partyUser}>
            <Avatar user={detail.hirer} size={32} />
            <div>
              <p className={styles.partyName}>
                {detail.hirer?.firstName} {detail.hirer?.lastName}
              </p>
              <p className={styles.partyEmail}>{detail.hirer?.email}</p>
              {detail.hirer?.phone && (
                <p className={styles.partyPhone}>{detail.hirer.phone}</p>
              )}
            </div>
          </div>
        </div>

        <div className={styles.vsChip}>→</div>

        {/* Worker */}
        <div className={styles.partyCard}>
          <p className={styles.partyRole}>🔨 Worker</p>
          <div className={styles.partyUser}>
            <Avatar user={detail.worker} size={32} />
            <div>
              <p className={styles.partyName}>
                {detail.worker?.firstName} {detail.worker?.lastName}
              </p>
              <p className={styles.partyEmail}>{detail.worker?.email}</p>
              {detail.worker?.phone && (
                <p className={styles.partyPhone}>{detail.worker.phone}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Booking meta */}
      <div className={styles.metaGrid}>
        <MetaField label="Category" value={detail.category?.name || "—"} />
        <MetaField
          label="Agreed Rate"
          value={fmtAmt(detail.agreedRate, detail.currency || "₦")}
        />
        <MetaField
          label="Scheduled"
          value={
            detail.scheduledAt
              ? `${fmtDate(detail.scheduledAt)} ${fmtTime(detail.scheduledAt)}`
              : "—"
          }
        />
        <MetaField label="Created" value={fmtDate(detail.createdAt)} />
        <MetaField label="Address" value={detail.address || "—"} />
        <MetaField label="Job Type" value={detail.jobType || "—"} />
      </div>

      {/* Payment breakdown */}
      {pmt && (
        <div className={styles.payBlock}>
          <p className={styles.blockTitle}>Payment</p>
          <div className={styles.payGrid}>
            <PayRow
              label="Total Amount"
              value={fmtAmt(pmt.amount, pmt.currency)}
            />
            <PayRow
              label="Worker Payout"
              value={fmtAmt(pmt.workerPayout, pmt.currency)}
            />
            <PayRow
              label="Platform Fee"
              value={fmtAmt(pmt.platformFee, pmt.currency)}
            />
            <PayRow label="Provider" value={pmt.provider || "—"} />
            <PayRow label="Status" value={<PayBadge status={pmt.status} />} />
            {pmt.refundedAt && (
              <PayRow label="Refunded At" value={fmtDate(pmt.refundedAt)} />
            )}
            {pmt.escrowReleasedAt && (
              <PayRow
                label="Released At"
                value={fmtDate(pmt.escrowReleasedAt)}
              />
            )}
          </div>
        </div>
      )}

      {/* Recent messages */}
      {msgs.length > 0 && (
        <div className={styles.msgsBlock}>
          <p className={styles.blockTitle}>Recent Messages ({msgs.length})</p>
          <div className={styles.msgList}>
            {msgs.slice(-4).map((m, i) => (
              <div key={i} className={styles.msgRow}>
                <span className={styles.msgSender}>
                  {m.sender?.firstName ?? "?"}
                </span>
                <span className={styles.msgText}>
                  {m.content?.slice(0, 100)}
                  {m.content?.length > 100 ? "…" : ""}
                </span>
                <span className={styles.msgTime}>{timeAgo(m.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin actions */}
      <div className={styles.adminActions}>
        <button
          className={styles.actionOverride}
          onClick={() => onStatusOverride(detail)}
        >
          🔄 Override Status
        </button>
        {pmt?.status === "HELD" && (
          <>
            <button
              className={styles.actionRelease}
              onClick={() => onPaymentAction(detail.id, "release")}
            >
              ✅ Release Payment
            </button>
            <button
              className={styles.actionRefund}
              onClick={() => onPaymentAction(detail.id, "refund")}
            >
              💸 Refund Hirer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function MetaField({ label, value }) {
  return (
    <div className={styles.metaField}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

function PayRow({ label, value }) {
  return (
    <div className={styles.payRow}>
      <span className={styles.payLabel}>{label}</span>
      <span className={styles.payValue}>{value}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminBookings() {
  const [searchParams, setSearchParams] = useSearchParams();

  const statusFilter = searchParams.get("status") || "ALL";
  const search = searchParams.get("search") || "";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [expanded, setExpanded] = useState(null); // bookingId

  // Modals
  const [statusModal, setStatusModal] = useState(null); // booking object
  const [payModal, setPayModal] = useState(null); // { bookingId, action }
  const [acting, setActing] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  // ── Fetch bookings — GET /admin/bookings ──────────────────────────────────

  const fetchBookings = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (statusFilter !== "ALL") params.status = statusFilter;
    if (search) params.search = search;
    if (from) params.from = from;
    if (to) params.to = to;

    api
      .get("/admin/bookings", { params })
      .then((r) => {
        const d = r.data.data;
        setBookings(d.bookings || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(() => showToast("Failed to load bookings", "error"))
      .finally(() => setLoading(false));
  }, [statusFilter, search, from, to, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Fetch overview stats for the stats bar
  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setOverview(r.data.data?.overview))
      .catch(console.error);
  }, []);

  // ── Status override — PATCH /admin/bookings/:bookingId/status ─────────────

  async function handleStatusOverride(status, notes) {
    if (!statusModal) return;
    setActing(true);
    try {
      await api.patch(`/admin/bookings/${statusModal.id}/status`, {
        status,
        notes,
      });
      showToast(`Status updated to ${STATUS_META[status]?.label || status}`);
      setStatusModal(null);
      setExpanded(null);
      fetchBookings();
    } catch (e) {
      showToast(
        e?.response?.data?.message || "Status override failed",
        "error",
      );
    } finally {
      setActing(false);
    }
  }

  // ── Payment actions — POST /admin/payments/:bookingId/release|refund ──────

  async function handlePaymentAction(notes) {
    if (!payModal) return;
    const { bookingId, action } = payModal;
    setActing(true);
    try {
      // POST /admin/payments/:bookingId/release  OR  POST /admin/payments/:bookingId/refund
      if (action === "release") {
        await api.post(`/admin/payments/${bookingId}/release`);
      } else if (action === "refund") {
        await api.post(`/admin/payments/${bookingId}/refund`);
      } else if (action === "verify") {
        await api.patch(`/admin/payments/${bookingId}/verify`);
      } else if (action === "reject-manual") {
        await api.patch(`/admin/payments/${bookingId}/reject-manual`);
      }
      showToast(
        action === "release"
          ? "Payment released to worker ✅"
          : "Refund issued to hirer 💸",
      );
      setPayModal(null);
      setExpanded(null);
      fetchBookings();
    } catch (e) {
      showToast(e?.response?.data?.message || "Payment action failed", "error");
    } finally {
      setActing(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Platform</p>
            <h1 className={styles.pageTitle}>
              All Bookings
              {total > 0 && (
                <span className={styles.countPill}>
                  {total.toLocaleString()}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* ── Stats Bar (from /admin/stats overview) ── */}
        {overview && (
          <div className={styles.statsBar}>
            <StatChip icon="📋" label="Total" value={overview.totalBookings} />
            <StatChip
              icon="⚡"
              label="Active"
              value={overview.activeBookings}
              accent="orange"
            />
            <StatChip
              icon="✅"
              label="Completed"
              value={overview.completedBookings}
              accent="green"
            />
            <StatChip
              icon="❌"
              label="Cancelled"
              value={overview.cancelledBookings}
            />
            <StatChip
              icon="⚖️"
              label="Disputed"
              value={overview.disputedBookings}
              accent={overview.disputedBookings > 0 ? "red" : undefined}
            />
            <StatChip
              icon="🆕"
              label="Today"
              value={overview.newBookingsToday}
            />
          </div>
        )}

        {/* ── Search + Date Range ── */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search title, hirer or worker name…"
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
            />
            {search && (
              <button
                className={styles.clearBtn}
                onClick={() => setParam("search", "")}
              >
                ×
              </button>
            )}
          </div>
          <div className={styles.dateGroup}>
            <input
              type="date"
              className={styles.dateInput}
              value={from}
              onChange={(e) => setParam("from", e.target.value)}
              title="From date"
            />
            <span className={styles.dateSep}>→</span>
            <input
              type="date"
              className={styles.dateInput}
              value={to}
              onChange={(e) => setParam("to", e.target.value)}
              title="To date"
            />
            {(from || to) && (
              <button
                className={styles.clearBtn}
                onClick={() => {
                  setParam("from", "");
                  setParam("to", "");
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Status Filter Tabs ── */}
        <div className={styles.filterBar}>
          {STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterTab} ${statusFilter === s ? styles.filterTabActive : ""}`}
              onClick={() => setParam("status", s === "ALL" ? "" : s)}
            >
              {s === "ALL"
                ? "All"
                : s === "IN_PROGRESS"
                  ? "In Progress"
                  : STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>

        {/* ── Table ── */}
        <div className={styles.tableWrap}>
          <div className={styles.tableHead}>
            <span>Job Title</span>
            <span>Hirer</span>
            <span>Worker</span>
            <span>Category</span>
            <span>Date</span>
            <span>Rate</span>
            <span>Status</span>
            <span>Payment</span>
          </div>

          <div className={styles.tableBody}>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className={styles.skRow}
                  style={{ animationDelay: `${i * 35}ms` }}
                />
              ))
            ) : bookings.length === 0 ? (
              <div className={styles.empty}>
                <span>📋</span>
                <p>No bookings found</p>
              </div>
            ) : (
              bookings.map((b, i) => (
                <div
                  key={b.id}
                  className={styles.rowWrap}
                  style={{ animationDelay: `${i * 28}ms` }}
                >
                  {/* ── Table Row ── */}
                  <div
                    className={`${styles.tableRow} ${expanded === b.id ? styles.tableRowOpen : ""}`}
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  >
                    <div className={styles.tdTitle}>{b.title || "—"}</div>
                    <div className={styles.tdUser}>
                      <Avatar user={b.hirer} size={20} />
                      <span>
                        {b.hirer?.firstName} {b.hirer?.lastName}
                      </span>
                    </div>
                    <div className={styles.tdUser}>
                      <Avatar user={b.worker} size={20} />
                      <span>
                        {b.worker?.firstName} {b.worker?.lastName}
                      </span>
                    </div>
                    <div className={styles.tdMeta}>
                      {b.category?.name || "—"}
                    </div>
                    <div className={styles.tdMeta}>
                      {b.scheduledAt ? fmtDate(b.scheduledAt) : "—"}
                    </div>
                    <div className={styles.tdBold}>
                      {fmtAmt(b.agreedRate, b.currency || "₦")}
                    </div>
                    <StatusBadge status={b.status} />
                    <PayBadge status={b.payment?.status} />
                  </div>

                  {/* ── Expanded Detail Panel ── */}
                  {expanded === b.id && (
                    <BookingDetailPanel
                      bookingId={b.id}
                      onStatusOverride={(booking) => setStatusModal(booking)}
                      onPaymentAction={(bookingId, action) =>
                        setPayModal({ bookingId, action })
                      }
                    />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages} · {total.toLocaleString()} total
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

        {/* ── Modals ── */}
        {statusModal && (
          <StatusModal
            booking={statusModal}
            loading={acting}
            onConfirm={handleStatusOverride}
            onClose={() => setStatusModal(null)}
          />
        )}
        {payModal && (
          <PaymentModal
            bookingId={payModal.bookingId}
            action={payModal.action}
            loading={acting}
            onConfirm={handlePaymentAction}
            onClose={() => setPayModal(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}

function StatChip({ icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>{icon}</span>
      <div>
        <div className={styles.chipVal}>{value?.toLocaleString() ?? "—"}</div>
        <div className={styles.chipLabel}>{label}</div>
      </div>
    </div>
  );
}
