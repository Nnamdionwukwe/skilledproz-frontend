// src/pages/admin/AdminManualPayments.jsx
// Complete admin manual-payment verification panel.
//
// Features:
//   • All payment attempts per booking (retries, failures, pending, verified)
//   • Bank transfer + crypto — unified list with per-tab filtering
//   • Referral-discount badge when discount was applied
//   • Proof-of-payment image viewer for BOTH bank and crypto
//   • Status filter: All / Pending / Verified (HELD) / Failed / Released / Refunded
//   • Date range + search (ref, hash, name, title)
//   • Payment-attempt history drawer per payment card
//   • Stats bar with live counts per status
//   • Reject modal with preset reasons
//   • Audit-friendly checklist before approving
//   • Pagination
//   • CSV export of visible payments
//
// API:
//   GET  /admin/payments?provider&status&from&to&search&page&limit
//   GET  /admin/payments/booking/:bookingId/attempts
//   GET  /admin/payments/stats
//   PATCH /admin/payments/:bookingId/verify
//   PATCH /admin/payments/:bookingId/reject-manual

import { useState, useEffect, useCallback, useRef } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminManualPayments.module.css";

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n, cur = "NGN") =>
  `${cur} ${Number(n || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

const timeAgo = (d) => {
  if (!d) return "—";
  const m = Math.floor((Date.now() - new Date(d)) / 60000);
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

const STATUS_COLORS = {
  PENDING: {
    bg: "rgba(234,179,8,.12)",
    text: "#eab308",
    border: "rgba(234,179,8,.4)",
  },
  HELD: {
    bg: "rgba(129,140,248,.12)",
    text: "#818cf8",
    border: "rgba(129,140,248,.4)",
  },
  RELEASED: {
    bg: "rgba(34,197,94,.12)",
    text: "var(--green)",
    border: "rgba(34,197,94,.35)",
  },
  FAILED: {
    bg: "rgba(239,68,68,.12)",
    text: "var(--red)",
    border: "rgba(239,68,68,.35)",
  },
  REFUNDED: {
    bg: "rgba(239,68,68,.08)",
    text: "#f87171",
    border: "rgba(239,68,68,.25)",
  },
};

const STATUS_LABELS = {
  PENDING: "⏳ Pending",
  HELD: "🔒 In Escrow",
  RELEASED: "✅ Released",
  FAILED: "❌ Failed",
  REFUNDED: "↩ Refunded",
};

function explorerUrl(hash, network) {
  if (!hash) return null;
  const n = (network || "").toLowerCase();
  if (n.includes("bitcoin")) return `https://blockstream.info/tx/${hash}`;
  if (n.includes("ethereum") || n.includes("erc20"))
    return `https://etherscan.io/tx/${hash}`;
  if (n.includes("tron") || n.includes("trc20"))
    return `https://tronscan.org/#/transaction/${hash}`;
  return `https://bscscan.com/tx/${hash}`;
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
  return (
    <span
      className={styles.statusBadge}
      style={{ background: c.bg, color: c.text, borderColor: c.border }}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}
function ReferralBadge({ amount, currency = "NGN" }) {
  if (!amount || amount <= 0) return null;
  return (
    <span
      className={styles.referralBadge}
      title={`Referral discount applied: ${currency} ${Number(amount).toLocaleString()} off the gross total`}
    >
      🎁 −{currency} {Number(amount).toLocaleString()} referral
    </span>
  );
}

function CopyPill({ text, display, mono }) {
  const [ok, setOk] = useState(false);
  async function handle() {
    if (await copy(text)) {
      setOk(true);
      setTimeout(() => setOk(false), 1600);
    }
  }
  return (
    <span
      className={`${styles.copyPill} ${mono ? styles.copyPillMono : ""} ${ok ? styles.copyPillOk : ""}`}
    >
      <span className={styles.copyPillText}>{display ?? text}</span>
      <button className={styles.copyPillBtn} onClick={handle} title="Copy">
        {ok ? "✓" : "⎘"}
      </button>
    </span>
  );
}

