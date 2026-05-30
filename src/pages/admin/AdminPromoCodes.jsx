import { useState, useEffect, useCallback } from "react";
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
  return new Date(d).toLocaleDateString("en-GB", {
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

// ── Sub-components ────────────────────────────────────────────────────────────
function Alert({ type, text, onClose }) {
  if (!text) return null;
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button className={styles.alertClose} onClick={onClose}>
        ×
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
  return (
    <div
      className={`${styles.statCard} ${accent ? styles.statCardAccent : ""} ${green ? styles.statCardGreen : ""}`}
    >
      <span className={styles.statIcon}>{icon}</span>
      <p className={styles.statValue}>{value}</p>
      <p className={styles.statLabel}>{label}</p>
      {sub && <p className={styles.statSub}>{sub}</p>}
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
            {isEdit ? `✏️ Edit ${initial?.code}` : "✨ Create Promo Code"}
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        {error && <p className={styles.modalError}>⚠️ {error}</p>}

        <form onSubmit={submit} className={styles.modalForm}>
          {/* Code + type row — only on create */}
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
                  <option value="FIXED">Fixed amount (₦)</option>
                </select>
              </div>
            </div>
          )}

          {/* Discount value — only on create */}
          {!isEdit && (
            <div className={styles.formField}>
              <label className={styles.label}>
                Discount value <span className={styles.req}>*</span>
                <span className={styles.labelHint}>
                  {form.discountType === "PERCENT" ? " (1–100)" : " (₦ amount)"}
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
                    form.discountType === "PERCENT" ? "e.g. 20" : "e.g. 5000"
                  }
                  value={form.discountValue}
                  onChange={(e) => set("discountValue", e.target.value)}
                />
                <span className={styles.inputSuffix}>
                  {form.discountType === "PERCENT" ? "%" : "₦"}
                </span>
              </div>
            </div>
          )}

          {/* Description */}
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

          {/* Max uses + expiry */}
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

          {/* Min plan amount */}
          <div className={styles.formField}>
            <label className={styles.label}>
              Minimum plan price (₦)
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

          {/* Applicable plans */}
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
                    <span className={styles.chipCheck}>✓</span>
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
            📊 Usage — <code>{code}</code>
          </h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
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
            {/* Summary */}
            <div className={styles.usageSummary}>
              <div className={styles.usageStat}>
                <p className={styles.usageStatVal}>{fmt(data.usedCount)}</p>
                <p className={styles.usageStatLabel}>Total uses</p>
              </div>
              <div className={styles.usageStat}>
                <p className={styles.usageStatVal}>
                  {fmtNGN(data.totalDiscountGiven)}
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

            {/* Usage list */}
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
                      <tr key={i} className={styles.tableRow}>
                        <td className={styles.td}>
                          <div>
                            <p className={styles.userName}>{u.userName}</p>
                            <p className={styles.userEmail}>{u.userEmail}</p>
                          </div>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.rolePill}>{u.userRole}</span>
                        </td>
                        <td className={styles.td}>
                          <code className={styles.planCode}>{u.planId}</code>
                        </td>
                        <td className={styles.td}>{fmtNGN(u.originalAmt)}</td>
                        <td className={styles.td}>
                          <span className={styles.discountAmt}>
                            −{fmtNGN(u.discountAmt)}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.finalAmt}>
                            {fmtNGN(u.finalAmt)}
                          </span>
                        </td>
                        <td className={styles.td}>
                          <span className={styles.dimText}>
                            {timeAgo(u.usedAt)}
                          </span>
                        </td>
                      </tr>
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
        <div className={styles.confirmIcon}>🗑️</div>
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
  const [filter, setFilter] = useState(""); // "" | "true" | "false"
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [usageTarget, setUsageTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const LIMIT = 20;

  // ── Load ──────────────────────────────────────────────────────────────────
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

  // ── Toggle active ─────────────────────────────────────────────────────────
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

  // ── Summary stats ─────────────────────────────────────────────────────────
  const activeCodes = codes.filter(
    (c) => c.isActive && !isExpired(c) && !isExhausted(c),
  ).length;
  const expiredCodes = codes.filter((c) => isExpired(c)).length;
  const percentCodes = codes.filter((c) => c.discountType === "PERCENT").length;
  const fixedCodes = codes.filter((c) => c.discountType === "FIXED").length;

  return (
    <div className={styles.page}>
      {/* ── Header ── */}
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
          + Create Code
        </button>
      </div>

      <Alert type="success" text={success} onClose={() => setSuccess("")} />
      <Alert type="error" text={error} onClose={() => setError("")} />

      {/* ── KPI strip ── */}
      {stats && (
        <div className={styles.statsGrid}>
          <StatCard icon="🏷️" label="Total Codes" value={fmt(total)} />
          <StatCard icon="✅" label="Active" value={fmt(activeCodes)} green />
          <StatCard icon="📊" label="Total Uses" value={fmt(stats.totalUses)} />
          <StatCard icon="⏰" label="Expired" value={fmt(expiredCodes)} />
          <StatCard icon="%" label="% Discounts" value={fmt(percentCodes)} />
          <StatCard
            icon="₦"
            label="Fixed Discounts"
            value={fmt(fixedCodes)}
            accent
          />
        </div>
      )}

      {/* ── Filters ── */}
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
          🔄 Refresh
        </button>
      </div>

      <p className={styles.resultsCount}>
        {total} code{total !== 1 ? "s" : ""} found
      </p>

      {/* ── Table ── */}
      {loading ? (
        <div className={styles.loadingRow}>
          <Spinner /> Loading…
        </div>
      ) : codes.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>🏷️</span>
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

                  return (
                    <tr key={code.id} className={styles.tableRow}>
                      {/* Code + description */}
                      <td className={styles.td}>
                        <div>
                          <code className={styles.codeLabel}>{code.code}</code>
                          {code.description && (
                            <p className={styles.codeDesc}>
                              {code.description}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Discount */}
                      <td className={styles.td}>
                        <span
                          className={`${styles.discountBadge}
                          ${
                            code.discountType === "PERCENT"
                              ? styles.discountPercent
                              : styles.discountFixed
                          }`}
                        >
                          {code.discountLabel}
                        </span>
                        {code.minPlanAmount > 0 && (
                          <p className={styles.minLabel}>
                            min {fmtNGN(code.minPlanAmount)}
                          </p>
                        )}
                      </td>

                      {/* Uses + progress bar */}
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
                        {code.maxUses === null && (
                          <p className={styles.unlimited}>Unlimited</p>
                        )}
                      </td>

                      {/* Applicable plans */}
                      <td className={styles.td}>
                        {code.applicableTo?.length > 0 ? (
                          <div className={styles.planTags}>
                            {code.applicableTo.slice(0, 2).map((id) => (
                              <span key={id} className={styles.planTag}>
                                {PLAN_OPTIONS.find((p) => p.id === id)?.label ||
                                  id}
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

                      {/* Expiry */}
                      <td className={styles.td}>
                        {code.expiresAt ? (
                          <span
                            className={
                              isExpired(code)
                                ? styles.expiredDate
                                : styles.expiryDate
                            }
                          >
                            {fmtDate(code.expiresAt)}
                          </span>
                        ) : (
                          <span className={styles.noExpiry}>No expiry</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className={styles.td}>
                        <span
                          className={`${styles.statusBadge} ${styles[`status_${st.cls}`]}`}
                        >
                          {st.label}
                        </span>
                      </td>

                      {/* Created */}
                      <td className={styles.td}>
                        <span className={styles.dimText}>
                          {timeAgo(code.createdAt)}
                        </span>
                        {code.createdBy && (
                          <p className={styles.createdBy}>
                            by {code.createdBy}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className={styles.td}>
                        <div className={styles.actionGroup}>
                          {/* Toggle active */}
                          <button
                            className={`${styles.actionBtn} ${code.isActive ? styles.actionBtnYellow : styles.actionBtnGreen}`}
                            title={code.isActive ? "Deactivate" : "Activate"}
                            onClick={() => handleToggle(code)}
                          >
                            {code.isActive ? "⏸" : "▶"}
                          </button>
                          {/* Usage detail */}
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnBlue}`}
                            title="View usage"
                            onClick={() => setUsageTarget(code)}
                          >
                            📊
                          </button>
                          {/* Edit */}
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnGray}`}
                            title="Edit"
                            onClick={() => setEditTarget(code)}
                          >
                            ✏️
                          </button>
                          {/* Delete */}
                          <button
                            className={`${styles.actionBtn} ${styles.actionBtnRed}`}
                            title="Delete / Deactivate"
                            onClick={() => setDeleteTarget(code)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                ← Prev
              </button>
              <span className={styles.pageInfo}>
                Page {page} of {pages}
              </span>
              <button
                className={styles.pageBtn}
                disabled={page >= pages}
                onClick={() => load(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Modals ── */}
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
  );
}
