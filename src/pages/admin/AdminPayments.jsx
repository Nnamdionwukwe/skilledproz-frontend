import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard,
  Smartphone,
  Landmark,
  Bitcoin,
  Wallet,
  TrendingUp,
  FileText,
  Clock,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Ban,
  User,
  Hammer,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Link as LinkIcon,
  Building2,
  Hash,
  Calendar,
  ExternalLink,
  Copy,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminPayments.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAY_STATUSES = [
  "ALL",
  "PENDING",
  "HELD",
  "RELEASED",
  "REFUNDED",
  "FAILED",
];
const WD_STATUSES = [
  "ALL",
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
];
const PROVIDERS = [
  "ALL",
  "paystack",
  "flutterwave",
  "stripe",
  "bank_transfer",
  "crypto",
];

const PAY_STATUS_META = {
  PENDING: { cls: "yellow", label: "Pending" },
  HELD: { cls: "indigo", label: "Held in escrow" },
  RELEASED: { cls: "green", label: "Released" },
  REFUNDED: { cls: "blue", label: "Refunded" },
  FAILED: { cls: "red", label: "Failed" },
};
const WD_STATUS_META = {
  PENDING: { cls: "yellow", label: "Pending" },
  PROCESSING: { cls: "orange", label: "Processing" },
  COMPLETED: { cls: "green", label: "Completed" },
  FAILED: { cls: "red", label: "Failed" },
  CANCELLED: { cls: "dim", label: "Cancelled" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(amount, currency) {
  const sym = !currency || currency === "NGN" ? "₦" : currency;
  if (!amount && amount !== 0) return "—";
  return `${sym} ${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function fmtAmtPrecise(amount, currency) {
  const sym = !currency || currency === "NGN" ? "₦" : currency;
  if (amount === null || amount === undefined) return "—";
  return `${sym} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

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

function timeAgo(d) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

// Extract failure reason from a withdrawal `details` object (if any)
function wdFailureReason(details) {
  if (!details) return null;
  if (typeof details === "string") {
    try {
      const parsed = JSON.parse(details);
      return parsed.error || parsed.reason || parsed.adminNotes || null;
    } catch {
      return null;
    }
  }
  return details.error || details.reason || details.adminNotes || null;
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.type === "success" ? (
        <CheckCircle2 size={14} />
      ) : (
        <XCircle size={14} />
      )}
      <span>{toast.msg}</span>
    </div>
  );
}

function Badge({ status, meta }) {
  const m = meta[status] || { cls: "dim", label: status };
  return (
    <span className={`${styles.badge} ${styles[`badge_${m.cls}`]}`}>
      {m.label}
    </span>
  );
}

function ProviderTag({ provider }) {
  if (!provider) return <span className={styles.providerTag}>—</span>;
  const map = {
    stripe: { Icon: CreditCard, label: "stripe" },
    paystack: { Icon: Smartphone, label: "paystack" },
    flutterwave: { Icon: TrendingUp, label: "flutterwave" },
    bank_transfer: { Icon: Landmark, label: "bank transfer" },
    crypto: { Icon: Bitcoin, label: "crypto" },
  };
  const entry = map[provider] || { Icon: Wallet, label: provider };
  const { Icon, label } = entry;
  return (
    <span className={styles.providerTag}>
      <Icon size={12} /> {label}
    </span>
  );
}

function StatCard({ icon, label, value, sub, accent }) {
  const Icon = icon;
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={18} /> : null}
      </span>
      <div className={styles.statVal}>{value ?? "—"}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Small helpers for the detail panel ───────────────────────────────────────

function MetaField({ label, value }) {
  return (
    <div className={styles.metaField}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value ?? "—"}</span>
    </div>
  );
}

function BreakdownRow({ label, children, mono, fee }) {
  return (
    <div className={styles.breakdownRow}>
      <span>{label}</span>
      <span
        className={`${styles.breakdownVal} ${mono ? styles.breakdownMono : ""} ${fee ? styles.breakdownFee : ""}`}
      >
        {children ?? "—"}
      </span>
    </div>
  );
}

