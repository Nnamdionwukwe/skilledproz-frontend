// src/pages/hirer/retained-staff/EditRetainedStaffModal.jsx
import { useState, useEffect } from "react";
import styles from "./AddStaffModal.module.css"; // Reuse the AddStaffModal styles for consistency
import {
  FiX,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiUser,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

const PAY_FREQUENCIES = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "BIWEEKLY", label: "Bi-weekly" },
  { value: "SEMI_MONTHLY", label: "Semi-monthly (1st & 15th)" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ON_DEMAND", label: "On-demand" },
];

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "CASUAL", label: "Casual" },
];

const WORK_DAYS = [
  { value: "MON", label: "Mon" },
  { value: "TUE", label: "Tue" },
  { value: "WED", label: "Wed" },
  { value: "THU", label: "Thu" },
  { value: "FRI", label: "Fri" },
  { value: "SAT", label: "Sat" },
  { value: "SUN", label: "Sun" },
];

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

export default function EditRetainedStaffModal({
  isOpen,
  onClose,
  onSuccess,
  member,
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    jobTitle: "",
    department: "",
    employmentType: "FULL_TIME",
    description: "",
    payRate: "",
    currency: "NGN",
    payFrequency: "MONTHLY",
    overtimeRate: "",
    workDays: [],
    workStart: "09:00",
    workEnd: "17:00",
    timezone: "Africa/Lagos",
    employeeNumber: "",
    managerName: "",
    emergencyContact: "",
    notes: "",
    applyToPending: false,
    rateChangeReason: "",
  });

  // Populate form when member changes
  useEffect(() => {
    if (isOpen && member) {
      setForm({
        jobTitle: member.jobTitle || "",
        department: member.department || "",
        employmentType: member.employmentType || "FULL_TIME",
        description: member.description || "",
        payRate: member.payRate || "",
        currency: member.currency || "NGN",
        payFrequency: member.payFrequency || "MONTHLY",
        overtimeRate: member.overtimeRate || "",
        workDays: member.workDays || [],
        workStart: member.workStart || "09:00",
        workEnd: member.workEnd || "17:00",
        timezone: member.timezone || "Africa/Lagos",
        employeeNumber: member.employeeNumber || "",
        managerName: member.managerName || "",
        emergencyContact: member.emergencyContact || "",
        notes: member.notes || "",
        applyToPending: false,
        rateChangeReason: "",
      });
      setError("");
    }
  }, [isOpen, member]);

  const toggleWorkDay = (day) => {
    setForm((prev) => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter((d) => d !== day)
        : [...prev.workDays, day],
    }));
  };

  const handleSubmit = async () => {
    setError("");
    if (!form.jobTitle.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!form.payRate || parseFloat(form.payRate) <= 0) {
      setError("Pay rate must be greater than 0.");
      return;
    }

    // If rate changed, ensure a reason is provided if applyToPending is checked
    const rateChanged = parseFloat(form.payRate) !== member.payRate;
    if (rateChanged && form.applyToPending && !form.rateChangeReason.trim()) {
      setError("Please provide a reason for updating pending cycles.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        jobTitle: form.jobTitle.trim(),
        department: form.department.trim() || undefined,
        employmentType: form.employmentType,
        description: form.description.trim() || undefined,
        payRate: parseFloat(form.payRate),
        currency: form.currency,
        payFrequency: form.payFrequency,
        overtimeRate: form.overtimeRate
          ? parseFloat(form.overtimeRate)
          : undefined,
        workDays: form.workDays,
        workStart: form.workStart,
        workEnd: form.workEnd,
        timezone: form.timezone,
        employeeNumber: form.employeeNumber.trim() || undefined,
        managerName: form.managerName.trim() || undefined,
        emergencyContact: form.emergencyContact.trim() || undefined,
        notes: form.notes.trim() || undefined,
        applyToPending: form.applyToPending,
        rateChangeReason: form.rateChangeReason.trim() || undefined,
      };

      const res = await retainedStaffApi.updateStaff(member.id, payload);
      onSuccess(res.data.data.member);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update staff member. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const rateChanged = parseFloat(form.payRate) !== member?.payRate;
  const currencyChanged = form.currency !== member?.currency;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Edit Staff Member</h2>
            <p className={styles.subtitle}>
              {member?.worker?.firstName} {member?.worker?.lastName}
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
          {/* Section: Role */}
          <h3 className={styles.sectionTitle}>Role & Position</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>
                Job Title <span className={styles.required}>*</span>
              </label>
              <input
                type="text"
                value={form.jobTitle}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                placeholder="e.g. Senior Developer"
              />
            </div>
            <div className={styles.field}>
              <label>Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) =>
                  setForm({ ...form, department: e.target.value })
                }
                placeholder="e.g. Engineering"
              />
            </div>
            <div className={styles.field}>
              <label>Employment Type</label>
              <select
                value={form.employmentType}
                onChange={(e) =>
                  setForm({ ...form, employmentType: e.target.value })
                }
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Employee #</label>
              <input
                type="text"
                value={form.employeeNumber}
                onChange={(e) =>
                  setForm({ ...form, employeeNumber: e.target.value })
                }
                placeholder="EMP-001"
              />
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Role Description</label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                placeholder="Brief description of responsibilities"
              />
            </div>
          </div>

          {/* Section: Compensation */}
          <h3 className={styles.sectionTitle}>Compensation</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>
                Pay Rate <span className={styles.required}>*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.payRate}
                onChange={(e) => setForm({ ...form, payRate: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className={styles.field}>
              <label>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                // ✅ Removed disabled attribute. The backend will enforce the lock.
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              {member?.currencyLocked && (
                <p
                  className={styles.fieldHint}
                  style={{
                    marginTop: 4,
                    fontSize: "0.7rem",
                    color: "var(--orange)",
                  }}
                >
                  <FiAlertCircle size={10} style={{ marginRight: 4 }} />
                  Currency is locked after the first cycle. Changing this may
                  fail.
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label>Pay Frequency</label>
              <select
                value={form.payFrequency}
                onChange={(e) =>
                  setForm({ ...form, payFrequency: e.target.value })
                }
              >
                {PAY_FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </div>
            <div className={styles.field}>
              <label>Overtime Rate (optional)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.overtimeRate}
                onChange={(e) =>
                  setForm({ ...form, overtimeRate: e.target.value })
                }
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Rate Change Confirmation */}
          {rateChanged && (
            <div
              className={styles.rateChangeBox}
              style={{
                background: "var(--orange-dim)",
                border: "1px solid var(--orange)",
                padding: "1rem",
                borderRadius: "8px",
                marginTop: "1rem",
              }}
            >
              <h4
                style={{
                  color: "var(--orange)",
                  marginBottom: "0.5rem",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                }}
              >
                Rate Change Detected
              </h4>
              <p
                style={{
                  fontSize: "0.85rem",
                  color: "var(--text-dim)",
                  marginBottom: "0.75rem",
                }}
              >
                You changed the pay rate from {member?.currency}{" "}
                {member?.payRate.toLocaleString()} to {form.currency}{" "}
                {parseFloat(form.payRate || 0).toLocaleString()}.
              </p>

              <div className={styles.field}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    textTransform: "none",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.applyToPending}
                    onChange={(e) =>
                      setForm({ ...form, applyToPending: e.target.checked })
                    }
                    style={{ width: "auto" }}
                  />
                  Apply this new rate to any pending unpaid cycles
                </label>
              </div>

              {form.applyToPending && (
                <div className={styles.field} style={{ marginTop: "0.5rem" }}>
                  <label>Reason for update (Required)</label>
                  <input
                    type="text"
                    value={form.rateChangeReason}
                    onChange={(e) =>
                      setForm({ ...form, rateChangeReason: e.target.value })
                    }
                    placeholder="e.g. Promoted to Senior, new agreed rate"
                  />
                </div>
              )}
            </div>
          )}

          {/* Section: Schedule */}
          <h3 className={styles.sectionTitle}>Working Schedule</h3>
          <div className={styles.field}>
            <label>Work Days</label>
            <div className={styles.daysRow}>
              {WORK_DAYS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  className={`${styles.dayBtn} ${
                    form.workDays.includes(d.value) ? styles.dayBtnActive : ""
                  }`}
                  onClick={() => toggleWorkDay(d.value)}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Start Time</label>
              <input
                type="time"
                value={form.workStart}
                onChange={(e) =>
                  setForm({ ...form, workStart: e.target.value })
                }
              />
            </div>
            <div className={styles.field}>
              <label>End Time</label>
              <input
                type="time"
                value={form.workEnd}
                onChange={(e) => setForm({ ...form, workEnd: e.target.value })}
              />
            </div>
          </div>

          {/* Section: HR Info (optional) */}
          <h3 className={styles.sectionTitle}>HR Information (optional)</h3>
          <div className={styles.formGrid}>
            <div className={styles.field}>
              <label>Manager</label>
              <input
                type="text"
                value={form.managerName}
                onChange={(e) =>
                  setForm({ ...form, managerName: e.target.value })
                }
                placeholder="Reporting manager"
              />
            </div>
            <div className={styles.field}>
              <label>Emergency Contact</label>
              <input
                type="text"
                value={form.emergencyContact}
                onChange={(e) =>
                  setForm({ ...form, emergencyContact: e.target.value })
                }
                placeholder="+234…"
              />
            </div>
            <div className={`${styles.field} ${styles.fullWidth}`}>
              <label>Internal Notes</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                placeholder="Private notes visible only to you"
              />
            </div>
          </div>
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
            {submitting ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
