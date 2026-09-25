// src/pages/admin/AdminBookings.jsx
// Full admin bookings management.
//
// Endpoints:
//   GET   /admin/bookings?status=&search=&from=&to=&page=&limit=
//   GET   /admin/bookings/:bookingId
//   PATCH /admin/bookings/:bookingId/status      { status, notes }
//   POST  /admin/payments/:bookingId/release
//   POST  /admin/payments/:bookingId/refund
//   GET   /admin/stats                            (stats bar)
//
// Every field the backend sends is rendered. Lucide icons throughout.
// Uses platform AlertModal + ConfirmationModal.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ClipboardList,
  Zap,
  CheckCircle,
  XCircle,
  Scale,
  Sparkles,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  AlertTriangle,
  RefreshCw,
  Wallet,
  RotateCcw,
  User,
  Hammer,
  MapPin,
  Calendar,
  Clock,
  FileText,
  MessageCircle,
  Shield,
  PhoneCall,
  Building2,
  Bitcoin,
  Landmark,
  CreditCard,
  Inbox,
  Pencil,
  Hash,
  Repeat,
  Ban,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
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

const VALID_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "DISPUTED",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
  if (amount === null || amount === undefined) return "—";
  return `${currency} ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
function timeAgo(d) {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Spinner() {
  return <span className={styles.spinner} />;
}

function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={styles.dimText}>—</span>;
  return (
    <span className={styles.copyPill} title={String(text)}>
      <span className={styles.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={styles.copyPillBtn}
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

function Avatar({ user, size = 28 }) {
  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span style={{ fontSize: size * 0.4 }}>{initials(user)}</span>
      )}
    </div>
  );
}

function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div className={styles.chipBody}>
        <div className={styles.chipVal}>
          {value?.toLocaleString?.() ?? value ?? "—"}
        </div>
        <div className={styles.chipLabel}>{label}</div>
      </div>
    </div>
  );
}

// ─── Status Override Modal ────────────────────────────────────────────────────

function StatusModal({ booking, onConfirm, onClose, loading }) {
  const [status, setStatus] = useState(booking.status);
  const [notes, setNotes] = useState("");

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>
            <RefreshCw size={14} /> Override Booking Status
          </p>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
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
                type="button"
                className={`${styles.statusOption} ${status === s ? styles.statusOptionActive : ""}`}
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
              {loading ? <Spinner /> : "Apply Override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payment Action Modal ─────────────────────────────────────────────────────

function PaymentModal({ action, onConfirm, onClose, loading }) {
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
            {isRelease ? (
              <>
                <Wallet size={14} /> Release Payment to Worker
              </>
            ) : (
              <>
                <RotateCcw size={14} /> Refund Hirer
              </>
            )}
          </p>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
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
                <Spinner />
              ) : isRelease ? (
                "Confirm Release"
              ) : (
                "Confirm Refund"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Field ─────────────────────────────────────────────────────────────

function Field({ label, value, icon: Icon }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>
        {Icon ? <Icon size={10} /> : null} {label}
      </span>
      <span className={styles.fieldVal}>{value}</span>
    </div>
  );
}

function PayRow({ label, value }) {
  return (
    <div className={styles.payRow}>
      <span className={styles.payLabel}>{label}</span>
      <span className={styles.payValue}>{value ?? "—"}</span>
    </div>
  );
}

// ─── Booking Detail Panel ─────────────────────────────────────────────────────

function BookingDetailPanel({ bookingId, onStatusOverride, onPaymentAction }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSnapshot, setShowSnapshot] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  useEffect(() => {
    setLoading(true);
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

  const pmt = detail.payments?.[0] || detail.payment;
  const msgs = detail.conversation?.messages || [];
  const reviews = detail.reviews || [];
  const emergency = detail.emergencyContact
    ? (() => {
        try {
          return JSON.parse(detail.emergencyContact);
        } catch {
          return null;
        }
      })()
    : null;

  return (
    <div className={styles.detailPanel}>
      {/* Parties */}
      <div className={styles.detailRow}>
        <div className={styles.partyCard}>
          <p className={styles.partyRole}>
            <User size={11} /> Hirer
          </p>
          <div className={styles.partyUser}>
            <Avatar user={detail.hirer} size={32} />
            <div className={styles.partyInfo}>
              <p className={styles.partyName}>
                {detail.hirer?.firstName} {detail.hirer?.lastName}
              </p>
              <p className={styles.partyEmail}>{detail.hirer?.email || "—"}</p>
              {detail.hirer?.phone && (
                <p className={styles.partyPhone}>
                  <PhoneCall size={10} /> {detail.hirer.phone}
                </p>
              )}
              <CopyPill
                text={detail.hirer?.id}
                label={`id ${detail.hirer?.id?.slice(0, 8)}…`}
              />
            </div>
          </div>
        </div>

        <div className={styles.vsChip}>
          <ChevronRight size={14} />
        </div>

        <div className={styles.partyCard}>
          <p className={styles.partyRole}>
            <Hammer size={11} /> Worker
          </p>
          <div className={styles.partyUser}>
            <Avatar user={detail.worker} size={32} />
            <div className={styles.partyInfo}>
              <p className={styles.partyName}>
                {detail.worker?.firstName} {detail.worker?.lastName}
              </p>
              <p className={styles.partyEmail}>{detail.worker?.email || "—"}</p>
              {detail.worker?.phone && (
                <p className={styles.partyPhone}>
                  <PhoneCall size={10} /> {detail.worker.phone}
                </p>
              )}
              <CopyPill
                text={detail.worker?.id}
                label={`id ${detail.worker?.id?.slice(0, 8)}…`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Identifiers */}
      <div className={styles.idsGrid}>
        <Field
          label="Booking ID"
          icon={Hash}
          value={
            <CopyPill text={detail.id} label={detail.id.slice(0, 12) + "…"} />
          }
        />
        {detail.jobPostId && (
          <Field
            label="Job Post ID"
            icon={FileText}
            value={
              <CopyPill
                text={detail.jobPostId}
                label={detail.jobPostId.slice(0, 12) + "…"}
              />
            }
          />
        )}
        {detail.categoryId && (
          <Field
            label="Category ID"
            icon={Hash}
            value={
              <CopyPill
                text={detail.categoryId}
                label={detail.categoryId.slice(0, 12) + "…"}
              />
            }
          />
        )}
        {detail.source && (
          <Field label="Source" icon={Repeat} value={detail.source} />
        )}
        {detail.selectedRateOption && (
          <Field
            label="Rate Option"
            icon={TrendingUp}
            value={detail.selectedRateOption}
          />
        )}
      </div>

      {/* Booking meta */}
      <div className={styles.metaGrid}>
        <Field label="Category" value={detail.category?.name || "—"} />
        <Field
          label="Agreed Rate"
          value={fmtAmt(detail.agreedRate, detail.currency || "₦")}
        />
        <Field
          label="Scheduled"
          icon={Calendar}
          value={
            detail.scheduledAt
              ? `${fmtDate(detail.scheduledAt)} ${fmtTime(detail.scheduledAt)}`
              : "—"
          }
        />
        <Field label="Created" value={fmtDateTime(detail.createdAt)} />
        {detail.updatedAt && detail.updatedAt !== detail.createdAt && (
          <Field label="Updated" value={fmtDateTime(detail.updatedAt)} />
        )}
        <Field label="Address" icon={MapPin} value={detail.address} />
        {detail.latitude != null && detail.longitude != null && (
          <Field
            label="Coordinates"
            icon={MapPin}
            value={`${detail.latitude}, ${detail.longitude}`}
          />
        )}
        <Field label="Job Type" value={detail.jobType} />
        <Field label="Location Type" value={detail.locationType} />
        {detail.estimatedUnit && (
          <Field label="Estimated Unit" value={detail.estimatedUnit} />
        )}
        {detail.estimatedValue && (
          <Field label="Estimated Value" value={detail.estimatedValue} />
        )}
        {detail.estimatedHours != null && (
          <Field label="Estimated Hours" value={detail.estimatedHours} />
        )}
        {detail.quantity != null && detail.quantity !== 1 && (
          <Field label="Quantity" value={detail.quantity} />
        )}
        {detail.customLabel && (
          <Field label="Custom Label" value={detail.customLabel} />
        )}
        {detail.durationType && (
          <Field label="Duration Type" value={detail.durationType} />
        )}
        {detail.durationValue && (
          <Field label="Duration Value" value={detail.durationValue} />
        )}
      </div>

      {/* Description / notes / requirements */}
      {detail.description && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <FileText size={12} /> Description
          </p>
          <p className={styles.textBody}>{detail.description}</p>
        </div>
      )}

      {detail.requirements && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <FileText size={12} /> Requirements
          </p>
          <p className={styles.textBody}>{detail.requirements}</p>
        </div>
      )}

      {detail.responsibilities && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <FileText size={12} /> Responsibilities
          </p>
          <p className={styles.textBody}>{detail.responsibilities}</p>
        </div>
      )}

      {detail.notes && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <FileText size={12} /> Notes
          </p>
          <p className={styles.textBody}>{detail.notes}</p>
        </div>
      )}

      {detail.cancelReason && (
        <div className={`${styles.textBlock} ${styles.dangerBlock}`}>
          <p className={styles.blockTitle}>
            <Ban size={12} /> Cancellation Reason
          </p>
          <p className={styles.textBody}>{detail.cancelReason}</p>
        </div>
      )}

      {/* Negotiation block */}
      {(detail.isNegotiated || detail.negotiationNote) && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <Pencil size={12} /> Negotiation
          </p>
          <div className={styles.metaGrid}>
            <Field
              label="Negotiated"
              value={detail.isNegotiated ? "Yes" : "No"}
            />
            {detail.negotiatedRate != null && (
              <Field
                label="Negotiated Rate"
                value={fmtAmt(detail.negotiatedRate, detail.currency)}
              />
            )}
          </div>
          {detail.negotiationNote && (
            <p className={styles.textBody}>{detail.negotiationNote}</p>
          )}
        </div>
      )}

      {/* Timeline (check-in / check-out / completed / SOS) */}
      {(detail.checkInAt ||
        detail.checkOutAt ||
        detail.completedAt ||
        detail.sosActivatedAt) && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <Clock size={12} /> Timeline
          </p>
          <div className={styles.metaGrid}>
            {detail.checkInAt && (
              <Field label="Checked In" value={fmtDateTime(detail.checkInAt)} />
            )}
            {detail.checkInLat != null && detail.checkInLng != null && (
              <Field
                label="Check-in GPS"
                value={`${detail.checkInLat}, ${detail.checkInLng}`}
              />
            )}
            {detail.checkOutAt && (
              <Field
                label="Checked Out"
                value={fmtDateTime(detail.checkOutAt)}
              />
            )}
            {detail.checkOutLat != null && detail.checkOutLng != null && (
              <Field
                label="Check-out GPS"
                value={`${detail.checkOutLat}, ${detail.checkOutLng}`}
              />
            )}
            {detail.completedAt && (
              <Field
                label="Completed"
                value={fmtDateTime(detail.completedAt)}
              />
            )}
            {detail.sosActivatedAt && (
              <Field
                label="SOS Activated"
                value={fmtDateTime(detail.sosActivatedAt)}
              />
            )}
            {detail.sosResolvedAt && (
              <Field
                label="SOS Resolved"
                value={fmtDateTime(detail.sosResolvedAt)}
              />
            )}
            {detail.sosLatitude != null && detail.sosLongitude != null && (
              <Field
                label="SOS GPS"
                value={`${detail.sosLatitude}, ${detail.sosLongitude}`}
              />
            )}
          </div>
        </div>
      )}

      {/* Emergency contact */}
      {emergency && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <Shield size={12} /> Emergency Contact
          </p>
          <div className={styles.metaGrid}>
            <Field label="Name" value={emergency.name} />
            <Field label="Phone" value={emergency.phone} />
            {emergency.relationship && (
              <Field label="Relationship" value={emergency.relationship} />
            )}
          </div>
        </div>
      )}

      {/* Payment breakdown */}
      {pmt && (
        <div className={styles.payBlock}>
          <p className={styles.blockTitle}>
            <Wallet size={12} /> Payment
          </p>
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
            {pmt.referralDeduct != null && pmt.referralDeduct > 0 && (
              <PayRow
                label="Referral Deduction"
                value={fmtAmt(pmt.referralDeduct, pmt.currency)}
              />
            )}
            <PayRow
              label="Provider"
              value={
                <span className={styles.providerInline}>
                  {pmt.provider === "bank_transfer" && (
                    <>
                      <Landmark size={11} /> Bank transfer
                    </>
                  )}
                  {pmt.provider === "crypto" && (
                    <>
                      <Bitcoin size={11} /> Crypto
                    </>
                  )}
                  {pmt.provider &&
                    !["bank_transfer", "crypto"].includes(pmt.provider) && (
                      <>
                        <CreditCard size={11} /> {pmt.provider}
                      </>
                    )}
                  {!pmt.provider && "—"}
                </span>
              }
            />
            <PayRow label="Status" value={<PayBadge status={pmt.status} />} />
            {pmt.providerRef && (
              <PayRow label="Reference" value={pmt.providerRef} />
            )}
            {pmt.bankName && <PayRow label="Bank" value={pmt.bankName} />}
            {pmt.accountName && (
              <PayRow label="Account Name" value={pmt.accountName} />
            )}
            {pmt.bankTransferProof && (
              <PayRow
                label="Transfer Proof"
                value={
                  <a
                    href={pmt.bankTransferProof}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.link}
                  >
                    View receipt
                  </a>
                }
              />
            )}
            {pmt.cryptoNetwork && (
              <PayRow label="Crypto Network" value={pmt.cryptoNetwork} />
            )}
            {pmt.cryptoTxHash && (
              <PayRow label="Crypto TX" value={pmt.cryptoTxHash} />
            )}
            {pmt.cryptoWallet && (
              <PayRow label="Crypto Wallet" value={pmt.cryptoWallet} />
            )}
            {pmt.cryptoCurrency && (
              <PayRow label="Crypto Currency" value={pmt.cryptoCurrency} />
            )}
            {pmt.cryptoAmount && (
              <PayRow label="Crypto Amount" value={pmt.cryptoAmount} />
            )}
            {pmt.refundedAt && (
              <PayRow label="Refunded At" value={fmtDateTime(pmt.refundedAt)} />
            )}
            {pmt.escrowReleasedAt && (
              <PayRow
                label="Released At"
                value={fmtDateTime(pmt.escrowReleasedAt)}
              />
            )}
            {pmt.notes && <PayRow label="Payment Notes" value={pmt.notes} />}
          </div>
        </div>
      )}

      {/* Reviews */}
      {reviews.length > 0 && (
        <div className={styles.textBlock}>
          <p className={styles.blockTitle}>
            <Sparkles size={12} /> Reviews ({reviews.length})
          </p>
          <div className={styles.reviewList}>
            {reviews.map((rv) => (
              <div key={rv.id} className={styles.reviewRow}>
                <div className={styles.reviewHead}>
                  <span className={styles.reviewGiver}>
                    {rv.giver?.firstName} {rv.giver?.lastName}
                  </span>
                  <span className={styles.reviewStars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={
                          s <= rv.rating ? styles.starOn : styles.starOff
                        }
                      >
                        ★
                      </span>
                    ))}
                    <span className={styles.reviewRating}>{rv.rating}/5</span>
                  </span>
                </div>
                {rv.comment && (
                  <p className={styles.reviewComment}>"{rv.comment}"</p>
                )}
                {rv.createdAt && (
                  <p className={styles.reviewDate}>
                    {fmtDateTime(rv.createdAt)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job rate snapshot */}
      {detail.jobRateSnapshot && (
        <div className={styles.textBlock}>
          <button
            type="button"
            className={styles.snapshotToggle}
            onClick={() => setShowSnapshot((v) => !v)}
          >
            {showSnapshot ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            Job rate snapshot
          </button>
          {showSnapshot && (
            <pre className={styles.snapshotPre}>
              {JSON.stringify(detail.jobRateSnapshot, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* Conversation */}
      {msgs.length > 0 && (
        <div className={styles.textBlock}>
          <button
            type="button"
            className={styles.snapshotToggle}
            onClick={() => setShowConversation((v) => !v)}
          >
            {showConversation ? (
              <ChevronUp size={12} />
            ) : (
              <ChevronDown size={12} />
            )}
            <MessageCircle size={12} /> Recent messages ({msgs.length})
          </button>
          {showConversation && (
            <div className={styles.msgList}>
              {msgs.slice(-6).map((m, i) => (
                <div key={i} className={styles.msgRow}>
                  <span className={styles.msgSender}>
                    {m.sender?.firstName ?? "?"}
                  </span>
                  <span className={styles.msgText}>{m.content}</span>
                  <span className={styles.msgTime}>{timeAgo(m.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Admin actions */}
      <div className={styles.adminActions}>
        <button
          className={styles.actionOverride}
          onClick={() => onStatusOverride(detail)}
        >
          <RefreshCw size={13} /> Override Status
        </button>
        {pmt?.status === "HELD" && (
          <>
            <button
              className={styles.actionRelease}
              onClick={() => onPaymentAction(detail.id, "release")}
            >
              <CheckCircle size={13} /> Release Payment
            </button>
            <button
              className={styles.actionRefund}
              onClick={() => onPaymentAction(detail.id, "refund")}
            >
              <RotateCcw size={13} /> Refund Hirer
            </button>
          </>
        )}
      </div>
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
  const [expanded, setExpanded] = useState(null);

  const [statusModal, setStatusModal] = useState(null);
  const [payModal, setPayModal] = useState(null);
  const [acting, setActing] = useState(false);
  const [notify, setNotify] = useState(null);

  function showToast(msg, type = "success") {
    setNotify({ type, text: msg });
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    p.set("page", "1");
    setSearchParams(p);
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────

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

  useEffect(() => {
    api
      .get("/admin/stats")
      .then((r) => setOverview(r.data.data?.overview))
      .catch(console.error);
  }, []);

  // ── Status override ───────────────────────────────────────────────────────

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

  // ── Payment action ────────────────────────────────────────────────────────

  async function handlePaymentAction(notes) {
    if (!payModal) return;
    const { bookingId, action } = payModal;
    setActing(true);
    try {
      if (action === "release") {
        await api.post(`/admin/payments/${bookingId}/release`, { notes });
      } else if (action === "refund") {
        await api.post(`/admin/payments/${bookingId}/refund`, { notes });
      }
      showToast(
        action === "release"
          ? "Payment released to worker"
          : "Refund issued to hirer",
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
        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Platform</p>
            <h1 className={styles.pageTitle}>
              <ClipboardList size={20} />
              All Bookings
              {total > 0 && (
                <span className={styles.countPill}>
                  {total.toLocaleString()}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* ── Stats Bar ── */}
        {overview && (
          <div className={styles.statsBar}>
            <StatChip
              icon={ClipboardList}
              label="Total"
              value={overview.totalBookings}
            />
            <StatChip
              icon={Zap}
              label="Active"
              value={overview.activeBookings}
              accent="orange"
            />
            <StatChip
              icon={CheckCircle}
              label="Completed"
              value={overview.completedBookings}
              accent="green"
            />
            <StatChip
              icon={XCircle}
              label="Cancelled"
              value={overview.cancelledBookings}
            />
            <StatChip
              icon={Scale}
              label="Disputed"
              value={overview.disputedBookings}
              accent={overview.disputedBookings > 0 ? "red" : undefined}
            />
            <StatChip
              icon={Sparkles}
              label="Today"
              value={overview.newBookingsToday}
            />
          </div>
        )}

        {/* ── Search + Date Range ── */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <Search size={13} />
            </span>
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
                aria-label="Clear search"
              >
                <X size={13} />
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
                className={styles.clearRangeBtn}
                onClick={() => {
                  const p = new URLSearchParams(searchParams);
                  p.delete("from");
                  p.delete("to");
                  p.set("page", "1");
                  setSearchParams(p);
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ── Status Tabs ── */}
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
                <span className={styles.emptyIcon}>
                  <Inbox size={36} />
                </span>
                <p className={styles.emptyTitle}>No bookings found</p>
              </div>
            ) : (
              bookings.map((b, i) => (
                <div
                  key={b.id}
                  className={styles.rowWrap}
                  style={{ animationDelay: `${i * 28}ms` }}
                >
                  <div
                    className={`${styles.tableRow} ${expanded === b.id ? styles.tableRowOpen : ""}`}
                    onClick={() => setExpanded(expanded === b.id ? null : b.id)}
                  >
                    <div className={styles.tdTitle}>{b.title || "—"}</div>
                    <div className={styles.tdUser}>
                      <Avatar user={b.hirer} size={20} />
                      <span className={styles.tdUserName}>
                        {b.hirer?.firstName} {b.hirer?.lastName}
                      </span>
                    </div>
                    <div className={styles.tdUser}>
                      <Avatar user={b.worker} size={20} />
                      <span className={styles.tdUserName}>
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
                    <PayBadge status={b.payments?.[0]?.status} />
                  </div>

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
              <ChevronLeft size={13} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages} · {total.toLocaleString()} total
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <ChevronRight size={13} />
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
            action={payModal.action}
            loading={acting}
            onConfirm={handlePaymentAction}
            onClose={() => setPayModal(null)}
          />
        )}

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
      </div>
    </AdminLayout>
  );
}
