import { useState, useEffect, useCallback, Fragment } from "react";
import {
  Tag,
  CheckCircle2,
  BarChart2,
  Clock,
  Percent,
  Banknote,
  Pencil,
  Trash2,
  Pause,
  Play,
  RefreshCw,
  AlertTriangle,
  Plus,
  Copy,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminPromoCodes.module.css";
import api from "../../lib/api";

// ── Plan options (mirrors backend ALL_PLANS — add/remove as your plans change)
const PLAN_OPTIONS = [
  { id: "worker_basic", label: "Worker Basic" },
  { id: "worker_pro", label: "Worker Pro" },
  { id: "worker_premium", label: "Worker Premium" },
  { id: "hirer_basic", label: "Hirer Basic" },
  { id: "hirer_pro", label: "Hirer Pro" },
  { id: "hirer_premium", label: "Hirer Premium" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  const diff = Date.now() - new Date(d).getTime();
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}
function fmt(n) {
  return Number(n || 0).toLocaleString();
}
function fmtNGN(n) {
  return `₦${Number(n || 0).toLocaleString()}`;
}
function fmtCurrency(n, currency) {
  const cur = currency || "NGN";
  const sym = cur === "NGN" ? "₦" : cur === "USD" ? "$" : `${cur} `;
  return `${sym}${Number(n || 0).toLocaleString()}`;
}

function isExpired(code) {
  return code.expiresAt && new Date() > new Date(code.expiresAt);
}
function isExhausted(code) {
  return code.maxUses !== null && code.usedCount >= code.maxUses;
}
function codeStatus(code) {
  if (!code.isActive) return { label: "Inactive", cls: "dim" };
  if (isExpired(code)) return { label: "Expired", cls: "red" };
  if (isExhausted(code)) return { label: "Exhausted", cls: "yellow" };
  return { label: "Active", cls: "green" };
}

function rawDiscountValue(code) {
  if (code.discountLabel) return code.discountLabel;
  if (code.discountType === "PERCENT") return `${code.discountValue}%`;
  return fmtCurrency(code.discountValue, code.currency);
}

function remainingUses(code) {
  if (code.maxUses === null || code.maxUses === undefined) return null;
  return Math.max(0, code.maxUses - (code.usedCount || 0));
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Alert({ type, text, onClose }) {
  if (!text) return null;
  const Icon = type === "error" ? AlertTriangle : CheckCircle2;
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon size={14} /> {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        <X size={13} />
      </button>
    </div>
  );
}

function Spinner({ small }) {
  return (
    <span className={`${styles.spinner} ${small ? styles.spinnerSmall : ""}`} />
  );
}

function StatCard({ icon, label, value, sub, accent, green }) {
  const Icon = icon;
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""} ${green ? styles.statCardGreen : ""}`}
    >
      <span className={styles.statIcon}>
        {Icon ? <Icon size={18} /> : null}
      </span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
    </div>
  );
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
        title="Copy"
      >
        {ok ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}

// ── Skeleton Table ────────────────────────────────────────────────────────────
function SkeletonTable({ rows = 8 }) {
  return (
    <div className={styles.skeletonWrap}>
      <div className={styles.skeletonHead}>
        <span className={styles.skCell} />
        <span className={styles.skCell} />
        <span className={styles.skCell} />
        <span className={styles.skCell} />
        <span className={styles.skCell} />
        <span className={styles.skCell} />
        <span className={styles.skCell} />
        <span className={styles.skCell} />
      </div>
      <div className={styles.skeletonBody}>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={styles.skeletonRow}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarWide}`} />
              <span className={`${styles.skBar} ${styles.skBarNarrow}`} />
            </div>
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarPill}`} />
              <span className={`${styles.skBar} ${styles.skBarNarrow}`} />
            </div>
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarNarrow}`} />
              <span className={`${styles.skBar} ${styles.skBarTrack}`} />
            </div>
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarPill}`} />
            </div>
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarNarrow}`} />
            </div>
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarPill}`} />
            </div>
            <div className={styles.skGroup}>
              <span className={`${styles.skBar} ${styles.skBarNarrow}`} />
            </div>
            <div className={styles.skActions}>
              <span className={styles.skBtn} />
              <span className={styles.skBtn} />
              <span className={styles.skBtn} />
              <span className={styles.skBtn} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
function PromoModal({ mode, initial, onClose, onSuccess }) {
  const isEdit = mode === "edit";
  const empty = {
    code: "",
    description: "",
    discountType: "PERCENT",
    discountValue: "",
    maxUses: "",
    expiresAt: "",
    applicableTo: [],
    minPlanAmount: "0",
  };
  const [form, setForm] = useState(
    isEdit && initial
      ? {
          code: initial.code,
          description: initial.description || "",
          discountType: initial.discountType,
          discountValue: String(initial.discountValue),
          maxUses: initial.maxUses != null ? String(initial.maxUses) : "",
          expiresAt: initial.expiresAt
            ? new Date(initial.expiresAt).toISOString().slice(0, 16)
            : "",
          applicableTo: initial.applicableTo || [],
          minPlanAmount: String(initial.minPlanAmount || 0),
        }
      : empty,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const currency = initial?.currency || "NGN";
  const currencySymbol =
    currency === "NGN" ? "₦" : currency === "USD" ? "$" : currency;

  function set(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
    setError("");
  }

  function togglePlan(id) {
    setForm((f) => ({
      ...f,
      applicableTo: f.applicableTo.includes(id)
        ? f.applicableTo.filter((p) => p !== id)
        : [...f.applicableTo, id],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!isEdit && !form.code.trim()) {
      setError("Code is required.");
      return;
    }
    if (!form.discountValue) {
      setError("Discount value is required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const body = {
        description: form.description || undefined,
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
        applicableTo:
          form.applicableTo.length > 0 ? form.applicableTo : undefined,
        minPlanAmount: parseFloat(form.minPlanAmount) || 0,
        isActive: true,
      };
      if (!isEdit) {
        body.code = form.code.toUpperCase().trim();
        body.discountType = form.discountType;
        body.discountValue = parseFloat(form.discountValue);
      }
      if (isEdit) {
        await api.patch(`/subscriptions/admin/promo-codes/${initial.id}`, body);
        onSuccess(`Promo code ${initial.code} updated.`);
      } else {
        await api.post("/subscriptions/admin/promo-codes", body);
        onSuccess(`Promo code ${body.code} created.`);
      }
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${isEdit ? "update" : "create"} code.`,
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            {isEdit ? (
              <>
                <Pencil size={15} /> Edit {initial?.code}
              </>
            ) : (
              <>
                <Plus size={15} /> Create Promo Code
              </>
            )}
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {error && (
          <p className={styles.modalError}>
            <AlertTriangle size={13} /> {error}
          </p>
        )}

        <form onSubmit={submit} className={styles.modalForm}>
          {!isEdit && (
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <label className={styles.label}>
                  Code <span className={styles.req}>*</span>
                </label>
                <input
                  className={styles.input}
                  placeholder="e.g. LAUNCH50"
                  value={form.code}
                  onChange={(e) => set("code", e.target.value.toUpperCase())}
                  maxLength={32}
                  autoCapitalize="characters"
                />
              </div>
              <div className={styles.formField}>
                <label className={styles.label}>
                  Type <span className={styles.req}>*</span>
                </label>
                <select
                  className={styles.select}
                  value={form.discountType}
                  onChange={(e) => set("discountType", e.target.value)}
                >
                  <option value="PERCENT">Percentage (%)</option>
                  <option value="FIXED">Fixed amount ({currencySymbol})</option>
                </select>
              </div>
            </div>
          )}

          {!isEdit && (
            <div className={styles.formField}>
              <label className={styles.label}>
                Discount value <span className={styles.req}>*</span>
                <span className={styles.labelHint}>
                  {form.discountType === "PERCENT"
                    ? " (1–100)"
                    : ` (${currencySymbol} amount)`}
                </span>
              </label>
              <div className={styles.inputWithSuffix}>
                <input
                  className={styles.input}
                  type="number"
                  step={form.discountType === "PERCENT" ? "1" : "100"}
                  min="1"
                  max={form.discountType === "PERCENT" ? "100" : undefined}
                  placeholder={
                    form.discountType === "PERCENT"
                      ? "e.g. 20"
                      : `e.g. 5000 (${currencySymbol})`
                  }
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                />
                <span className={styles.inputSuffix}>
                  {form.discountType === "PERCENT" ? "%" : currencySymbol}
                </span>
              </div>
            </div>
          )}

          {isEdit && (
            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Code ID</span>
                <CopyPill text={initial?.id} label={initial?.id} />
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Discount type</span>
                <span className={styles.detailVal}>
                  {initial?.discountType}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Discount value</span>
                <span className={styles.detailVal}>
                  {rawDiscountValue(initial || {})}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Currency</span>
                <span className={styles.detailVal}>{currency}</span>
              </div>
              {initial?.createdBy && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Created by</span>
                  <span className={styles.detailVal}>{initial.createdBy}</span>
                </div>
              )}
              {initial?.createdAt && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Created</span>
                  <span className={styles.detailVal}>
                    {fmtDateTime(initial.createdAt)}
                  </span>
                </div>
              )}
              {initial?.updatedAt && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Last updated</span>
                  <span className={styles.detailVal}>
                    {fmtDateTime(initial.updatedAt)}
                  </span>
                </div>
              )}
              {initial?.totalDiscountGiven != null && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>
                    Total discount given
                  </span>
                  <span className={styles.detailVal}>
                    {fmtCurrency(initial.totalDiscountGiven, currency)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className={styles.formField}>
            <label className={styles.label}>Description (internal note)</label>
            <textarea
              className={styles.textarea}
              rows={2}
              placeholder="e.g. Launch week discount — Q1 2025"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.label}>
                Max uses
                <span className={styles.labelHint}>
                  {" "}
                  (leave blank = unlimited)
                </span>
              </label>
              <input
                className={styles.input}
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 100"
                value={form.maxUses}
                onChange={(e) => set("maxUses", e.target.value)}
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.label}>
                Expiry date
                <span className={styles.labelHint}>
                  {" "}
                  (leave blank = no expiry)
                </span>
              </label>
              <input
                className={styles.input}
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => set("expiresAt", e.target.value)}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              Minimum plan price ({currencySymbol})
              <span className={styles.labelHint}> (0 = no minimum)</span>
            </label>
            <input
              className={styles.input}
              type="number"
              min="0"
              step="100"
              placeholder="e.g. 5000"
              value={form.minPlanAmount}
              onChange={(e) => set("minPlanAmount", e.target.value)}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.label}>
              Applicable to
              <span className={styles.labelHint}>
                {" "}
                (none selected = all plans)
              </span>
            </label>
            <div className={styles.planChips}>
              {PLAN_OPTIONS.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  className={`${styles.planChip} ${form.applicableTo.includes(p.id) ? styles.planChipActive : ""}`}
                  onClick={() => togglePlan(p.id)}
                >
                  {form.applicableTo.includes(p.id) && (
                    <span className={styles.chipCheck}>
                      <Check size={11} />
                    </span>
                  )}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button
              type="button"
              className={styles.btnCancel}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={loading}
            >
              {loading ? (
                <Spinner small />
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Code"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Usage Detail Modal ────────────────────────────────────────────────────────
function UsageModal({ promoId, code, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedUsage, setExpandedUsage] = useState(null);

  useEffect(() => {
    api
      .get(`/subscriptions/admin/promo-codes/${promoId}`)
      .then((r) => setData(r.data.data.promoCode))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [promoId]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalWide}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>
            <BarChart2 size={15} /> Usage — <code>{code}</code>
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            <X size={14} />
          </button>
        </div>

        {loading ? (
          <div className={styles.modalLoading}>
            <Spinner /> Loading usage…
          </div>
        ) : !data ? (
          <p className={styles.modalError}>Failed to load usage data.</p>
        ) : (
          <>
            <div className={styles.usageSummary}>
              <div className={styles.usageStat}>
                <p className={styles.usageStatVal}>{fmt(data.usedCount)}</p>
                <p className={styles.usageStatLabel}>Total uses</p>
              </div>
              <div className={styles.usageStat}>
                <p className={styles.usageStatVal}>
                  {fmtCurrency(data.totalDiscountGiven, data.currency || "NGN")}
                </p>
                <p className={styles.usageStatLabel}>Total discount given</p>
              </div>
              <div className={styles.usageStat}>
                <p className={styles.usageStatVal}>{data.discountLabel}</p>
                <p className={styles.usageStatLabel}>Discount</p>
              </div>
              <div className={styles.usageStat}>
                <p className={styles.usageStatVal}>
                  {data.remainingUses !== null ? fmt(data.remainingUses) : "∞"}
                </p>
                <p className={styles.usageStatLabel}>Remaining</p>
              </div>
            </div>

            <div className={styles.detailGrid}>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Code ID</span>
                <CopyPill text={data.id} label={data.id} />
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Discount type</span>
                <span className={styles.detailVal}>{data.discountType}</span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Discount value</span>
                <span className={styles.detailVal}>
                  {rawDiscountValue(data)}
                </span>
              </div>
              <div className={styles.detailCell}>
                <span className={styles.detailLabel}>Currency</span>
                <span className={styles.detailVal}>
                  {data.currency || "NGN"}
                </span>
              </div>
              {data.minPlanAmount > 0 && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Min plan amount</span>
                  <span className={styles.detailVal}>
                    {fmtCurrency(data.minPlanAmount, data.currency || "NGN")}
                  </span>
                </div>
              )}
              {data.maxUses != null && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Max uses</span>
                  <span className={styles.detailVal}>{fmt(data.maxUses)}</span>
                </div>
              )}
              {data.expiresAt && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Expires</span>
                  <span className={styles.detailVal}>
                    {fmtDateTime(data.expiresAt)}
                  </span>
                </div>
              )}
              {data.createdAt && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Created</span>
                  <span className={styles.detailVal}>
                    {fmtDateTime(data.createdAt)}
                  </span>
                </div>
              )}
              {data.updatedAt && (
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Last updated</span>
                  <span className={styles.detailVal}>
                    {fmtDateTime(data.updatedAt)}
                  </span>
                </div>
              )}
            </div>

            {data.usages?.length === 0 ? (
              <p className={styles.empty2}>No one has used this code yet.</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Plan</th>
                      <th>Original</th>
                      <th>Discount</th>
                      <th>Final</th>
                      <th>Used</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.usages.map((u, i) => (
                      <Fragment key={i}>
                        <tr
                          className={styles.tableRow}
                          onClick={() =>
                            setExpandedUsage(expandedUsage === i ? null : i)
                          }
                          style={{ cursor: "pointer" }}
                        >
                          <td className={styles.td}>
                            <div>
                              <p className={styles.userName}>{u.userName}</p>
                              <p className={styles.userEmail}>{u.userEmail}</p>
                            </div>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.rolePill}>
                              {u.userRole}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <code className={styles.planCode}>{u.planId}</code>
                          </td>
                          <td className={styles.td}>
                            {fmtCurrency(u.originalAmt, data.currency || "NGN")}
                          </td>
                          <td className={styles.td}>
                            <span className={styles.discountAmt}>
                              −
                              {fmtCurrency(
                                u.discountAmt,
                                data.currency || "NGN",
                              )}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.finalAmt}>
                              {fmtCurrency(u.finalAmt, data.currency || "NGN")}
                            </span>
                          </td>
                          <td className={styles.td}>
                            <span className={styles.dimText}>
                              {timeAgo(u.usedAt)}
                            </span>
                          </td>
                        </tr>
                        {expandedUsage === i && (
                          <tr className={styles.usageDetailRow}>
                            <td colSpan={7} className={styles.td}>
                              <div className={styles.detailGrid}>
                                {u.id && (
                                  <div className={styles.detailCell}>
                                    <span className={styles.detailLabel}>
                                      Usage ID
                                    </span>
                                    <CopyPill text={u.id} label={u.id} />
                                  </div>
                                )}
                                {u.userId && (
                                  <div className={styles.detailCell}>
                                    <span className={styles.detailLabel}>
                                      User ID
                                    </span>
                                    <CopyPill
                                      text={u.userId}
                                      label={u.userId}
                                    />
                                  </div>
                                )}
                                {u.subscriptionId && (
                                  <div className={styles.detailCell}>
                                    <span className={styles.detailLabel}>
                                      Subscription ID
                                    </span>
                                    <CopyPill
                                      text={u.subscriptionId}
                                      label={u.subscriptionId}
                                    />
                                  </div>
                                )}
                                {u.usedAt && (
                                  <div className={styles.detailCell}>
                                    <span className={styles.detailLabel}>
                                      Used at
                                    </span>
                                    <span className={styles.detailVal}>
                                      {fmtDateTime(u.usedAt)}
                                    </span>
                                  </div>
                                )}
                                {u.reference && (
                                  <div className={styles.detailCell}>
                                    <span className={styles.detailLabel}>
                                      Reference
                                    </span>
                                    <CopyPill text={u.reference} />
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────
function DeleteConfirm({ promo, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    try {
      await api.delete(`/subscriptions/admin/promo-codes/${promo.id}`);
      onSuccess(
        promo.usedCount > 0
          ? `${promo.code} has been deactivated (used codes are preserved for audit).`
          : `${promo.code} deleted.`,
      );
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Delete failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalSm}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.confirmIcon}>
          <Trash2 size={28} />
        </div>
        <h3 className={styles.confirmTitle}>
          {promo.usedCount > 0 ? "Deactivate" : "Delete"}{" "}
          <code>{promo.code}</code>?
        </h3>
        <p className={styles.confirmSub}>
          {promo.usedCount > 0
            ? `This code has been used ${promo.usedCount} time(s). It will be deactivated to preserve the audit trail.`
            : "This code has not been used. It will be permanently deleted."}
        </p>
        {error && <p className={styles.modalError}>{error}</p>}
        <div className={styles.confirmActions}>
          <button
            className={styles.btnCancel}
            onClick={onClose}
            disabled={loading}
          >
            Keep it
          </button>
          <button
            className={styles.btnDanger}
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? (
              <Spinner small />
            ) : promo.usedCount > 0 ? (
              "Deactivate"
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminPromoCodes() {
  const [codes, setCodes] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [usageTarget, setUsageTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const LIMIT = 20;

  const load = useCallback(
    async (pg = 1) => {
      setLoading(true);
      try {
        const params = { page: pg, limit: LIMIT };
        if (search) params.search = search;
        if (filter) params.isActive = filter;
        const res = await api.get("/subscriptions/admin/promo-codes", {
          params,
        });
        const d = res.data.data;
        setCodes(d.promoCodes || []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setStats(d.stats || null);
        setPage(pg);
      } catch {
        setError("Failed to load promo codes.");
      } finally {
        setLoading(false);
      }
    },
    [search, filter],
  );

  useEffect(() => {
    load(1);
  }, [search, filter]);

  const handleToggle = async (code) => {
    try {
      const res = await api.patch(
        `/subscriptions/admin/promo-codes/${code.id}/toggle`,
      );
      setSuccess(res.data.message || "Updated.");
      load(page);
    } catch (err) {
      setError(err.response?.data?.message || "Toggle failed.");
    }
  };

  const activeCodes =
    stats?.activeCodes ??
    codes.filter((c) => c.isActive && !isExpired(c) && !isExhausted(c)).length;
  const expiredCodes =
    stats?.expiredCodes ?? codes.filter((c) => isExpired(c)).length;
  const percentCodes = codes.filter((c) => c.discountType === "PERCENT").length;
  const fixedCodes = codes.filter((c) => c.discountType === "FIXED").length;
  const totalDiscountGiven =
    stats?.totalDiscountGiven ?? stats?.totalDiscount ?? null;

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Admin Panel</p>
            <h1 className={styles.pageTitle}>Promo Codes</h1>
            <p className={styles.pageSubtitle}>
              Create and manage subscription discount codes.
            </p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowCreate(true)}
          >
            <Plus size={14} /> Create Code
          </button>
        </div>

        <Alert type="success" text={success} onClose={() => setSuccess("")} />
        <Alert type="error" text={error} onClose={() => setError("")} />

        {stats && (
          <div className={styles.statsGrid}>
            <StatCard icon={Tag} label="Total Codes" value={fmt(total)} />
            <StatCard
              icon={CheckCircle2}
              label="Active"
              value={fmt(activeCodes)}
              green
            />
            <StatCard
              icon={BarChart2}
              label="Total Uses"
              value={fmt(stats.totalUses)}
            />
            <StatCard icon={Clock} label="Expired" value={fmt(expiredCodes)} />
            <StatCard
              icon={Percent}
              label="% Discounts"
              value={fmt(percentCodes)}
            />
            <StatCard
              icon={Banknote}
              label="Fixed Discounts"
              value={fmt(fixedCodes)}
              accent
            />
            {totalDiscountGiven != null && (
              <StatCard
                icon={Banknote}
                label="Total Discount Given"
                value={fmtNGN(totalDiscountGiven)}
                accent
              />
            )}
          </div>
        )}

        <div className={styles.filterRow}>
          <input
            className={styles.searchInput}
            placeholder="Search by code name…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value.toUpperCase());
              setPage(1);
            }}
          />
          <select
            className={styles.select}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
          <button className={styles.btnOutline} onClick={() => load(1)}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>

        <p className={styles.resultsCount}>
          {total} code{total !== 1 ? "s" : ""} found
        </p>

        {loading ? (
          <SkeletonTable rows={LIMIT} />
        ) : codes.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Tag size={40} />
            </span>
            <p className={styles.emptyTitle}>No promo codes found</p>
            <p className={styles.emptySub}>
              {search
                ? "Try a different search."
                : "Create your first promo code to get started."}
            </p>
          </div>
        ) : (
          <>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Discount</th>
                    <th>Uses</th>
                    <th>Plans</th>
                    <th>Expiry</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => {
                    const st = codeStatus(code);
                    const progress = code.maxUses
                      ? Math.round((code.usedCount / code.maxUses) * 100)
                      : null;
                    const remaining = remainingUses(code);
                    const isUpdated =
                      code.updatedAt &&
                      code.createdAt &&
                      new Date(code.updatedAt).getTime() !==
                        new Date(code.createdAt).getTime();

                    return (
                      <tr key={code.id} className={styles.tableRow}>
                        <td className={styles.td}>
                          <div>
                            <code className={styles.codeLabel}>
                              {code.code}
                            </code>
                            {code.description && (
                              <p className={styles.codeDesc}>
                                {code.description}
                              </p>
                            )}
                            {code.id && (
                              <p
                                className={styles.codeDesc}
                                style={{ opacity: 0.55 }}
                              >
                                ID: {code.id.slice(0, 12)}…
                              </p>
                            )}
                          </div>
                        </td>

                        <td className={styles.td}>
                          <span
                            className={`${styles.discountBadge}
                          ${
                            code.discountType === "PERCENT"
                              ? styles.discountPercent
                              : styles.discountFixed
                          }`}
                          >
                            {code.discountLabel || rawDiscountValue(code)}
                          </span>
                          {code.discountValue != null && (
                            <p className={styles.minLabel}>
                              value {code.discountValue}
                              {code.discountType === "PERCENT" ? "%" : ""}
                            </p>
                          )}
                          {code.minPlanAmount > 0 && (
                            <p className={styles.minLabel}>
                              min {fmtNGN(code.minPlanAmount)}
                            </p>
                          )}
                        </td>

                        <td className={styles.td}>
                          <p className={styles.usesCount}>
                            {fmt(code.usedCount)}
                            {code.maxUses !== null && (
                              <span className={styles.usesMax}>
                                {" "}
                                / {fmt(code.maxUses)}
                              </span>
                            )}
                          </p>
                          {progress !== null && (
                            <div className={styles.progressTrack}>
                              <div
                                className={styles.progressFill}
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor:
                                    progress >= 90
                                      ? "#ef4444"
                                      : progress >= 60
                                        ? "#f59e0b"
                                        : "#22c55e",
                                }}
                              />
                            </div>
                          )}
                          {remaining != null && (
                            <p className={styles.unlimited}>
                              {fmt(remaining)} remaining
                            </p>
                          )}
                          {code.maxUses === null && (
                            <p className={styles.unlimited}>Unlimited</p>
                          )}
                        </td>

                        <td className={styles.td}>
                          {code.applicableTo?.length > 0 ? (
                            <div className={styles.planTags}>
                              {code.applicableTo.slice(0, 2).map((id) => (
                                <span key={id} className={styles.planTag}>
                                  {PLAN_OPTIONS.find((p) => p.id === id)
                                    ?.label || id}
                                </span>
                              ))}
                              {code.applicableTo.length > 2 && (
                                <span className={styles.planTagMore}>
                                  +{code.applicableTo.length - 2}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className={styles.allPlans}>All plans</span>
                          )}
                        </td>

                        <td className={styles.td}>
                          {code.expiresAt ? (
                            <>
                              <span
                                className={
                                  isExpired(code)
                                    ? styles.expiredDate
                                    : styles.expiryDate
                                }
                              >
                                {fmtDate(code.expiresAt)}
                              </span>
                              {isExpired(code) && (
                                <p className={styles.minLabel}>Expired</p>
                              )}
                            </>
                          ) : (
                            <span className={styles.noExpiry}>No expiry</span>
                          )}
                        </td>

                        <td className={styles.td}>
                          <span
                            className={`${styles.statusBadge} ${styles[`status_${st.cls}`]}`}
                          >
                            {st.label}
                          </span>
                        </td>

                        <td className={styles.td}>
                          <span className={styles.dimText}>
                            {timeAgo(code.createdAt)}
                          </span>
                          {code.createdBy && (
                            <p className={styles.createdBy}>
                              by {code.createdBy}
                            </p>
                          )}
                          {isUpdated && (
                            <p className={styles.createdBy}>
                              upd {timeAgo(code.updatedAt)}
                            </p>
                          )}
                        </td>

                        <td className={styles.td}>
                          <div className={styles.actionGroup}>
                            <button
                              className={`${styles.actionBtn} ${code.isActive ? styles.actionBtnYellow : styles.actionBtnGreen}`}
                              title={code.isActive ? "Deactivate" : "Activate"}
                              onClick={() => handleToggle(code)}
                            >
                              {code.isActive ? (
                                <Pause size={14} />
                              ) : (
                                <Play size={14} />
                              )}
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnBlue}`}
                              title="View usage"
                              onClick={() => setUsageTarget(code)}
                            >
                              <BarChart2 size={14} />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnGray}`}
                              title="Edit"
                              onClick={() => setEditTarget(code)}
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              className={`${styles.actionBtn} ${styles.actionBtnRed}`}
                              title="Delete / Deactivate"
                              onClick={() => setDeleteTarget(code)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className={styles.pagination}>
                <button
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => load(page - 1)}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <span className={styles.pageInfo}>
                  Page {page} of {pages}
                </span>
                <button
                  className={styles.pageBtn}
                  disabled={page >= pages}
                  onClick={() => load(page + 1)}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            )}
          </>
        )}

        {showCreate && (
          <PromoModal
            mode="create"
            onClose={() => setShowCreate(false)}
            onSuccess={(msg) => {
              setSuccess(msg);
              load(1);
            }}
          />
        )}

        {editTarget && (
          <PromoModal
            mode="edit"
            initial={editTarget}
            onClose={() => setEditTarget(null)}
            onSuccess={(msg) => {
              setSuccess(msg);
              load(page);
            }}
          />
        )}

        {usageTarget && (
          <UsageModal
            promoId={usageTarget.id}
            code={usageTarget.code}
            onClose={() => setUsageTarget(null)}
          />
        )}

        {deleteTarget && (
          <DeleteConfirm
            promo={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onSuccess={(msg) => {
              setSuccess(msg);
              load(page);
            }}
          />
        )}
      </div>
    </AdminLayout>
  );
}
