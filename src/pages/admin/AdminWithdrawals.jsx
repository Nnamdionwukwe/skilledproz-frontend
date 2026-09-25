// src/pages/withdrawals/AdminWithdrawals.jsx
// Full withdrawal / payout queue management — complete backend field coverage.
//
// Endpoints:
//   GET    /admin/withdrawals?status=&page=&limit=
//   PATCH  /admin/withdrawals/:id/approve   { notes }
//   PATCH  /admin/withdrawals/:id/reject    { reason }
//
// Renders EVERY field the backend sends:
//   • Bank transfer details: bankCode, bankName, accountNumber, accountName, country
//   • Mobile money: mobileNumber, mobileName, mobileProvider, country
//   • Crypto: cryptoAddress, cryptoCurrency, cryptoNetwork
//   • Fee / debt info: originalAmount, debtDeducted, debtBalanceBefore,
//                       withdrawalFee, netPayout, adminNotes, approvedAt
//   • Provider payout metadata: provider, transferId, transferCode
//   • Failure info: error, failedAt
//   • Identifiers: withdrawal.id, workerId, reference
//   • Timestamps: createdAt, updatedAt, processedAt, completedAt

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Landmark,
  Bitcoin,
  Smartphone,
  CreditCard,
  ArrowLeftRight,
  Wallet,
  Clock,
  Zap,
  ClipboardList,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  X,
  Copy,
  Check,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Eye,
  Building2,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import s from "./AdminWithdrawals.module.css";

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_TABS = [
  { key: "ALL", label: "All" },
  { key: "PENDING", label: "Pending" },
  { key: "PROCESSING", label: "Processing" },
  { key: "COMPLETED", label: "Completed" },
  { key: "FAILED", label: "Failed" },
  { key: "CANCELLED", label: "Cancelled" },
];

const STATUS_META = {
  PENDING: { label: "Pending", color: "yellow" },
  PROCESSING: { label: "Processing", color: "indigo" },
  COMPLETED: { label: "Completed", color: "green" },
  FAILED: { label: "Failed", color: "red" },
  CANCELLED: { label: "Cancelled", color: "dim" },
};

// Icon map for methods. Each entry is the component + a key for display.
const METHOD_ICONS = {
  bank_transfer: { Icon: Landmark, key: "bank_transfer" },
  crypto: { Icon: Bitcoin, key: "crypto" },
  paypal: { Icon: CreditCard, key: "paypal" },
  stripe: { Icon: CreditCard, key: "stripe" },
  mobile_money: { Icon: Smartphone, key: "mobile_money" },
  wire_transfer: { Icon: ArrowLeftRight, key: "wire_transfer" },
};

function MethodIcon({ method, size = 16, className }) {
  const entry = METHOD_ICONS[method];
  const Icon = entry?.Icon ?? Wallet;
  return <Icon size={size} className={className} />;
}

const LIMIT = 15;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(amount, currency = "USD") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRelative(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
}

function methodLabel(method) {
  return (method ?? "unknown").replace(/_/g, " ");
}

