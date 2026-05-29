// src/pages/admin/AdminManualPayments.jsx
// Admin verification panel for manual bank-transfer and crypto payments
// API: GET  /admin/payments?provider=bank_transfer|crypto&status=PENDING
//      PATCH /admin/payments/:bookingId/verify
//      PATCH /admin/payments/:bookingId/reject-manual

import { useState, useEffect, useCallback } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminManualPayments.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtAmt = (n, cur = "NGN") =>
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

function explorerUrl(hash, network) {
  if (!hash || !network) return null;
  const n = network.toLowerCase();
  if (n.includes("bitcoin")) return `https://blockstream.info/tx/${hash}`;
  if (n.includes("ethereum") || n.includes("erc20"))
    return `https://etherscan.io/tx/${hash}`;
  if (n.includes("tron") || n.includes("trc20"))
    return `https://tronscan.org/#/transaction/${hash}`;
  // Default: BSC (most common for USDC/USDT on SkilledProz)
  return `https://bscscan.com/tx/${hash}`;
}

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
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
function StatCard({ icon, label, value, sub, accent }) {
  return (
    <div
      className={`${styles.statCard} ${accent ? styles[`accent_${accent}`] : ""}`}
    >
      <span className={styles.statIcon}>{icon}</span>
      <p className={styles.statVal}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
}

// ─── User Chip ────────────────────────────────────────────────────────────────
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

// ─── Copy Pill ────────────────────────────────────────────────────────────────
function CopyPill({ text, display, mono }) {
  const [ok, setOk] = useState(false);
  async function handle() {
    if (await copyToClipboard(text)) {
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

// ─── Fee Row ──────────────────────────────────────────────────────────────────
function FeeRow({ label, value, cur, highlight }) {
  return (
    <div className={styles.feeRow}>
      <span className={styles.feeLabel}>{label}</span>
      <span
        className={`${styles.feeVal} ${highlight ? styles.feeValHighlight : ""}`}
      >
        {fmtAmt(value, cur)}
      </span>
    </div>
  );
}

// ─── Proof Viewer ─────────────────────────────────────────────────────────────
function ProofViewer({ url }) {
  const [err, setErr] = useState(false);
  if (!url) {
    return (
      <div className={styles.proofEmpty}>
        <span>⚠️</span>
        <p>No proof screenshot uploaded</p>
        <small>Verify via bank statement or contact the hirer directly.</small>
      </div>
    );
  }
  return (
    <div className={styles.proofBlock}>
      <div className={styles.proofImgWrap}>
        {err ? (
          <div className={styles.proofImgErr}>
            <span>🖼️</span>
            <p>Image failed to load</p>
          </div>
        ) : (
          <img
            src={url}
            alt="Payment proof"
            className={styles.proofImg}
            onError={() => setErr(true)}
          />
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className={styles.proofOpenBtn}
      >
        🔍 Open Full Screenshot ↗
      </a>
    </div>
  );
}

// ─── Checklist ────────────────────────────────────────────────────────────────
function Checklist({ items }) {
  const [checked, setChecked] = useState(() =>
    new Array(items.length).fill(false),
  );
  const toggle = (i) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  return (
    <div className={styles.checklist}>
      <p className={styles.checklistTitle}>Before approving, confirm:</p>
      {items.map((item, i) => (
        <label
          key={i}
          className={`${styles.checkItem} ${checked[i] ? styles.checkItemDone : ""}`}
        >
          <input
            type="checkbox"
            checked={checked[i]}
            onChange={() => toggle(i)}
            className={styles.checkbox}
          />
          <span>{item}</span>
        </label>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BANK TRANSFER CARD
// ─────────────────────────────────────────────────────────────────────────────
function BankTransferCard({ payment, onVerify, onReject, verifying }) {
  const [expanded, setExpanded] = useState(false);
  const b = payment.booking;
  const busy = verifying === payment.id;

  return (
    <article
      className={`${styles.payCard} ${expanded ? styles.payCardOpen : ""}`}
    >
      {/* ── Collapsed top row ── */}
      <div
        className={styles.payCardTop}
        onClick={() => setExpanded((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((o) => !o)}
      >
        <div className={styles.payCardTopLeft}>
          <div className={styles.payCardMeta}>
            <span className={styles.refTag}>🏦 {payment.providerRef}</span>
            <span className={styles.timeDim}>{timeAgo(payment.createdAt)}</span>
            {payment.bankName && (
              <span className={styles.bankTag}>{payment.bankName}</span>
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
            {fmtAmt(payment.amount, payment.currency)}
          </p>
          <span className={styles.badgePending}>⏳ Pending Verification</span>
          <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className={styles.payCardBody}>
          {/* Parties */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>PARTIES</p>
            <div className={styles.partiesRow}>
              <UserChip
                label="Hirer (Sent payment)"
                user={{ ...b?.hirer, email: b?.hirer?.email }}
              />
              <span className={styles.arrow}>→</span>
              <UserChip label="Worker (Will receive)" user={b?.worker} />
            </div>
          </div>

          {/* Details + Proof side by side */}
          <div className={styles.twoCol}>
            {/* Transfer details */}
            <div className={styles.infoPanel}>
              <p className={styles.sectionLabel}>🏦 TRANSFER DETAILS</p>

              <div className={styles.infoRows}>
                {[
                  { k: "Bank", v: payment.bankName || "—" },
                  { k: "Account Name", v: payment.accountName || "—" },
                ].map((r) => (
                  <div key={r.k} className={styles.infoRow}>
                    <span className={styles.infoKey}>{r.k}</span>
                    <span className={styles.infoVal}>{r.v}</span>
                  </div>
                ))}
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Reference</span>
                  <CopyPill text={payment.providerRef} mono />
                </div>
              </div>

              <div className={styles.feeTable}>
                <FeeRow
                  label="Total Paid by Hirer"
                  value={payment.amount}
                  cur={payment.currency}
                  highlight
                />
                <FeeRow
                  label="Platform Fee"
                  value={payment.platformFee}
                  cur={payment.currency}
                />
                <FeeRow
                  label="Worker Payout"
                  value={payment.workerPayout}
                  cur={payment.currency}
                />
              </div>

              <div className={styles.infoRow} style={{ marginTop: 10 }}>
                <span className={styles.infoKey}>Submitted</span>
                <span className={styles.infoVal}>
                  {fmtDate(payment.createdAt)}
                </span>
              </div>
            </div>

            {/* Proof screenshot */}
            <div className={styles.infoPanel}>
              <p className={styles.sectionLabel}>📎 PAYMENT PROOF</p>
              <ProofViewer url={payment.bankTransferProof} />
            </div>
          </div>

          {/* Checklist */}
          <Checklist
            items={[
              "Reference number matches the booking exactly",
              "Amount received matches the booking total shown above",
              "Sender name matches the hirer's name",
              "Screenshot is genuine and not edited",
            ]}
          />

          {/* Actions */}
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
              onClick={() => onReject(payment.bookingId, payment.id, b?.title)}
              disabled={busy}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CRYPTO PAYMENT CARD
// ─────────────────────────────────────────────────────────────────────────────
function CryptoCard({ payment, onVerify, onReject, verifying }) {
  const [expanded, setExpanded] = useState(false);
  const b = payment.booking;
  const busy = verifying === payment.id;
  const url = explorerUrl(payment.cryptoTxHash, payment.cryptoNetwork);

  return (
    <article
      className={`${styles.payCard} ${styles.payCardCrypto} ${expanded ? styles.payCardOpen : ""}`}
    >
      {/* ── Collapsed top row ── */}
      <div
        className={styles.payCardTop}
        onClick={() => setExpanded((o) => !o)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && setExpanded((o) => !o)}
      >
        <div className={styles.payCardTopLeft}>
          <div className={styles.payCardMeta}>
            <span className={`${styles.refTag} ${styles.refTagCrypto}`}>
              ₿ {payment.cryptoCurrency} · {payment.cryptoNetwork}
            </span>
            <span className={styles.timeDim}>{timeAgo(payment.createdAt)}</span>
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
            {fmtAmt(payment.amount, payment.currency)}
          </p>
          {payment.cryptoAmount && (
            <p className={styles.cryptoSubAmt}>
              {payment.cryptoAmount} {payment.cryptoCurrency}
            </p>
          )}
          <span className={styles.badgePending}>⏳ Pending Verification</span>
          <span className={styles.chevron}>{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div className={styles.payCardBody}>
          {/* Parties */}
          <div className={styles.section}>
            <p className={styles.sectionLabel}>PARTIES</p>
            <div className={styles.partiesRow}>
              <UserChip label="Hirer (Sent crypto)" user={b?.hirer} />
              <span className={styles.arrow}>→</span>
              <UserChip label="Worker (Will receive)" user={b?.worker} />
            </div>
          </div>

          {/* Details side by side */}
          <div className={styles.twoCol}>
            {/* Transaction details */}
            <div className={styles.infoPanel}>
              <p className={styles.sectionLabel}>₿ TRANSACTION DETAILS</p>
              <div className={styles.infoRows}>
                {[
                  { k: "Currency", v: payment.cryptoCurrency },
                  { k: "Network", v: payment.cryptoNetwork },
                ].map((r) => (
                  <div key={r.k} className={styles.infoRow}>
                    <span className={styles.infoKey}>{r.k}</span>
                    <span className={styles.infoVal}>{r.v || "—"}</span>
                  </div>
                ))}
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Crypto Amount</span>
                  <span className={`${styles.infoVal} ${styles.cryptoVal}`}>
                    {payment.cryptoAmount || "—"} {payment.cryptoCurrency}
                  </span>
                </div>
                <div className={styles.infoRow}>
                  <span className={styles.infoKey}>Reference</span>
                  <CopyPill text={payment.providerRef} mono />
                </div>
              </div>

              <div className={styles.feeTable}>
                <FeeRow
                  label="Fiat Equivalent"
                  value={payment.amount}
                  cur={payment.currency}
                  highlight
                />
                <FeeRow
                  label="Platform Fee"
                  value={payment.platformFee}
                  cur={payment.currency}
                />
                <FeeRow
                  label="Worker Payout"
                  value={payment.workerPayout}
                  cur={payment.currency}
                />
              </div>

              <div className={styles.infoRow} style={{ marginTop: 10 }}>
                <span className={styles.infoKey}>Submitted</span>
                <span className={styles.infoVal}>
                  {fmtDate(payment.createdAt)}
                </span>
              </div>
            </div>

            {/* TX hash + wallet */}
            <div className={styles.infoPanel}>
              <p className={styles.sectionLabel}>🔗 ON-CHAIN VERIFICATION</p>

              {/* Platform wallet */}
              <div className={styles.walletBox}>
                <p className={styles.walletBoxLabel}>
                  Platform Wallet (Recipient)
                </p>
                <CopyPill
                  text={payment.cryptoWallet || "—"}
                  mono
                  display={
                    payment.cryptoWallet
                      ? `${payment.cryptoWallet.slice(0, 8)}…${payment.cryptoWallet.slice(-6)}`
                      : "—"
                  }
                />
              </div>

              {/* TX hash */}
              {payment.cryptoTxHash ? (
                <div className={styles.hashBox}>
                  <p className={styles.walletBoxLabel}>Transaction Hash</p>
                  <div className={styles.hashDisplay}>
                    <code className={styles.hashCode}>
                      {payment.cryptoTxHash}
                    </code>
                    <CopyPill text={payment.cryptoTxHash} display="Copy" />
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.explorerBtn}
                    >
                      🔍 View on Blockchain Explorer ↗
                    </a>
                  )}
                </div>
              ) : (
                <div className={styles.proofEmpty}>
                  <span>⚠️</span>
                  <p>No transaction hash provided</p>
                </div>
              )}
            </div>
          </div>

          {/* Checklist */}
          <Checklist
            items={[
              `Open explorer and confirm the tx hash is valid and confirmed (not pending)`,
              `Confirm recipient wallet matches our platform wallet shown above`,
              `Confirm amount: ${payment.cryptoAmount || "—"} ${payment.cryptoCurrency} matches`,
              `Check the booking reference ${payment.providerRef} appears in the tx memo/note`,
              `Verify the network matches: ${payment.cryptoNetwork}`,
            ]}
          />

          {/* Actions */}
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
              onClick={() => onReject(payment.bookingId, payment.id, b?.title)}
              disabled={busy}
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function RejectModal({ target, onClose, onConfirm, loading }) {
  const [reason, setReason] = useState("");

  const PRESETS = [
    "Transaction hash not found on blockchain",
    "Amount does not match the booking total",
    "Reference number missing from transfer / memo",
    "Screenshot appears to have been edited",
    "Recipient wallet address does not match our wallet",
    "Transaction is pending, not confirmed on-chain",
  ];

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
                The hirer will be notified with your reason and prompted to
                re-submit or contact support. Payment will be marked as FAILED.
              </p>
            </div>
          </div>

          <p className={styles.presetsLabel}>Quick reasons:</p>
          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                key={p}
                className={`${styles.preset} ${reason === p ? styles.presetActive : ""}`}
                onClick={() => setReason(p)}
              >
                {p}
              </button>
            ))}
          </div>

          <label className={styles.textareaLabel}>
            Or write a custom reason *
          </label>
          <textarea
            className={styles.textarea}
            rows={4}
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

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminManualPayments() {
  const [tab, setTab] = useState("bank");
  const [bankList, setBankList] = useState([]);
  const [cryptoList, setCryptoList] = useState([]);
  const [bankMeta, setBankMeta] = useState({ total: 0, pages: 1, summary: {} });
  const [cryptoMeta, setCryptoMeta] = useState({
    total: 0,
    pages: 1,
    summary: {},
  });
  const [bankPage, setBankPage] = useState(1);
  const [cryptoPage, setCryptoPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null); // payment.id being verified
  const [rejectTarget, setRejectTarget] = useState(null); // { bookingId, paymentId, title }
  const [rejecting, setRejecting] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);

  function notify(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const fetchBank = useCallback(async () => {
    try {
      const res = await api.get(
        `/admin/payments?provider=bank_transfer&status=PENDING&page=${bankPage}&limit=15`,
      );
      const d = res.data.data;
      setBankList(d.payments || []);
      setBankMeta({
        total: d.total || 0,
        pages: d.pages || 1,
        summary: d.summary || {},
      });
    } catch {
      notify("Failed to load bank transfers", "error");
    }
  }, [bankPage]);

  const fetchCrypto = useCallback(async () => {
    try {
      const res = await api.get(
        `/admin/payments?provider=crypto&status=PENDING&page=${cryptoPage}&limit=15`,
      );
      const d = res.data.data;
      setCryptoList(d.payments || []);
      setCryptoMeta({
        total: d.total || 0,
        pages: d.pages || 1,
        summary: d.summary || {},
      });
    } catch {
      notify("Failed to load crypto payments", "error");
    }
  }, [cryptoPage]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchBank(), fetchCrypto()]).finally(() => setLoading(false));
  }, [fetchBank, fetchCrypto]);

  // ── Verify ──────────────────────────────────────────────────────────────────
  async function handleVerify(bookingId, paymentId) {
    setVerifying(paymentId);
    try {
      await api.patch(`/admin/payments/${bookingId}/verify`, {});
      notify("Payment verified — funds are now held in escrow ✅");
      fetchBank();
      fetchCrypto();
    } catch (e) {
      notify(e.response?.data?.message || "Verification failed", "error");
    } finally {
      setVerifying(null);
    }
  }

  // ── Reject ──────────────────────────────────────────────────────────────────
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
      notify("Payment rejected — hirer has been notified");
      setRejectTarget(null);
      fetchBank();
      fetchCrypto();
    } catch (e) {
      notify(e.response?.data?.message || "Rejection failed", "error");
    } finally {
      setRejecting(false);
    }
  }

  // ── Search filter (client-side) ─────────────────────────────────────────────
  const q = search.toLowerCase().trim();
  const filter = (list) =>
    !q
      ? list
      : list.filter(
          (p) =>
            p.providerRef?.toLowerCase().includes(q) ||
            p.booking?.title?.toLowerCase().includes(q) ||
            p.booking?.hirer?.firstName?.toLowerCase().includes(q) ||
            p.booking?.hirer?.lastName?.toLowerCase().includes(q) ||
            p.bankName?.toLowerCase().includes(q) ||
            p.cryptoTxHash?.toLowerCase().includes(q) ||
            p.cryptoCurrency?.toLowerCase().includes(q),
        );

  const visibleBank = filter(bankList);
  const visibleCrypto = filter(cryptoList);
  const totalPending = bankMeta.total + cryptoMeta.total;
  const totalGMV =
    (bankMeta.summary.totalGMV || 0) + (cryptoMeta.summary.totalGMV || 0);

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
              Review bank transfers and crypto transactions before releasing
              funds to escrow. Always verify on your bank statement or
              blockchain explorer before approving.
            </p>
          </div>
          {totalPending > 0 && (
            <div className={styles.alertPill}>
              ⚠️ {totalPending} pending review{totalPending !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* ── Stats bar ── */}
        <div className={styles.statsBar}>
          <StatCard
            icon="⏳"
            label="Total Pending"
            value={loading ? "—" : totalPending}
            sub={totalPending > 0 ? "Needs your attention" : "All clear"}
            accent={totalPending > 0 ? "yellow" : ""}
          />
          <StatCard
            icon="🏦"
            label="Bank Transfers"
            value={loading ? "—" : bankMeta.total}
            sub={
              bankMeta.total > 0
                ? `GMV ₦${Math.round(bankMeta.summary.totalGMV || 0).toLocaleString()}`
                : "None pending"
            }
          />
          <StatCard
            icon="₿"
            label="Crypto Payments"
            value={loading ? "—" : cryptoMeta.total}
            sub={cryptoMeta.total > 0 ? "Verify on-chain" : "None pending"}
            accent={cryptoMeta.total > 0 ? "indigo" : ""}
          />
          <StatCard
            icon="💰"
            label="Total Value Pending"
            value={loading ? "—" : `₦${Math.round(totalGMV).toLocaleString()}`}
            accent="orange"
          />
        </div>

        {/* ── Panel ── */}
        <div className={styles.panel}>
          {/* Tab bar + search */}
          <div className={styles.panelHeader}>
            <div className={styles.tabBar}>
              <button
                className={`${styles.tab} ${tab === "bank" ? styles.tabActive : ""}`}
                onClick={() => setTab("bank")}
              >
                🏦 Bank Transfers
                {bankMeta.total > 0 && (
                  <span className={styles.tabBadge}>{bankMeta.total}</span>
                )}
              </button>
              <button
                className={`${styles.tab} ${tab === "crypto" ? styles.tabActive : ""}`}
                onClick={() => setTab("crypto")}
              >
                ₿ Crypto
                {cryptoMeta.total > 0 && (
                  <span
                    className={`${styles.tabBadge} ${styles.tabBadgeCrypto}`}
                  >
                    {cryptoMeta.total}
                  </span>
                )}
              </button>
            </div>

            <div className={styles.searchBar}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                className={styles.searchInput}
                placeholder="Search ref, booking, name, tx hash…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className={styles.clearBtn}
                  onClick={() => setSearch("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {/* ── BANK TRANSFERS TAB ── */}
          {tab === "bank" && (
            <div className={styles.tabContent}>
              {!loading && visibleBank.length > 0 && (
                <div className={styles.howTo}>
                  <span>ℹ️</span>
                  <p>
                    <strong>How to verify:</strong> Check your bank statement
                    for the reference number and exact amount. Open the proof
                    screenshot. If everything matches, click Approve.
                  </p>
                </div>
              )}

              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={styles.skeleton}
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))
              ) : visibleBank.length === 0 ? (
                <div className={styles.empty}>
                  <span>🏦</span>
                  <p className={styles.emptyTitle}>
                    {search
                      ? "No results match your search"
                      : "No pending bank transfers"}
                  </p>
                  <p className={styles.emptySub}>
                    {search
                      ? "Try a different reference or name."
                      : "All bank transfers have been reviewed."}
                  </p>
                </div>
              ) : (
                <>
                  {visibleBank.map((p) => (
                    <BankTransferCard
                      key={p.id}
                      payment={p}
                      onVerify={handleVerify}
                      onReject={openReject}
                      verifying={verifying}
                    />
                  ))}
                  {bankMeta.pages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setBankPage((v) => Math.max(1, v - 1))}
                        disabled={bankPage === 1}
                      >
                        ← Prev
                      </button>
                      <span className={styles.pageInfo}>
                        Page {bankPage} / {bankMeta.pages}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setBankPage((v) => v + 1)}
                        disabled={bankPage >= bankMeta.pages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ── CRYPTO TAB ── */}
          {tab === "crypto" && (
            <div className={styles.tabContent}>
              {!loading && visibleCrypto.length > 0 && (
                <div className={`${styles.howTo} ${styles.howToCrypto}`}>
                  <span>ℹ️</span>
                  <p>
                    <strong>How to verify:</strong> Click the explorer link to
                    confirm the tx hash on-chain. Verify the recipient wallet
                    matches ours, the amount is correct, and the transaction is
                    fully confirmed (not just pending).
                  </p>
                </div>
              )}

              {loading ? (
                [1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={styles.skeleton}
                    style={{ animationDelay: `${i * 80}ms` }}
                  />
                ))
              ) : visibleCrypto.length === 0 ? (
                <div className={styles.empty}>
                  <span>₿</span>
                  <p className={styles.emptyTitle}>
                    {search
                      ? "No results match your search"
                      : "No pending crypto payments"}
                  </p>
                  <p className={styles.emptySub}>
                    {search
                      ? "Try a different tx hash or email."
                      : "All crypto payments have been reviewed."}
                  </p>
                </div>
              ) : (
                <>
                  {visibleCrypto.map((p) => (
                    <CryptoCard
                      key={p.id}
                      payment={p}
                      onVerify={handleVerify}
                      onReject={openReject}
                      verifying={verifying}
                    />
                  ))}
                  {cryptoMeta.pages > 1 && (
                    <div className={styles.pagination}>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setCryptoPage((v) => Math.max(1, v - 1))}
                        disabled={cryptoPage === 1}
                      >
                        ← Prev
                      </button>
                      <span className={styles.pageInfo}>
                        Page {cryptoPage} / {cryptoMeta.pages}
                      </span>
                      <button
                        className={styles.pageBtn}
                        onClick={() => setCryptoPage((v) => v + 1)}
                        disabled={cryptoPage >= cryptoMeta.pages}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
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