function ProofViewer({ url, label = "Payment Proof" }) {
  const [err, setErr] = useState(false);
  if (!url)
    return (
      <div className={styles.proofEmpty}>
        <span>📎</span>
        <p>No proof uploaded</p>
        <small>Verify via bank statement or blockchain explorer.</small>
      </div>
    );
  const isPdf = url.toLowerCase().includes(".pdf");
  return (
    <div className={styles.proofBlock}>
      <p className={styles.proofBlockLabel}>{label}</p>
      {isPdf ? (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className={styles.proofOpenBtn}
        >
          📄 Open PDF Receipt ↗
        </a>
      ) : err ? (
        <div className={styles.proofImgErr}>
          <span>🖼️</span>
          <p>Image failed to load</p>
        </div>
      ) : (
        <div className={styles.proofImgWrap}>
          <img
            src={url}
            alt="Payment proof"
            className={styles.proofImg}
            onError={() => setErr(true)}
          />
        </div>
      )}
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={styles.proofOpenBtn}
      >
        🔍 Open Full Size ↗
      </a>
    </div>
  );
}

function Checklist({ items }) {
  const [checked, setChecked] = useState(() =>
    new Array(items.length).fill(false),
  );
  const allChecked = checked.every(Boolean);
  return (
    <div
      className={`${styles.checklist} ${allChecked ? styles.checklistComplete : ""}`}
    >
      <p className={styles.checklistTitle}>Before approving, confirm all:</p>
      {items.map((item, i) => (
        <label
          key={i}
          className={`${styles.checkItem} ${checked[i] ? styles.checkItemDone : ""}`}
        >
          <input
            type="checkbox"
            checked={checked[i]}
            onChange={() =>
              setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)))
            }
            className={styles.checkbox}
          />
          <span>{item}</span>
        </label>
      ))}
      {allChecked && (
        <p className={styles.checklistAllDone}>
          ✅ All checks passed — safe to approve
        </p>
      )}
    </div>
  );
}

function FeeRow({ label, value, cur, highlight, green, muted }) {
  return (
    <div className={styles.feeRow}>
      <span
        className={`${styles.feeLabel} ${muted ? styles.feeLabelMuted : ""}`}
      >
        {label}
      </span>
      <span
        className={`${styles.feeVal} ${highlight ? styles.feeValHighlight : ""} ${green ? styles.feeValGreen : ""}`}
      >
        {fmt(value, cur)}
      </span>
    </div>
  );
}

