// src/pages/hirer/retained-staff/CreateCycleModal.jsx
import { useState, useEffect } from "react";
import styles from "./CreateCycleModal.module.css";
import {
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiDollarSign,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

const CYCLE_TYPES = [
  {
    value: "MANUAL",
    label: "Off-cycle payment",
    desc: "One-time payment outside the regular schedule",
  },
  {
    value: "BONUS",
    label: "Bonus",
    desc: "Performance bonus or reward",
  },
  {
    value: "REIMBURSEMENT",
    label: "Reimbursement",
    desc: "Expense reimbursement",
  },
  {
    value: "FINAL_SETTLEMENT",
    label: "Final settlement",
    desc: "Closing payment when employment ends",
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreateCycleModal({
  isOpen,
  onClose,
  onSuccess,
  member,
}) {
  const [type, setType] = useState("BONUS");
  const [form, setForm] = useState({
    periodStart: today(),
    periodEnd: today(),
    payDate: today(),
    baseAmount: "",
    bonusAmount: "",
    deductionAmount: "0",
    label: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Reset on open — prefill base amount for regular salaries
  useEffect(() => {
    if (!isOpen || !member) return;
    setType("BONUS");
    setForm({
      periodStart: today(),
      periodEnd: today(),
      payDate: today(),
      baseAmount: "",
      bonusAmount: "",
      deductionAmount: "0",
      label: "",
      notes: "",
    });
    setError("");
  }, [isOpen, member]);

  // Live preview
  const grossAmount =
    (parseFloat(form.baseAmount) || 0) + (parseFloat(form.bonusAmount) || 0);
  const netAmount = Math.max(
    0,
    grossAmount - (parseFloat(form.deductionAmount) || 0),
  );
  const platformFee = Math.round(((netAmount * 5) / 100) * 100) / 100;
  const workerPayout = Math.max(
    0,
    Math.round((netAmount - platformFee) * 100) / 100,
  );
  const currency = member?.currency || "NGN";

  const handleSubmit = async () => {
    setError("");

    const gross =
      (parseFloat(form.baseAmount) || 0) + (parseFloat(form.bonusAmount) || 0);
    if (gross <= 0) {
      setError("Total amount must be greater than 0.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        type,
        periodStart: form.periodStart,
        periodEnd: form.periodEnd,
        payDate: form.payDate,
        baseAmount: parseFloat(form.baseAmount) || 0,
        bonusAmount: parseFloat(form.bonusAmount) || 0,
        deductionAmount: parseFloat(form.deductionAmount) || 0,
        label: form.label.trim() || undefined,
        notes: form.notes.trim() || undefined,
      };
      const res = await retainedStaffApi.createCycle(member.id, payload);
      onSuccess(res.data.data.cycle);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create cycle. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Create Payroll Cycle</h2>
            <p className={styles.subtitle}>
              For {member?.jobTitle} · {member?.worker?.firstName}{" "}
              {member?.worker?.lastName}
            </p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        <div className={styles.body}>
          {/* Cycle type picker */}
          <div className={styles.field}>
            <label>Cycle Type</label>
            <div className={styles.typeGrid}>
              {CYCLE_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  className={`${styles.typeCard} ${
                    type === t.value ? styles.typeCardActive : ""
                  }`}
                  onClick={() => setType(t.value)}
                >
                  <span className={styles.typeLabel}>{t.label}</span>
                  <span className={styles.typeDesc}>{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Period Start</label>
              <input
                type="date"
                value={form.periodStart}
                onChange={(e) =>
                  setForm({ ...form, periodStart: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label>Period End</label>
              <input
                type="date"
                value={form.periodEnd}
                onChange={(e) =>
                  setForm({ ...form, periodEnd: e.target.value })
                }
              />
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Pay Date</label>
              <input
                type="date"
                value={form.payDate}
                onChange={(e) => setForm({ ...form, payDate: e.target.value })}
              />
            </div>
          </div>

          {/* Amounts */}
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Base Amount ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.baseAmount}
                onChange={(e) =>
                  setForm({ ...form, baseAmount: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className={styles.field}>
              <label>Bonus ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.bonusAmount}
                onChange={(e) =>
                  setForm({ ...form, bonusAmount: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
            <div className={styles.field}>
              <label>Deduction ({currency})</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.deductionAmount}
                onChange={(e) =>
                  setForm({ ...form, deductionAmount: e.target.value })
                }
                placeholder="0"
              />
            </div>
            <div className={styles.field}>
              <label>Label (optional)</label>
              <input
                type="text"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Q1 Performance Bonus"
              />
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Notes (optional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Visible to the worker in their cycle details"
              />
            </div>
          </div>

          {/* Live preview */}
          {netAmount > 0 && (
            <div className={styles.preview}>
              <div className={styles.previewHeader}>
                <FiDollarSign />
                <span>Cycle Preview</span>
              </div>
              <div className={styles.previewRow}>
                <span>Base + Bonus</span>
                <span>
                  {currency} {grossAmount.toLocaleString()}
                </span>
              </div>
              {parseFloat(form.deductionAmount) > 0 && (
                <div className={styles.previewRow}>
                  <span>Deductions</span>
                  <span>
                    − {currency}{" "}
                    {parseFloat(form.deductionAmount).toLocaleString()}
                  </span>
                </div>
              )}
              <div className={styles.previewRow}>
                <span>Net Amount</span>
                <span>
                  {currency} {netAmount.toLocaleString()}
                </span>
              </div>
              <div className={styles.previewRow}>
                <span>Platform Fee (5%)</span>
                <span>
                  − {currency} {platformFee.toLocaleString()}
                </span>
              </div>
              <div className={styles.previewTotal}>
                <span>Worker Receives</span>
                <span>
                  {currency} {workerPayout.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <FiLoader /> : <FiCheckCircle />}
            {submitting ? "Creating…" : "Create Cycle"}
          </button>
        </div>
      </div>
    </div>
  );
}