// ─── Payment Detail Panel ─────────────────────────────────────────────────────

function PaymentDetailPanel({ paymentId, onAction }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    setLoading(true);
    api
      .get(`/admin/payments/${paymentId}`)
      .then((r) => setDetail(r.data.data?.payment))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [paymentId]);

  function copy(value, key) {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

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
        <p className={styles.detailErr}>Failed to load payment.</p>
      </div>
    );
  }

  const bk = detail.booking;
  const referralDiscount =
    detail.referralDiscount ?? detail.referralDeduct ?? 0;
  const isManual =
    detail.provider === "bank_transfer" || detail.provider === "crypto";

  return (
    <div className={styles.detailPanel}>
      {/* ── Parties ── */}
      {bk && (
        <div className={styles.detailRow}>
          <div className={styles.partyCard}>
            <p className={styles.partyRole}>
              <User size={12} /> Hirer
            </p>
            <p className={styles.partyName}>
              {bk.hirer?.firstName} {bk.hirer?.lastName}
            </p>
            <p className={styles.partyEmail}>{bk.hirer?.email}</p>
          </div>
          <div className={styles.vsChip}>
            <ChevronRight size={14} />
          </div>
          <div className={styles.partyCard}>
            <p className={styles.partyRole}>
              <Hammer size={12} /> Worker
            </p>
            <p className={styles.partyName}>
              {bk.worker?.firstName} {bk.worker?.lastName}
            </p>
            <p className={styles.partyEmail}>{bk.worker?.email}</p>
          </div>
        </div>
      )}

      {/* ── Booking info ── */}
      {bk && (
        <div className={styles.metaGrid}>
          <MetaField label="Booking" value={bk.title || "—"} />
          <MetaField label="Category" value={bk.category?.name || "—"} />
          <MetaField label="Booking status" value={bk.status} />
          <MetaField label="Booked" value={fmtDate(bk.createdAt)} />
        </div>
      )}

      {/* ── Full payment breakdown ── */}
      <div className={styles.payBreakdown}>
        <BreakdownRow label="Total amount">
          {fmtAmtPrecise(detail.amount, detail.currency)}
        </BreakdownRow>
        <BreakdownRow label="Worker payout">
          {fmtAmtPrecise(detail.workerPayout, detail.currency)}
        </BreakdownRow>
        <BreakdownRow label="Platform fee" fee>
          {fmtAmtPrecise(detail.platformFee, detail.currency)}
        </BreakdownRow>
        {referralDiscount > 0 && (
          <BreakdownRow label="Referral discount">
            −{fmtAmtPrecise(referralDiscount, detail.currency)}
          </BreakdownRow>
        )}
        <BreakdownRow label="Provider">
          <ProviderTag provider={detail.provider} />
        </BreakdownRow>
        <BreakdownRow label="Payment ref" mono>
          {detail.providerRef ? (
            <button
              type="button"
              className={styles.copyBtn}
              onClick={() => copy(detail.providerRef, "ref")}
              title="Copy"
            >
              {detail.providerRef.slice(0, 20)}
              {detail.providerRef.length > 20 ? "…" : ""}
              {copied === "ref" ? (
                <CheckCircle2 size={11} />
              ) : (
                <Copy size={11} />
              )}
            </button>
          ) : (
            "—"
          )}
        </BreakdownRow>
        {detail.escrowReleasedAt && (
          <BreakdownRow label="Released at">
            {fmtDateTime(detail.escrowReleasedAt)}
          </BreakdownRow>
        )}
        {detail.refundedAt && (
          <BreakdownRow label="Refunded at">
            {fmtDateTime(detail.refundedAt)}
          </BreakdownRow>
        )}
        <BreakdownRow label="Created">
          {fmtDateTime(detail.createdAt)}
        </BreakdownRow>
      </div>

      {/* ── Bank transfer extra info ── */}
      {detail.provider === "bank_transfer" &&
        (detail.bankName || detail.accountName || detail.bankTransferProof) && (
          <div className={styles.descBox}>
            <span className={styles.descLabel}>Bank Transfer Details</span>
            <div className={styles.fieldGridSmall}>
              {detail.bankName && (
                <MetaField label="Sender bank" value={detail.bankName} />
              )}
              {detail.accountName && (
                <MetaField label="Sender name" value={detail.accountName} />
              )}
              {detail.bankTransferProof && (
                <div className={styles.metaField}>
                  <span className={styles.metaLabel}>Proof</span>
                  <a
                    href={detail.bankTransferProof}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.proofLink}
                  >
                    <ExternalLink size={12} /> View proof
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── Crypto extra info ── */}
      {detail.provider === "crypto" &&
        (detail.cryptoNetwork ||
          detail.cryptoWallet ||
          detail.cryptoTxHash ||
          detail.cryptoAmount) && (
          <div className={styles.descBox}>
            <span className={styles.descLabel}>Crypto Details</span>
            <div className={styles.fieldGridSmall}>
              {detail.cryptoCurrency && (
                <MetaField label="Currency" value={detail.cryptoCurrency} />
              )}
              {detail.cryptoNetwork && (
                <MetaField label="Network" value={detail.cryptoNetwork} />
              )}
              {detail.cryptoAmount && (
                <MetaField label="Amount" value={String(detail.cryptoAmount)} />
              )}
              {detail.cryptoWallet && (
                <div className={styles.metaField}>
                  <span className={styles.metaLabel}>Wallet</span>
                  <span
                    className={`${styles.metaValue} ${styles.breakdownMono}`}
                    title={detail.cryptoWallet}
                  >
                    {detail.cryptoWallet.slice(0, 16)}…
                  </span>
                </div>
              )}
              {detail.cryptoTxHash && (
                <div className={styles.metaField}>
                  <span className={styles.metaLabel}>Tx hash</span>
                  <button
                    type="button"
                    className={styles.copyBtn}
                    onClick={() => copy(detail.cryptoTxHash, "txhash")}
                  >
                    {detail.cryptoTxHash.slice(0, 14)}…
                    {copied === "txhash" ? (
                      <CheckCircle2 size={11} />
                    ) : (
                      <Copy size={11} />
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ── Admin actions ── */}
      <div className={styles.detailActions}>
        {/* Manual payments: PENDING → verify or reject */}
        {isManual && detail.status === "PENDING" && (
          <>
            <button
              type="button"
              className={styles.actionRelease}
              onClick={() =>
                onAction({
                  action: "verify",
                  bookingId: detail.bookingId || detail.booking?.id,
                })
              }
            >
              <CheckCircle2 size={13} /> Verify Payment
            </button>
            <button
              type="button"
              className={styles.actionRefund}
              onClick={() =>
                onAction({
                  action: "reject-manual",
                  bookingId: detail.bookingId || detail.booking?.id,
                })
              }
            >
              <Ban size={13} /> Reject Payment
            </button>
          </>
        )}

        {/* HELD payments: release or refund */}
        {detail.status === "HELD" && (
          <>
            <button
              type="button"
              className={styles.actionRelease}
              onClick={() =>
                onAction({
                  action: "release",
                  bookingId: detail.bookingId || detail.booking?.id,
                })
              }
            >
              <CheckCircle2 size={13} /> Release to Worker
            </button>
            <button
              type="button"
              className={styles.actionRefund}
              onClick={() =>
                onAction({
                  action: "refund",
                  bookingId: detail.bookingId || detail.booking?.id,
                })
              }
            >
              <BanknoteIcon /> Refund Hirer
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Small helper to keep the JSX compact
function BanknoteIcon() {
  return <Wallet size={13} />;
}

// ─── Withdrawal Detail Panel ──────────────────────────────────────────────────

function WithdrawalDetailPanel({ withdrawal }) {
  const details = withdrawal.details || withdrawal.meta || {};
  const d =
    typeof details === "string"
      ? (() => {
          try {
            return JSON.parse(details);
          } catch {
            return {};
          }
        })()
      : details;

  const failureReason = wdFailureReason(withdrawal.details);

  return (
    <div className={styles.detailPanel}>
      {/* ── Worker ── */}
      <div className={styles.detailRow}>
        <div className={styles.partyCard}>
          <p className={styles.partyRole}>
            <User size={12} /> Worker
          </p>
          <p className={styles.partyName}>
            {withdrawal.worker?.firstName} {withdrawal.worker?.lastName}
          </p>
          <p className={styles.partyEmail}>{withdrawal.worker?.email}</p>
        </div>
      </div>

      {/* ── Withdrawal meta ── */}
      <div className={styles.metaGrid}>
        <MetaField
          label="Amount"
          value={fmtAmtPrecise(withdrawal.amount, withdrawal.currency)}
        />
        <MetaField label="Currency" value={withdrawal.currency} />
        <MetaField
          label="Method"
          value={withdrawal.method?.replace("_", " ") || "—"}
        />
        <MetaField
          label="Requested"
          value={fmtDateTime(withdrawal.createdAt)}
        />
        {withdrawal.processedAt && (
          <MetaField
            label="Processed"
            value={fmtDateTime(withdrawal.processedAt)}
          />
        )}
        {withdrawal.completedAt && (
          <MetaField
            label="Completed"
            value={fmtDateTime(withdrawal.completedAt)}
          />
        )}
        <MetaField label="Reference" value={withdrawal.reference || "—"} />
      </div>

      {/* ── Destination details ── */}
      <div className={styles.descBox}>
        <span className={styles.descLabel}>Destination</span>
        <div className={styles.fieldGridSmall}>
          {/* Bank transfer */}
          {withdrawal.method === "bank_transfer" && (
            <>
              {d.bankName && <MetaField label="Bank" value={d.bankName} />}
              {d.accountName && (
                <MetaField label="Account name" value={d.accountName} />
              )}
              {d.accountNumber && (
                <MetaField label="Account number" value={d.accountNumber} />
              )}
              {d.bankCode && <MetaField label="Bank code" value={d.bankCode} />}
              {d.country && <MetaField label="Country" value={d.country} />}
            </>
          )}
          {/* Mobile money */}
          {withdrawal.method === "mobile_money" && (
            <>
              {d.mobileProvider && (
                <MetaField label="Provider" value={d.mobileProvider} />
              )}
              {d.mobileNumber && (
                <MetaField label="Number" value={d.mobileNumber} />
              )}
              {d.mobileName && <MetaField label="Name" value={d.mobileName} />}
              {d.country && <MetaField label="Country" value={d.country} />}
            </>
          )}
          {/* Crypto */}
          {withdrawal.method === "crypto" && (
            <>
              {d.cryptoCurrency && (
                <MetaField label="Currency" value={d.cryptoCurrency} />
              )}
              {d.cryptoNetwork && (
                <MetaField label="Network" value={d.cryptoNetwork} />
              )}
              {d.cryptoAddress && (
                <div className={styles.metaField}>
                  <span className={styles.metaLabel}>Address</span>
                  <span
                    className={`${styles.metaValue} ${styles.breakdownMono}`}
                    title={d.cryptoAddress}
                  >
                    {d.cryptoAddress.slice(0, 18)}…
                  </span>
                </div>
              )}
            </>
          )}
          {/* Provider metadata from approval */}
          {d.provider && <MetaField label="Provider" value={d.provider} />}
          {d.transferId && (
            <MetaField label="Transfer ID" value={String(d.transferId)} />
          )}
          {d.transferCode && (
            <MetaField label="Transfer code" value={d.transferCode} />
          )}
          {d.withdrawalFee !== undefined && (
            <MetaField
              label="Withdrawal fee"
              value={fmtAmtPrecise(d.withdrawalFee, withdrawal.currency)}
            />
          )}
          {d.netPayout !== undefined && (
            <MetaField
              label="Net payout"
              value={fmtAmtPrecise(d.netPayout, withdrawal.currency)}
            />
          )}
        </div>
      </div>

      {/* ── Failure / rejection reason ── */}
      {failureReason && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={14} />
          <div>
            <strong>Failure reason:</strong> {failureReason}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payment Action Modal ─────────────────────────────────────────────────────

function PayActionModal({ action, onConfirm, onClose, loading }) {
  const [notes, setNotes] = useState("");

  const config = {
    release: {
      Icon: CheckCircle2,
      title: "Release Payment",
      color: "var(--green)",
      sub: "Releases escrow to the worker. Booking will be marked Completed.",
      confirmLabel: "Confirm Release",
      cls: "modalRelease",
    },
    refund: {
      Icon: Wallet,
      title: "Refund Hirer",
      color: "#60a5fa",
      sub: "Refunds the hirer. Booking will be marked Cancelled.",
      confirmLabel: "Confirm Refund",
      cls: "modalRefund",
    },
    verify: {
      Icon: CheckCircle2,
      title: "Verify Manual Payment",
      color: "var(--green)",
      sub: "Marks the manual bank/crypto payment as verified. Funds move into escrow.",
      confirmLabel: "Confirm Verify",
      cls: "modalRelease",
    },
    "reject-manual": {
      Icon: Ban,
      title: "Reject Manual Payment",
      color: "var(--red)",
      sub: "Rejects the manual payment. The hirer will be notified to re-submit.",
      confirmLabel: "Confirm Reject",
      cls: "modalDelete",
    },
  }[action] || {
    Icon: AlertTriangle,
    title: "Confirm",
    color: "var(--text)",
    sub: "",
    confirmLabel: "Confirm",
    cls: "modalRelease",
  };

  const { Icon, title, color, sub, confirmLabel, cls } = config;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle} style={{ color }}>
            <Icon size={14} /> {title}
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className={styles.modalBody}>
          {sub && <p className={styles.modalSub}>{sub}</p>}
          <textarea
            className={styles.textarea}
            placeholder="Audit note (optional)…"
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
              className={styles[cls]}
              onClick={() => onConfirm(notes)}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <Icon size={13} /> {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Withdrawal Reject Modal ──────────────────────────────────────────────────

function RejectModal({ worker, onConfirm, onClose, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle} style={{ color: "var(--red)" }}>
            <Ban size={14} /> Reject Withdrawal
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>
        <div className={styles.modalBody}>
          <p className={styles.modalSub}>
            Rejection reason sent to <strong>{worker}</strong> in their
            notification.
          </p>
          <textarea
            className={styles.textarea}
            placeholder="Reason for rejection (e.g. invalid bank details)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            autoFocus
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
              className={styles.modalDelete}
              onClick={() => onConfirm(reason)}
              disabled={loading}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <XCircle size={13} /> Reject
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────

function PaymentsTab({ searchParams, setSearchParams }) {
  const status = searchParams.get("pstatus") || "ALL";
  const provider = searchParams.get("provider") || "ALL";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const page = parseInt(searchParams.get("page") || "1");

  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [payModal, setPayModal] = useState(null);
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
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (status !== "ALL") params.status = status;
    if (provider !== "ALL") params.provider = provider;
    if (from) params.from = from;
    if (to) params.to = to;

    api
      .get("/admin/payments", { params })
      .then((r) => {
        const d = r.data.data || {};
        setPayments(d.payments || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setSummary(d.summary || null);
      })
      .catch(() => showToast("Failed to load payments", "error"))
      .finally(() => setLoading(false));
  }, [status, provider, from, to, page]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  async function handlePayAction(notes) {
    if (!payModal) return;
    const { action, bookingId } = payModal;
    setActing(true);
    try {
      if (action === "release") {
        await api.post(`/admin/payments/${bookingId}/release`);
      } else if (action === "refund") {
        await api.post(`/admin/payments/${bookingId}/refund`);
      } else if (action === "verify") {
        await api.patch(`/admin/payments/${bookingId}/verify`);
      } else if (action === "reject-manual") {
        await api.patch(`/admin/payments/${bookingId}/reject-manual`, {
          reason: notes || "Rejected by admin",
        });
      }

      const messages = {
        release: "Payment released",
        refund: "Refund issued",
        verify: "Payment verified",
        "reject-manual": "Payment rejected",
      };
      showToast(messages[action] || "Action complete");

      setPayModal(null);
      setExpanded(null);
      fetchPayments();
    } catch (e) {
      showToast(e?.response?.data?.message || "Action failed", "error");
    } finally {
      setActing(false);
    }
  }

  // Derive summary stats from the groupBy response
  const totalGMV =
    summary?.PENDING?.gmv != null ||
    summary?.HELD?.gmv != null ||
    summary?.RELEASED?.gmv != null
      ? Object.values(summary).reduce((a, s) => a + (s.gmv || 0), 0)
      : 0;
  const pendingCount = summary?.PENDING?.count || 0;

  return (
    <div className={styles.tabContent}>
      <Toast toast={toast} />

      {summary && (
        <div className={styles.statsBar}>
          <StatCard
            icon={TrendingUp}
            label="Gross Volume"
            value={fmtAmt(totalGMV)}
            accent="orange"
          />
          <StatCard
            icon={Wallet}
            label="Platform Fees"
            value={fmtAmt(summary?.RELEASED?.gmv || 0)}
            accent="green"
          />
          <StatCard
            icon={Clock}
            label="Pending Verifications"
            value={pendingCount}
            accent={pendingCount > 0 ? "amber" : undefined}
          />
          <StatCard
            icon={FileText}
            label="Transactions"
            value={total?.toLocaleString()}
          />
        </div>
      )}

      <div className={styles.filterRow}>
        <div className={styles.filterBar}>
          {PAY_STATUSES.map((s) => (
            <button
              key={s}
              className={`${styles.filterTab} ${status === s ? styles.filterTabActive : ""}`}
              onClick={() => setParam("pstatus", s === "ALL" ? "" : s)}
            >
              {s === "ALL" ? "All" : PAY_STATUS_META[s]?.label || s}
            </button>
          ))}
        </div>
        <select
          className={styles.providerSelect}
          value={provider}
          onChange={(e) => setParam("provider", e.target.value)}
        >
          {PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p === "ALL" ? "All Providers" : p.replace("_", " ")}
            </option>
          ))}
        </select>
        <div className={styles.dateGroup}>
          <input
            type="date"
            className={styles.dateInput}
            value={from}
            onChange={(e) => setParam("from", e.target.value)}
            title="From"
          />
          <span className={styles.dateSep}>
            <ChevronRight size={12} />
          </span>
          <input
            type="date"
            className={styles.dateInput}
            value={to}
            onChange={(e) => setParam("to", e.target.value)}
            title="To"
          />
          {(from || to) && (
            <button
              className={styles.clearBtn}
              onClick={() => {
                setParam("from", "");
                setParam("to", "");
              }}
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.tableHead}>
          <span>Booking</span>
          <span>Hirer</span>
          <span>Worker</span>
          <span>Amount</span>
          <span>Fee</span>
          <span>Worker Pay</span>
          <span>Provider</span>
          <span>Status</span>
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
          ) : payments.length === 0 ? (
            <div className={styles.empty}>
              <CreditCard size={40} />
              <p>No payments found</p>
            </div>
          ) : (
            payments.map((p, i) => (
              <div
                key={p.id}
                className={styles.rowWrap}
                style={{ animationDelay: `${i * 28}ms` }}
              >
                <div
                  className={`${styles.tableRow} ${expanded === p.id ? styles.tableRowOpen : ""}`}
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                >
                  <div className={styles.tdTitle}>
                    {p.booking?.title || p.bookingId?.slice(0, 8) || "—"}
                  </div>
                  <div className={styles.tdMeta}>
                    {p.booking?.hirer?.firstName} {p.booking?.hirer?.lastName}
                  </div>
                  <div className={styles.tdMeta}>
                    {p.booking?.worker?.firstName} {p.booking?.worker?.lastName}
                  </div>
                  <div className={styles.tdBold}>
                    {fmtAmt(p.amount, p.currency)}
                  </div>
                  <div className={styles.tdMeta}>
                    {fmtAmt(p.platformFee, p.currency)}
                  </div>
                  <div className={styles.tdMeta}>
                    {fmtAmt(p.workerPayout, p.currency)}
                  </div>
                  <ProviderTag provider={p.provider} />
                  <Badge status={p.status} meta={PAY_STATUS_META} />
                </div>

                {expanded === p.id && (
                  <PaymentDetailPanel
                    paymentId={p.id}
                    onAction={(payload) => setPayModal(payload)}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>

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

      {payModal && (
        <PayActionModal
          action={payModal.action}
          loading={acting}
          onConfirm={handlePayAction}
          onClose={() => setPayModal(null)}
        />
      )}
    </div>
  );
}

// ─── Withdrawals Tab ──────────────────────────────────────────────────────────

function WithdrawalsTab({ searchParams, setSearchParams }) {
  const status = searchParams.get("wstatus") || "ALL";
  const page = parseInt(searchParams.get("wpage") || "1");

  const [withdrawals, setWithdrawals] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [acting, setActing] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "wpage") p.set("wpage", "1");
    setSearchParams(p);
  }

  const fetchWithdrawals = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 15 };
    if (status !== "ALL") params.status = status;

    api
      .get("/admin/withdrawals", { params })
      .then((r) => {
        const d = r.data.data || {};
        setWithdrawals(d.withdrawals || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setPendingTotal(d.pendingTotal || 0);
        setPendingCount(d.pendingCount || 0);
      })
      .catch(() => showToast("Failed to load withdrawals", "error"))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  async function handleApprove(withdrawalId) {
    setActing(withdrawalId);
    try {
      await api.patch(`/admin/withdrawals/${withdrawalId}/approve`);
      showToast("Withdrawal approved — processing");
      fetchWithdrawals();
    } catch (e) {
      showToast(e?.response?.data?.message || "Approval failed", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleReject(reason) {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    setRejectTarget(null);
    try {
      await api.patch(`/admin/withdrawals/${rejectTarget.id}/reject`, {
        reason,
      });
      showToast("Withdrawal rejected");
      fetchWithdrawals();
    } catch (e) {
      showToast(e?.response?.data?.message || "Rejection failed", "error");
    } finally {
      setActing(null);
    }
  }

  return (
    <div className={styles.tabContent}>
      <Toast toast={toast} />

      <div className={styles.statsBar}>
        <StatCard
          icon={Clock}
          label="Pending Queue"
          value={pendingCount.toLocaleString()}
          accent={pendingCount > 0 ? "amber" : undefined}
        />
        <StatCard
          icon={Wallet}
          label="Pending Amount"
          value={fmtAmt(pendingTotal)}
          accent={pendingCount > 0 ? "amber" : undefined}
        />
        <StatCard
          icon={ClipboardList}
          label="Total Records"
          value={total.toLocaleString()}
        />
      </div>

      <div className={styles.filterBar}>
        {WD_STATUSES.map((s) => (
          <button
            key={s}
            className={`${styles.filterTab} ${status === s ? styles.filterTabActive : ""}`}
            onClick={() => setParam("wstatus", s === "ALL" ? "" : s)}
          >
            {s === "ALL" ? "All" : WD_STATUS_META[s]?.label || s}
          </button>
        ))}
      </div>

      <div className={styles.tableWrap}>
        <div className={`${styles.tableHead} ${styles.tableHeadWd}`}>
          <span>Worker</span>
          <span>Amount</span>
          <span>Method</span>
          <span>Destination</span>
          <span>Requested</span>
          <span>Status</span>
          <span>Actions</span>
        </div>
        <div className={styles.tableBody}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className={styles.skRow}
                style={{ animationDelay: `${i * 35}ms` }}
              />
            ))
          ) : withdrawals.length === 0 ? (
            <div className={styles.empty}>
              <Wallet size={40} />
              <p>No withdrawal requests</p>
            </div>
          ) : (
            withdrawals.map((w, i) => (
              <div
                key={w.id}
                className={styles.rowWrap}
                style={{ animationDelay: `${i * 28}ms` }}
              >
                <div
                  className={`${styles.tableRow} ${styles.tableRowWd}`}
                  onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                >
                  <div className={styles.workerCell}>
                    <div className={styles.wdAvatar}>
                      {w.worker?.avatar ? (
                        <img src={w.worker.avatar} alt="" />
                      ) : (
                        `${w.worker?.firstName?.[0] ?? ""}${w.worker?.lastName?.[0] ?? ""}`
                      )}
                    </div>
                    <div>
                      <p className={styles.wdName}>
                        {w.worker?.firstName} {w.worker?.lastName}
                      </p>
                      <p className={styles.wdEmail}>{w.worker?.email}</p>
                    </div>
                  </div>
                  <div className={styles.tdBold}>
                    {fmtAmt(w.amount, w.currency)}
                  </div>
                  <div className={styles.tdMeta}>
                    {w.method?.replace("_", " ") || "—"}
                  </div>
                  <div className={`${styles.tdMeta} ${styles.mono}`}>
                    {w.destination?.slice(0, 18) || "—"}
                  </div>
                  <div className={styles.tdMeta}>{timeAgo(w.createdAt)}</div>
                  <Badge status={w.status} meta={WD_STATUS_META} />
                  <div className={styles.wdActions}>
                    {w.status === "PENDING" && (
                      <>
                        <button
                          className={styles.approveBtn}
                          disabled={acting === w.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(w.id);
                          }}
                          title="Approve — move to Processing"
                        >
                          {acting === w.id ? (
                            <span className={styles.spinner} />
                          ) : (
                            <>
                              <CheckCircle2 size={13} /> Approve
                            </>
                          )}
                        </button>
                        <button
                          className={styles.rejectBtn}
                          disabled={acting === w.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setRejectTarget(w);
                          }}
                          title="Reject with reason"
                        >
                          <XCircle size={13} /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {expanded === w.id && <WithdrawalDetailPanel withdrawal={w} />}
              </div>
            ))
          )}
        </div>
      </div>

      {pages > 1 && (
        <div className={styles.pager}>
          <button
            className={styles.pageBtn}
            disabled={page === 1}
            onClick={() => setParam("wpage", String(page - 1))}
          >
            <ChevronLeft size={13} /> Prev
          </button>
          <span className={styles.pageInfo}>
            Page {page} of {pages}
          </span>
          <button
            className={styles.pageBtn}
            disabled={page === pages}
            onClick={() => setParam("wpage", String(page + 1))}
          >
            Next <ChevronRight size={13} />
          </button>
        </div>
      )}

      {rejectTarget && (
        <RejectModal
          worker={`${rejectTarget.worker?.firstName ?? ""} ${rejectTarget.worker?.lastName ?? ""}`.trim()}
          loading={acting === rejectTarget.id}
          onConfirm={handleReject}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "payments";

  function setTab(t) {
    const p = new URLSearchParams(searchParams);
    p.set("tab", t);
    ["pstatus", "provider", "from", "to", "page", "wstatus", "wpage"].forEach(
      (k) => p.delete(k),
    );
    setSearchParams(p);
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Finance</p>
            <h1 className={styles.pageTitle}>Payments &amp; Payouts</h1>
          </div>
        </div>

        <div className={styles.mainTabs}>
          <button
            className={`${styles.mainTab} ${tab === "payments" ? styles.mainTabActive : ""}`}
            onClick={() => setTab("payments")}
          >
            <CreditCard size={14} /> Transactions
          </button>
          <button
            className={`${styles.mainTab} ${tab === "withdrawals" ? styles.mainTabActive : ""}`}
            onClick={() => setTab("withdrawals")}
          >
            <Wallet size={14} /> Withdrawals
          </button>
        </div>

        {tab === "payments" ? (
          <PaymentsTab
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        ) : (
          <WithdrawalsTab
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        )}
      </div>
    </AdminLayout>
  );
}