function UserChip({ label, user }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";
  return (
    <div className={styles.userChip}>
      <div className={styles.userChipAvatar}>
        {user?.avatar ? (
          <img src={user.avatar} alt="" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      <div>
        <p className={styles.userChipRole}>{label}</p>
        <p className={styles.userChipName}>
          {user?.firstName} {user?.lastName}
        </p>
        {user?.email && <p className={styles.userChipEmail}>{user.email}</p>}
      </div>
    </div>
  );
}

// ── Attempts Drawer ────────────────────────────────────────────────────────────
function AttemptsDrawer({ bookingId, onClose }) {
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/admin/payments/booking/${bookingId}/attempts`)
      .then((r) => setAttempts(r.data.data.attempts || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  return (
    <div className={styles.attemptsDrawer}>
      <div className={styles.attemptsDrawerHeader}>
        <p className={styles.attemptsDrawerTitle}>📋 All Payment Attempts</p>
        <button className={styles.attemptsDrawerClose} onClick={onClose}>
          ×
        </button>
      </div>
      {loading ? (
        <div className={styles.attemptsLoading}>
          <span className={styles.spin} /> Loading…
        </div>
      ) : attempts.length === 0 ? (
        <p className={styles.attemptsEmpty}>No payment attempts found.</p>
      ) : (
        <div className={styles.attemptsList}>
          {attempts.map((a, i) => (
            <div
              key={a.id}
              className={`${styles.attemptRow} ${i === 0 ? styles.attemptRowLatest : ""}`}
            >
              <div className={styles.attemptRowLeft}>
                <span className={styles.attemptNum}>#{a.attemptNumber}</span>
                <div>
                  <div className={styles.attemptProvider}>
                    {a.provider === "bank_transfer" ? "🏦" : "₿"}{" "}
                    {a.provider.replace("_", " ")}
                    <ReferralBadge
                      amount={a.referralDiscount}
                      currency={a.currency}
                    />
                  </div>
                  <p className={styles.attemptDate}>{fmtDate(a.createdAt)}</p>
                  {a.providerRef && (
                    <p className={styles.attemptRef}>{a.providerRef}</p>
                  )}
                  {a.cryptoTxHash && (
                    <p
                      className={styles.attemptRef}
                      style={{ fontFamily: "monospace" }}
                    >
                      {a.cryptoTxHash.slice(0, 20)}…
                    </p>
                  )}
                  {a.notes &&
                    (() => {
                      try {
                        const n = JSON.parse(a.notes);
                        return n.reason ? (
                          <p className={styles.attemptRejReason}>
                            Rejected: {n.reason}
                          </p>
                        ) : null;
                      } catch {
                        return null;
                      }
                    })()}
                </div>
              </div>
              <div className={styles.attemptRowRight}>
                <span className={styles.attemptAmt}>
                  {fmt(a.amount, a.currency)}
                </span>
                <StatusBadge status={a.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Payment Card ───────────────────────────────────────────────────────────────
function PaymentCard({ payment, onVerify, onReject, verifying }) {
  const [expanded, setExpanded] = useState(false);
  const [showAttempts, setShowAttempts] = useState(false);

  const b = payment.booking;
  const busy = verifying === payment.id;
  const isCrypto = payment.provider === "crypto";
  const isBank = payment.provider === "bank_transfer";
  const isPending = payment.status === "PENDING";
  const explorerLink = explorerUrl(payment.cryptoTxHash, payment.cryptoNetwork);
  const hasReferral = payment.referralDiscount > 0;

  const bankChecklist = [
    "Reference number matches the booking exactly",
    "Amount matches the booking total shown above",
    "Sender name matches the hirer's registered name",
    "Screenshot is genuine and unedited",
  ];

  const cryptoChecklist = [
    "Open explorer link and confirm the tx is confirmed (not pending)",
    `Recipient wallet matches our platform wallet`,
    `Amount: ${payment.cryptoAmount || "—"} ${payment.cryptoCurrency} is correct`,
    `Network matches: ${payment.cryptoNetwork}`,
    `Reference ${payment.providerRef} appears in the memo / note`,
  ];

  return (
    <article
      className={`${styles.payCard} ${expanded ? styles.payCardOpen : ""} ${isCrypto ? styles.payCardCrypto : ""}`}
    >
      {/* Collapsed top row */}
      <div
        className={styles.payCardTop}
        onClick={() => setExpanded((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((o) => !o)}
      >
        <div className={styles.payCardTopLeft}>
          <div className={styles.payCardMeta}>
            <span
              className={`${styles.refTag} ${isCrypto ? styles.refTagCrypto : ""}`}
            >
              {isBank ? "🏦" : "₿"} {payment.providerRef}
            </span>
            {hasReferral && (
              <ReferralBadge
                amount={payment.referralDiscount}
                currency={payment.currency}
              />
            )}
            <span className={styles.timeDim}>{timeAgo(payment.createdAt)}</span>
            {payment.bankName && (
              <span className={styles.bankTag}>{payment.bankName}</span>
            )}
            {isCrypto && payment.cryptoCurrency && (
              <span className={styles.cryptoTag}>
                {payment.cryptoCurrency} · {payment.cryptoNetwork}
              </span>
            )}
          </div>
          <p className={styles.payCardTitle}>
            {b?.title || "Untitled Booking"}
          </p>
          <p className={styles.payCardSub}>
            {b?.hirer?.firstName} {b?.hirer?.lastName} → {b?.worker?.firstName}{" "}
            {b?.worker?.lastName}
          </p>
        </div>
        <div className={styles.payCardTopRight}>
          <p className={styles.payCardAmt}>
            {fmt(payment.amount, payment.currency)}
          </p>
          {hasReferral && (
            <p className={styles.referralSaving}>
              🎁 saved ₦{Number(payment.referralDiscount).toLocaleString()}
            </p>
          )}
          <StatusBadge status={payment.status} />
          <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className={styles.payCardBody}>
          {/* Parties */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>PARTIES</p>
            <div className={styles.partiesRow}>
              <UserChip label="Hirer (paid)" user={b?.hirer} />
              <span className={styles.arrow}>→</span>
              <UserChip label="Worker (receives)" user={b?.worker} />
            </div>
          </div>

          {/* ── Referral discount banner ── */}
          {hasReferral && (
            <div className={styles.referralBanner}>
              <span className={styles.referralBannerIcon}>🎁</span>
              <div className={styles.referralBannerBody}>
                <p className={styles.referralBannerTitle}>
                  Referral Discount Applied
                </p>
                <p className={styles.referralBannerText}>
                  The hirer had an active referral bonus.{" "}
                  <strong>
                    {payment.currency}{" "}
                    {Number(payment.referralDiscount).toLocaleString()}
                  </strong>{" "}
                  was deducted from the gross total before payment. This is why{" "}
                  <em>Hirer paid</em> is less than{" "}
                  <em>Platform fee + Worker payout</em>.
                </p>
                <div className={styles.referralBannerMath}>
                  <span>
                    Gross: {payment.currency}{" "}
                    {Number(
                      (payment.workerPayout || 0) + (payment.platformFee || 0),
                    ).toLocaleString()}
                  </span>
                  <span className={styles.referralBannerMinus}>
                    − Referral: {payment.currency}{" "}
                    {Number(payment.referralDiscount).toLocaleString()}
                  </span>
                  <span className={styles.referralBannerResult}>
                    = Charged: {payment.currency}{" "}
                    {Number(payment.amount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Detail columns */}
          <div className={styles.twoCol}>
            {/* Left: Transfer / Crypto details + fee table */}
            <div className={styles.infoPanel}>
              <p className={styles.sectionLabel}>
                {isBank ? "🏦 TRANSFER DETAILS" : "₿ TRANSACTION DETAILS"}
              </p>

              <div className={styles.infoRows}>
                {isBank &&
                  [
                    ["Bank", payment.bankName || "—"],
                    ["Account Name", payment.accountName || "—"],
                  ].map(([k, v]) => (
                    <div key={k} className={styles.infoRow}>
                      <span className={styles.infoKey}>{k}</span>
                      <span className={styles.infoVal}>{v}</span>
                    </div>
                  ))}
                {isCrypto &&
                  [
                    ["Currency", payment.cryptoCurrency || "—"],
                    ["Network", payment.cryptoNetwork || "—"],
                    [
                      "Crypto Amount",
                      `${payment.cryptoAmount || "—"} ${payment.cryptoCurrency || ""}`,
                    ],
                  ].map(([k, v]) => (
                    <div key={k} className={styles.infoRow}>
                      <span className={styles.infoKey}>{k}</span>
                      <span
                        className={`${styles.infoVal} ${isCrypto ? styles.cryptoVal : ""}`}
                      >
                        {v}
                      </span>
                    </div>
                  ))}
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Reference</span>
                  <CopyPill text={payment.providerRef} mono />
                </div>
                {isCrypto && payment.cryptoTxHash && (
                  <div className={styles.infoRow}>
                    <span className={styles.infoKey}>TX Hash</span>
                    <CopyPill
                      text={payment.cryptoTxHash}
                      display={`${payment.cryptoTxHash.slice(0, 10)}…${payment.cryptoTxHash.slice(-6)}`}
                      mono
                    />
                  </div>
                )}
              </div>

              {/* Fee breakdown */}
              <div className={styles.feeTable}>
                {payment.referralDiscount > 0 && (
                  <FeeRow
                    label="Gross (before discount)"
                    value={
                      (payment.workerPayout || 0) + (payment.platformFee || 0)
                    }
                    cur={payment.currency}
                    muted
                  />
                )}
                {payment.referralDiscount > 0 && (
                  <FeeRow
                    label="🎁 Referral discount"
                    value={-payment.referralDiscount}
                    cur={payment.currency}
                    green
                  />
                )}
                <FeeRow
                  label="Hirer paid"
                  value={payment.amount}
                  cur={payment.currency}
                  highlight
                />
                <FeeRow
                  label="Platform fee"
                  value={payment.platformFee}
                  cur={payment.currency}
                />
                <FeeRow
                  label="Worker payout"
                  value={payment.workerPayout}
                  cur={payment.currency}
                  green
                />
              </div>

              <div className={styles.infoRow} style={{ marginTop: 8 }}>
                <span className={styles.infoKey}>Submitted</span>
                <span className={styles.infoVal}>
                  {fmtDate(payment.createdAt)}
                </span>
              </div>

              {/* Platform wallet for crypto */}
              {isCrypto && payment.cryptoWallet && (
                <div className={styles.walletBox}>
                  <p className={styles.walletBoxLabel}>
                    Platform Wallet (recipient)
                  </p>
                  <CopyPill
                    text={payment.cryptoWallet}
                    display={`${payment.cryptoWallet.slice(0, 8)}…${payment.cryptoWallet.slice(-6)}`}
                    mono
                  />
                  {explorerLink && (
                    <a
                      href={explorerLink}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.explorerBtn}
                    >
                      🔍 View on Blockchain Explorer ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Right: Proof of payment (bank receipt OR crypto screenshot) */}
            <div className={styles.infoPanel}>
              <p className={styles.sectionLabel}>📎 PROOF OF PAYMENT</p>
              {/* Bank uses bankTransferProof; crypto screenshot is also stored in bankTransferProof */}
              <ProofViewer
                url={payment.bankTransferProof}
                label={
                  isBank
                    ? "Bank Transfer Receipt"
                    : "Crypto Transaction Screenshot"
                }
              />
            </div>
          </div>

          {/* Checklist — only for PENDING payments */}
          {isPending && (
            <Checklist items={isBank ? bankChecklist : cryptoChecklist} />
          )}

          {/* View all attempts button */}
          <button
            className={styles.attemptsBtn}
            onClick={() => setShowAttempts((o) => !o)}
          >
            {showAttempts
              ? "▲ Hide payment history"
              : "🕐 View all payment attempts for this booking"}
          </button>

          {showAttempts && (
            <AttemptsDrawer
              bookingId={payment.bookingId}
              onClose={() => setShowAttempts(false)}
            />
          )}

          {/* Actions */}
          {isPending && (
            <div className={styles.actionRow}>
              <button
                className={styles.approveBtn}
                onClick={() => onVerify(payment.bookingId, payment.id)}
                disabled={busy}
              >
                {busy ? (
                  <>
                    <span className={styles.spin} /> Verifying…
                  </>
                ) : (
                  "✅ Approve — Move to Escrow"
                )}
              </button>
              <button
                className={styles.rejectBtn}
                onClick={() =>
                  onReject(payment.bookingId, payment.id, b?.title)
                }
                disabled={busy}
              >
                ❌ Reject
              </button>
            </div>
          )}

          {!isPending && (
            <div className={styles.readonlyStatus}>
              <StatusBadge status={payment.status} />
              <span className={styles.readonlyNote}>
                {payment.status === "HELD" && "Funds are held in escrow."}
                {payment.status === "RELEASED" &&
                  "Payment has been released to the worker."}
                {payment.status === "FAILED" &&
                  "This payment was rejected or failed."}
                {payment.status === "REFUNDED" &&
                  "Payment was refunded to the hirer."}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

// ── Reject Modal ───────────────────────────────────────────────────────────────
const REJECT_PRESETS = [
  "Transaction hash not found on blockchain",
  "Amount does not match the booking total",
  "Reference number missing from transfer / memo",
  "Screenshot appears edited or invalid",
  "Recipient wallet address does not match our wallet",
  "Transaction is still pending, not confirmed on-chain",
  "Bank statement does not show matching transfer",
];

function RejectModal({ target, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>❌ Reject Payment</p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.rejectAlert}>
            <span>⚠️</span>
            <div>
              <p className={styles.rejectAlertTitle}>
                Rejecting: "{target?.title}"
              </p>
              <p className={styles.rejectAlertText}>
                The hirer will be notified with your reason and may retry with
                another method. Payment will be marked FAILED.
              </p>
            </div>
          </div>
          <p className={styles.presetsLabel}>Quick reasons:</p>
          <div className={styles.presets}>
            {REJECT_PRESETS.map((p) => (
              <button
                key={p}
                className={`${styles.preset} ${reason === p ? styles.presetActive : ""}`}
                onClick={() => setReason(p)}
              >
                {p}
              </button>
            ))}
          </div>
          <label className={styles.textareaLabel}>Custom reason *</label>
          <textarea
            className={styles.textarea}
            rows={3}
            placeholder="Describe exactly what didn't match so the hirer can fix it…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className={styles.modalActions}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button
              className={styles.confirmRejectBtn}
              onClick={() => onConfirm(reason)}
              disabled={loading || !reason.trim()}
            >
              {loading ? (
                <>
                  <span className={styles.spin} /> Rejecting…
                </>
              ) : (
                "Confirm Rejection"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminManualPayments() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejecting, setRejecting] = useState(false);
  const [toast, setToast] = useState(null);

  // Filters
  const [providerTab, setProviderTab] = useState("ALL"); // ALL | bank_transfer | crypto
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const searchTimer = useRef(null);

  function notify(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(providerTab !== "ALL" ? { provider: providerTab } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(search ? { search } : {}),
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
      });
      const res = await api.get(`/admin/payments?${params}`);
      const d = res.data.data;
      setPayments(d.payments || []);
      setTotal(d.total || 0);
      setPages(d.pages || 1);
      setSummary(d.summary || {});
    } catch {
      notify("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, [page, providerTab, statusFilter, search, from, to]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Debounced search
  function handleSearchChange(val) {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 400);
  }

  // ── Verify ─────────────────────────────────────────────────────────────────
  async function handleVerify(bookingId, paymentId) {
    setVerifying(paymentId);
    try {
      await api.patch(`/admin/payments/${bookingId}/verify`);
      notify("Payment verified — funds held in escrow ✅");
      fetchPayments();
    } catch (e) {
      notify(e.response?.data?.message || "Verification failed", "error");
    } finally {
      setVerifying(null);
    }
  }

  // ── Reject ─────────────────────────────────────────────────────────────────
  function openReject(bookingId, paymentId, title) {
    setRejectTarget({ bookingId, paymentId, title });
  }

  async function handleRejectConfirm(reason) {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await api.patch(
        `/admin/payments/${rejectTarget.bookingId}/reject-manual`,
        { reason },
      );
      notify("Payment rejected — hirer notified");
      setRejectTarget(null);
      fetchPayments();
    } catch (e) {
      notify(e.response?.data?.message || "Rejection failed", "error");
    } finally {
      setRejecting(false);
    }
  }

  // ── CSV Export ──────────────────────────────────────────────────────────────
  function handleExport() {
    const rows = [
      [
        "Date",
        "Booking",
        "Hirer",
        "Worker",
        "Provider",
        "Ref / TX Hash",
        "Amount",
        "Currency",
        "Status",
        "Referral Discount",
      ],
      ...payments.map((p) => [
        fmtDate(p.createdAt),
        p.booking?.title || "",
        `${p.booking?.hirer?.firstName || ""} ${p.booking?.hirer?.lastName || ""}`.trim(),
        `${p.booking?.worker?.firstName || ""} ${p.booking?.worker?.lastName || ""}`.trim(),
        p.provider,
        p.provider === "crypto"
          ? p.cryptoTxHash || p.providerRef
          : p.providerRef,
        p.amount,
        p.currency,
        p.status,
        p.referralDiscount || 0,
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `manual-payments-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalPending = summary.PENDING?.count || 0;
  const totalHeld = summary.HELD?.count || 0;
  const totalFailed = summary.FAILED?.count || 0;
  const totalReleased = summary.RELEASED?.count || 0;
  const totalGMV = Object.values(summary).reduce(
    (s, v) => s + (v?.gmv || 0),
    0,
  );

  const STATUS_FILTER_OPTS = [
    "ALL",
    "PENDING",
    "HELD",
    "RELEASED",
    "FAILED",
    "REFUNDED",
  ];

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <p className={styles.eyebrow}>Admin · Payments</p>
            <h1 className={styles.title}>Manual Payment Verification</h1>
            <p className={styles.subtitle}>
              Review bank transfers and crypto transactions. Verify on bank
              statements or blockchain before approving. All attempts —
              including retries and failures — are shown.
            </p>
          </div>
          <div className={styles.headerRight}>
            {totalPending > 0 && (
              <div className={styles.alertPill}>⚠️ {totalPending} pending</div>
            )}
            <button
              className={styles.exportBtn}
              onClick={handleExport}
              disabled={payments.length === 0}
            >
              ⬇ Export CSV
            </button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div className={styles.statsBar}>
          {[
            {
              icon: "⏳",
              label: "Pending",
              value: totalPending,
              accent: totalPending > 0 ? "yellow" : "",
            },
            {
              icon: "🔒",
              label: "In Escrow",
              value: totalHeld,
              accent: totalHeld > 0 ? "indigo" : "",
            },
            { icon: "✅", label: "Released", value: totalReleased, accent: "" },
            {
              icon: "❌",
              label: "Failed",
              value: totalFailed,
              accent: totalFailed > 0 ? "red" : "",
            },
            {
              icon: "💰",
              label: "Total GMV",
              value: `₦${Math.round(totalGMV).toLocaleString()}`,
              accent: "orange",
            },
          ].map((s) => (
            <div
              key={s.label}
              className={`${styles.statCard} ${s.accent ? styles[`accent_${s.accent}`] : ""}`}
            >
              <span className={styles.statIcon}>{s.icon}</span>
              <p className={styles.statVal}>{s.value}</p>
              <p className={styles.statLabel}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className={styles.filterBar}>
          {/* Provider tabs */}
          <div className={styles.tabBar}>
            {[
              { id: "ALL", label: "All", icon: "📋" },
              { id: "bank_transfer", label: "Bank Transfer", icon: "🏦" },
              { id: "crypto", label: "Crypto", icon: "₿" },
            ].map((t) => (
              <button
                key={t.id}
                className={`${styles.tab} ${providerTab === t.id ? styles.tabActive : ""}`}
                onClick={() => {
                  setProviderTab(t.id);
                  setPage(1);
                }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          <div className={styles.filterRight}>
            {/* Status filter */}
            <select
              className={styles.statusSelect}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              {STATUS_FILTER_OPTS.map((s) => (
                <option key={s} value={s}>
                  {s === "ALL" ? "All Statuses" : s}
                </option>
              ))}
            </select>

            {/* Date range */}
            <input
              type="date"
              className={styles.dateInput}
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              title="From date"
            />
            <input
              type="date"
              className={styles.dateInput}
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              title="To date"
            />

            {/* Search */}
            <div className={styles.searchWrap}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                placeholder="Ref, hash, name, title…"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {searchInput && (
                <button
                  className={styles.clearBtn}
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Payment list ── */}
        <div className={styles.list}>
          {loading ? (
            [1, 2, 3].map((i) => (
              <div
                key={i}
                className={styles.skeleton}
                style={{ animationDelay: `${i * 80}ms` }}
              />
            ))
          ) : payments.length === 0 ? (
            <div className={styles.empty}>
              <span>{providerTab === "crypto" ? "₿" : "🏦"}</span>
              <p className={styles.emptyTitle}>No payments found</p>
              <p className={styles.emptySub}>
                Try adjusting your filters or date range.
              </p>
            </div>
          ) : (
            payments.map((p) => (
              <PaymentCard
                key={p.id}
                payment={p}
                onVerify={handleVerify}
                onReject={openReject}
                verifying={verifying}
              />
            ))
          )}
        </div>

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={page === 1}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} / {pages} · {total} total
            </span>
            <button
              className={styles.pageBtn}
              onClick={() => setPage((v) => v + 1)}
              disabled={page >= pages}
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {rejectTarget && (
        <RejectModal
          target={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onConfirm={handleRejectConfirm}
          loading={rejecting}
        />
      )}
    </AdminLayout>
  );
}