function parseMeta(withdrawal) {
  const raw = withdrawal?.meta ?? withdrawal?.details;
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ user }) {
  return (
    <div className={s.avatar}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const meta = STATUS_META[status] ?? { label: status, color: "dim" };
  return (
    <span className={`${s.badge} ${s[`badge_${meta.color}`]}`}>
      {meta.label}
    </span>
  );
}

// ─── Copy pill ────────────────────────────────────────────────────────────────
function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={s.mono}>—</span>;
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
        title="Copy"
      >
        {ok ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, accent, delay }) {
  return (
    <div
      className={`${s.statCard} ${accent ? s[`accent_${accent}`] : ""}`}
      style={{ animationDelay: `${delay}s` }}
    >
      <span className={s.statIcon}>{icon}</span>
      <div className={s.statValue}>{value}</div>
      <div className={s.statLabel}>{label}</div>
      {sub && <div className={s.statSub}>{sub}</div>}
    </div>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRows() {
  return (
    <>
      {Array.from({ length: LIMIT }).map((_, i) => (
        <div key={i} className={s.skRow} />
      ))}
    </>
  );
}

// ─── Approve modal ────────────────────────────────────────────────────────────
function ApproveModal({ withdrawal, onClose, onSuccess }) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const meta = parseMeta(withdrawal);

  async function handleApprove() {
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/withdrawals/${withdrawal.id}/approve`, { notes });
      onSuccess("Withdrawal approved — now processing.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to approve withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            <CheckCircle2 size={16} /> Approve Withdrawal
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className={s.modalBody}>
          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Worker</span>
              <span className={s.summaryVal}>
                {withdrawal.worker?.firstName} {withdrawal.worker?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Amount</span>
              <span className={`${s.summaryVal} ${s.amountHighlight}`}>
                {fmt(withdrawal.amount, withdrawal.currency)}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Method</span>
              <span className={s.summaryVal}>
                <MethodIcon method={withdrawal.method} size={13} />
                <span style={{ marginLeft: 5 }}>
                  {methodLabel(withdrawal.method)}
                </span>
              </span>
            </div>
            {withdrawal.destination && (
              <div className={s.summaryRow}>
                <span className={s.summaryLabel}>Destination</span>
                <span className={`${s.summaryVal} ${s.mono}`}>
                  {withdrawal.destination}
                </span>
              </div>
            )}
            {meta.withdrawalFee > 0 && (
              <div className={s.summaryRow}>
                <span className={s.summaryLabel}>Withdrawal fee</span>
                <span className={s.summaryVal}>
                  {fmt(meta.withdrawalFee, withdrawal.currency)}
                </span>
              </div>
            )}
            {meta.netPayout != null && (
              <div className={s.summaryRow}>
                <span className={s.summaryLabel}>Net payout</span>
                <span className={`${s.summaryVal} ${s.amountHighlight}`}>
                  {fmt(meta.netPayout, withdrawal.currency)}
                </span>
              </div>
            )}
          </div>

          <div className={s.approveNote}>
            <AlertTriangle size={16} />
            <p>
              Approving will move this withdrawal to <strong>PROCESSING</strong>{" "}
              and notify the worker. Ensure the payout has been initiated
              externally before marking complete.
            </p>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>Internal Notes (optional)</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Sent via bank on 25 May…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={s.btnApprove}
              onClick={handleApprove}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                <>
                  <CheckCircle2 size={14} /> Approve &amp; Process
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Reject modal ─────────────────────────────────────────────────────────────
function RejectModal({ withdrawal, onClose, onSuccess }) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleReject() {
    if (!reason.trim()) {
      setError("Please provide a rejection reason.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.patch(`/admin/withdrawals/${withdrawal.id}/reject`, { reason });
      onSuccess("Withdrawal rejected and worker notified.");
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to reject withdrawal.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div className={s.modal} onClick={(e) => e.stopPropagation()}>
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            <XCircle size={16} /> Reject Withdrawal
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className={s.modalBody}>
          <div className={s.summaryCard}>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Worker</span>
              <span className={s.summaryVal}>
                {withdrawal.worker?.firstName} {withdrawal.worker?.lastName}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Amount</span>
              <span className={`${s.summaryVal} ${s.amountHighlight}`}>
                {fmt(withdrawal.amount, withdrawal.currency)}
              </span>
            </div>
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Method</span>
              <span className={s.summaryVal}>
                <MethodIcon method={withdrawal.method} size={13} />
                <span style={{ marginLeft: 5 }}>
                  {methodLabel(withdrawal.method)}
                </span>
              </span>
            </div>
          </div>

          <div className={s.field}>
            <label className={s.fieldLabel}>Rejection Reason *</label>
            <textarea
              className={s.textarea}
              rows={3}
              placeholder="e.g. Incorrect bank details provided. Please re-submit with valid IBAN."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
            />
          </div>

          {error && <p className={s.inlineError}>{error}</p>}

          <div className={s.modalActions}>
            <button className={s.btnGhost} onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button
              className={s.btnReject}
              onClick={handleReject}
              disabled={loading}
            >
              {loading ? (
                <span className={s.spinner} />
              ) : (
                <>
                  <XCircle size={14} /> Reject Withdrawal
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Detail modal — renders EVERYTHING the backend sends ──────────────────────
function DetailModal({ withdrawal: w, onClose, onApprove, onReject }) {
  const isPending = w.status === "PENDING";
  const meta = parseMeta(w);
  const failureReason = meta.error || null;

  return (
    <div className={s.backdrop} onClick={onClose}>
      <div
        className={`${s.modal} ${s.modalLg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={s.modalHeader}>
          <h3 className={s.modalTitle}>
            <ClipboardList size={16} /> Withdrawal Detail
          </h3>
          <button className={s.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        <div className={s.modalBody}>
          {/* Worker card */}
          <div className={s.workerCard}>
            <Avatar user={w.worker} />
            <div className={s.workerInfo}>
              <p className={s.workerName}>
                {w.worker?.firstName} {w.worker?.lastName}
              </p>
              <p className={s.workerEmail}>{w.worker?.email}</p>
              {(w.worker?.city || w.worker?.country) && (
                <p className={s.workerEmail}>
                  {[w.worker?.city, w.worker?.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
            </div>
            <StatusBadge status={w.status} />
          </div>

          {/* Amount hero */}
          <div className={s.amountHero}>
            <span className={s.amountHeroLabel}>Requested Amount</span>
            <span className={s.amountHeroVal}>{fmt(w.amount, w.currency)}</span>
            {meta.originalAmount != null &&
              meta.originalAmount !== w.amount && (
                <span className={s.amountHeroSub}>
                  Originally {fmt(meta.originalAmount, w.currency)}
                </span>
              )}
          </div>

          {/* Identifiers */}
          <p className={s.sectionTitle}>Identifiers</p>
          <div className={s.detailGrid}>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>Withdrawal ID</span>
              <CopyPill text={w.id} label={`${w.id.slice(0, 12)}…`} />
            </div>
            {w.workerId && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Worker ID</span>
                <CopyPill
                  text={w.workerId}
                  label={`${w.workerId.slice(0, 12)}…`}
                />
              </div>
            )}
            {w.reference && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Reference</span>
                <CopyPill text={w.reference} />
              </div>
            )}
          </div>

          {/* Amount breakdown */}
          <p className={s.sectionTitle}>Amount breakdown</p>
          <div className={s.detailGrid}>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>Requested amount</span>
              <span className={`${s.detailVal} ${s.amountHighlight}`}>
                {fmt(w.amount, w.currency)}
              </span>
            </div>
            {meta.originalAmount != null && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Original request</span>
                <span className={s.detailVal}>
                  {fmt(meta.originalAmount, w.currency)}
                </span>
              </div>
            )}
            {meta.debtDeducted > 0 && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Debt deducted</span>
                <span className={s.detailVal}>
                  −{fmt(meta.debtDeducted, w.currency)}
                </span>
              </div>
            )}
            {meta.debtBalanceBefore > 0 && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Debt before</span>
                <span className={s.detailVal}>
                  {fmt(meta.debtBalanceBefore, w.currency)}
                </span>
              </div>
            )}
            {meta.withdrawalFee != null && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Withdrawal fee</span>
                <span className={s.detailVal}>
                  {fmt(meta.withdrawalFee, w.currency)}
                </span>
              </div>
            )}
            {meta.netPayout != null && (
              <div className={s.detailCell}>
                <span className={s.detailLabel}>Net payout</span>
                <span className={`${s.detailVal} ${s.amountHighlight}`}>
                  {fmt(meta.netPayout, w.currency)}
                </span>
              </div>
            )}
          </div>

          {/* Method + destination */}
          <p className={s.sectionTitle}>
            <MethodIcon method={w.method} size={11} />
            <span style={{ marginLeft: 5 }}>{methodLabel(w.method)}</span>
          </p>
          <div className={s.detailGrid}>
            {w.method === "bank_transfer" && (
              <>
                {meta.bankName && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Bank name</span>
                    <span className={s.detailVal}>{meta.bankName}</span>
                  </div>
                )}
                {meta.bankCode && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Bank code</span>
                    <span className={`${s.detailVal} ${s.mono}`}>
                      {meta.bankCode}
                    </span>
                  </div>
                )}
                {meta.accountName && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Account name</span>
                    <span className={s.detailVal}>{meta.accountName}</span>
                  </div>
                )}
                {meta.accountNumber && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Account number</span>
                    <CopyPill text={meta.accountNumber} />
                  </div>
                )}
                {meta.country && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Country</span>
                    <span className={s.detailVal}>{meta.country}</span>
                  </div>
                )}
              </>
            )}

            {w.method === "mobile_money" && (
              <>
                {meta.mobileProvider && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Provider</span>
                    <span className={s.detailVal}>{meta.mobileProvider}</span>
                  </div>
                )}
                {meta.mobileName && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Account name</span>
                    <span className={s.detailVal}>{meta.mobileName}</span>
                  </div>
                )}
                {meta.mobileNumber && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Mobile number</span>
                    <CopyPill text={meta.mobileNumber} />
                  </div>
                )}
                {meta.country && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Country</span>
                    <span className={s.detailVal}>{meta.country}</span>
                  </div>
                )}
              </>
            )}

            {w.method === "crypto" && (
              <>
                {meta.cryptoCurrency && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Currency</span>
                    <span className={s.detailVal}>{meta.cryptoCurrency}</span>
                  </div>
                )}
                {meta.cryptoNetwork && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Network</span>
                    <span className={s.detailVal}>{meta.cryptoNetwork}</span>
                  </div>
                )}
                {meta.cryptoAddress && (
                  <div
                    className={s.detailCell}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={s.detailLabel}>Crypto address</span>
                    <CopyPill text={meta.cryptoAddress} />
                  </div>
                )}
              </>
            )}

            {w.destination &&
              !meta.accountNumber &&
              !meta.mobileNumber &&
              !meta.cryptoAddress && (
                <div className={s.detailCell}>
                  <span className={s.detailLabel}>Destination</span>
                  <CopyPill text={w.destination} />
                </div>
              )}
          </div>

          {/* Provider metadata */}
          {(meta.provider ||
            meta.transferId ||
            meta.transferCode ||
            meta.approvedAt ||
            meta.adminNotes ||
            meta.note) && (
            <>
              <p className={s.sectionTitle}>Payout processing</p>
              <div className={s.detailGrid}>
                {meta.provider && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Provider</span>
                    <span className={s.detailVal}>{meta.provider}</span>
                  </div>
                )}
                {meta.transferId && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Transfer ID</span>
                    <CopyPill text={String(meta.transferId)} />
                  </div>
                )}
                {meta.transferCode && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Transfer code</span>
                    <CopyPill text={String(meta.transferCode)} />
                  </div>
                )}
                {meta.approvedAt && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Approved at</span>
                    <span className={s.detailVal}>
                      {fmtDateTime(meta.approvedAt)}
                    </span>
                  </div>
                )}
                {meta.adminNotes && (
                  <div
                    className={s.detailCell}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={s.detailLabel}>Admin notes</span>
                    <span className={s.detailVal}>{meta.adminNotes}</span>
                  </div>
                )}
                {meta.note && (
                  <div
                    className={s.detailCell}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={s.detailLabel}>Note</span>
                    <span className={s.detailVal}>{meta.note}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Failure info */}
          {(failureReason || meta.failedAt) && (
            <>
              <p className={s.sectionTitle}>Failure</p>
              <div className={s.detailGrid}>
                {failureReason && (
                  <div
                    className={s.detailCell}
                    style={{ gridColumn: "1 / -1" }}
                  >
                    <span className={s.detailLabel}>Error</span>
                    <span className={s.detailVal}>{failureReason}</span>
                  </div>
                )}
                {meta.failedAt && (
                  <div className={s.detailCell}>
                    <span className={s.detailLabel}>Failed at</span>
                    <span className={s.detailVal}>
                      {fmtDateTime(meta.failedAt)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Timestamps */}
          <p className={s.sectionTitle}>Timestamps</p>
          <div className={s.detailGrid}>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>Requested</span>
              <span className={s.detailVal}>{fmtDateTime(w.createdAt)}</span>
            </div>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>Last updated</span>
              <span className={s.detailVal}>{fmtDateTime(w.updatedAt)}</span>
            </div>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>Processed</span>
              <span className={s.detailVal}>
                {w.processedAt ? fmtDateTime(w.processedAt) : "—"}
              </span>
            </div>
            <div className={s.detailCell}>
              <span className={s.detailLabel}>Completed</span>
              <span className={s.detailVal}>
                {w.completedAt ? fmtDateTime(w.completedAt) : "—"}
              </span>
            </div>
          </div>

          {/* Legacy notes field */}
          {w.notes && (
            <div className={s.notesBox}>
              <span className={s.notesIcon}>
                <FileText size={16} />
              </span>
              <p className={s.notesText}>{w.notes}</p>
            </div>
          )}

          {/* Actions */}
          {isPending && (
            <div className={s.modalActions}>
              <button
                className={s.btnReject}
                onClick={() => {
                  onClose();
                  onReject(w);
                }}
              >
                <XCircle size={14} /> Reject
              </button>
              <button
                className={s.btnApprove}
                onClick={() => {
                  onClose();
                  onApprove(w);
                }}
              >
                <CheckCircle2 size={14} /> Approve
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Table row ────────────────────────────────────────────────────────────────
function WithdrawalRow({ w, index, onDetail, onApprove, onReject }) {
  const isPending = w.status === "PENDING";

  return (
    <div className={s.tableRow} style={{ animationDelay: `${index * 0.025}s` }}>
      <div className={s.tdWorker}>
        <Avatar user={w.worker} />
        <div className={s.tdWorkerInfo}>
          <span className={s.tdName}>
            {w.worker?.firstName} {w.worker?.lastName}
          </span>
          <span className={s.tdEmail}>{w.worker?.email}</span>
        </div>
      </div>

      <div className={s.tdAmount}>
        <span className={s.tdAmountVal}>{fmt(w.amount, w.currency)}</span>
      </div>

      <div className={s.tdMethod}>
        <span className={s.methodIcon}>
          <MethodIcon method={w.method} size={16} />
        </span>
        <div className={s.methodInfo}>
          <span className={s.methodName}>{methodLabel(w.method)}</span>
          {w.destination && (
            <span className={s.methodDest}>{w.destination}</span>
          )}
        </div>
      </div>

      <div className={s.tdStatus}>
        <StatusBadge status={w.status} />
        <span className={s.tdRelative}>{fmtRelative(w.createdAt)}</span>
      </div>

      <div className={s.tdDate}>{fmtDate(w.createdAt)}</div>

      <div className={s.tdActions}>
        <button
          className={s.viewBtn}
          onClick={() => onDetail(w)}
          title="View details"
        >
          <Eye size={14} />
        </button>
        {isPending && (
          <>
            <button
              className={s.approveBtn}
              onClick={() => onApprove(w)}
              title="Approve"
            >
              <CheckCircle2 size={14} />
            </button>
            <button
              className={s.rejectBtn}
              onClick={() => onReject(w)}
              title="Reject"
            >
              <XCircle size={14} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [toast, setToast] = useState(null);

  const [approveTarget, setApproveTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);

  const searchTimer = useRef(null);

  const load = useCallback(
    async (pg = 1, tab = filter, q = search) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (tab !== "ALL") params.status = tab;
        if (q.trim()) params.search = q.trim();

        const res = await api.get("/admin/withdrawals", { params });
        const d = res.data.data;

        setWithdrawals(d.withdrawals);
        setTotal(d.total);
        setPages(d.pages);
        setPage(pg);

        if (tab === "ALL" && pg === 1) {
          setStats({
            pendingCount: d.pendingCount,
            pendingTotal: d.pendingTotal,
            total: d.total,
          });
        }
      } catch {
        showToast("error", "Failed to load withdrawals.");
      } finally {
        setLoading(false);
      }
    },
    [filter, search],
  );

  useEffect(() => {
    load(1, filter, search);
  }, [filter]);

  function handleSearchChange(e) {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => load(1, filter, val), 380);
  }

  function handleTabChange(key) {
    setFilter(key);
    setSearch("");
    setPage(1);
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  }

  function handleActionSuccess(msg) {
    setApproveTarget(null);
    setRejectTarget(null);
    showToast("success", msg);
    load(page, filter, search);
  }

  const processingCount = withdrawals.filter(
    (w) => w.status === "PROCESSING",
  ).length;
  const completedCount = withdrawals.filter(
    (w) => w.status === "COMPLETED",
  ).length;

  return (
    <AdminLayout>
      <div className={s.page}>
        {toast && (
          <div className={`${s.toast} ${s[`toast_${toast.type}`]}`}>
            <span>
              {toast.type === "success" ? (
                <CheckCircle2 size={13} />
              ) : (
                <XCircle size={13} />
              )}
              <span style={{ marginLeft: 6 }}>{toast.msg}</span>
            </span>
            <button className={s.toastClose} onClick={() => setToast(null)}>
              <X size={13} />
            </button>
          </div>
        )}

        <div className={s.pageHeader}>
          <div>
            <p className={s.eyebrow}>Finance</p>
            <h1 className={s.pageTitle}>
              Withdrawals
              {total > 0 && <span className={s.countPill}>{total}</span>}
              {stats?.pendingCount > 0 && (
                <span className={s.urgentPill}>
                  {stats.pendingCount} need action
                </span>
              )}
            </h1>
            <p className={s.pageSubtitle}>
              Review and process worker payout requests
            </p>
          </div>
        </div>

        <div className={s.statsGrid}>
          <StatCard
            icon={<Clock size={18} />}
            accent="yellow"
            label="Pending Payouts"
            value={stats?.pendingCount ?? "—"}
            sub={
              stats?.pendingTotal
                ? fmt(stats.pendingTotal, "USD") + " queued"
                : "Loading…"
            }
            delay={0}
          />
          <StatCard
            icon={<Zap size={18} />}
            accent="indigo"
            label="Processing"
            value={processingCount}
            sub="Currently being sent"
            delay={0.05}
          />
          <StatCard
            icon={<ClipboardList size={18} />}
            accent="orange"
            label="Total Requests"
            value={total}
            sub="All time"
            delay={0.1}
          />
          <StatCard
            icon={<CheckCircle2 size={18} />}
            accent="green"
            label="Completed"
            value={completedCount}
            sub="This page"
            delay={0.15}
          />
        </div>

        <div className={s.toolBar}>
          <div className={s.filterBar}>
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                className={`${s.filterTab} ${filter === tab.key ? s.filterTabActive : ""}`}
                onClick={() => handleTabChange(tab.key)}
              >
                {tab.label}
                {tab.key === "PENDING" && stats?.pendingCount > 0 && (
                  <span className={s.tabDot} />
                )}
              </button>
            ))}
          </div>

          <div className={s.searchBar}>
            <span className={s.searchIcon}>
              <Search size={14} />
            </span>
            <input
              className={s.searchInput}
              placeholder="Search worker name or email…"
              value={search}
              onChange={handleSearchChange}
            />
            {search && (
              <button
                className={s.searchClear}
                onClick={() => {
                  setSearch("");
                  load(1, filter, "");
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>
        </div>

        {filter === "ALL" && stats?.pendingCount > 0 && (
          <div className={s.pendingBanner}>
            <span className={s.pendingBannerDot} />
            <p className={s.pendingBannerText}>
              <strong>
                {stats.pendingCount} withdrawal
                {stats.pendingCount > 1 ? "s" : ""}
              </strong>{" "}
              awaiting approval — total{" "}
              <strong>{fmt(stats.pendingTotal, "USD")}</strong>
            </p>
            <button
              className={s.pendingBannerBtn}
              onClick={() => handleTabChange("PENDING")}
            >
              Review <ArrowRight size={11} />
            </button>
          </div>
        )}

        <div className={s.tableWrap}>
          <div className={s.tableHead}>
            <span>Worker</span>
            <span>Amount</span>
            <span>Method</span>
            <span>Status</span>
            <span>Requested</span>
            <span>Actions</span>
          </div>

          <div className={s.tableBody}>
            {loading ? (
              <SkeletonRows />
            ) : withdrawals.length === 0 ? (
              <div className={s.empty}>
                <span className={s.emptyIcon}>
                  <Wallet size={40} />
                </span>
                <p className={s.emptyTitle}>
                  {filter === "ALL"
                    ? "No withdrawals yet"
                    : `No ${filter.toLowerCase()} withdrawals`}
                </p>
                <p className={s.emptySub}>
                  {filter !== "ALL"
                    ? "Try a different status filter."
                    : "Worker payout requests will appear here."}
                </p>
                {filter !== "ALL" && (
                  <button
                    className={s.emptyReset}
                    onClick={() => handleTabChange("ALL")}
                  >
                    Show all
                  </button>
                )}
              </div>
            ) : (
              withdrawals.map((w, i) => (
                <WithdrawalRow
                  key={w.id}
                  w={w}
                  index={i}
                  onDetail={setDetailTarget}
                  onApprove={setApproveTarget}
                  onReject={setRejectTarget}
                />
              ))
            )}
          </div>
        </div>

        {pages > 1 && (
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

      {detailTarget && (
        <DetailModal
          withdrawal={detailTarget}
          onClose={() => setDetailTarget(null)}
          onApprove={(w) => {
            setDetailTarget(null);
            setApproveTarget(w);
          }}
          onReject={(w) => {
            setDetailTarget(null);
            setRejectTarget(w);
          }}
        />
      )}

      {approveTarget && (
        <ApproveModal
          withdrawal={approveTarget}
          onClose={() => setApproveTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}

      {rejectTarget && (
        <RejectModal
          withdrawal={rejectTarget}
          onClose={() => setRejectTarget(null)}
          onSuccess={handleActionSuccess}
        />
      )}
    </AdminLayout>
  );
}
