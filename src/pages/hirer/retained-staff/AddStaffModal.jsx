// src/pages/hirer/retained-staff/AddStaffModal.jsx
import { useState, useEffect, useRef } from "react";
import { retainedStaffApi } from "../../../lib/retainedStaffApi";
import api from "../../../lib/api";
import styles from "./AddStaffModal.module.css";
import {
  FiSearch,
  FiX,
  FiUser,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
} from "react-icons/fi";

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

export default function AddStaffModal({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1); // 1=find worker, 2=details
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [form, setForm] = useState({
    jobTitle: "",
    department: "",
    employmentType: "FULL_TIME",
    description: "",
    payRate: "",
    currency: "NGN",
    payFrequency: "MONTHLY",
    overtimeRate: "",
    workDays: ["MON", "TUE", "WED", "THU", "FRI"],
    workStart: "09:00",
    workEnd: "17:00",
    timezone: "Africa/Lagos",
    employeeNumber: "",
    managerName: "",
    emergencyContact: "",
    notes: "",
  });

  const searchDebounce = useRef(null);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedWorker(null);
      setSearchQuery("");
      setSearchResults([]);
      setManualEmail("");
      setError("");
      setForm({
        jobTitle: "",
        department: "",
        employmentType: "FULL_TIME",
        description: "",
        payRate: "",
        currency: "NGN",
        payFrequency: "MONTHLY",
        overtimeRate: "",
        workDays: ["MON", "TUE", "WED", "THU", "FRI"],
        workStart: "09:00",
        workEnd: "17:00",
        timezone: "Africa/Lagos",
        employeeNumber: "",
        managerName: "",
        emergencyContact: "",
        notes: "",
      });
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get("/search", {
          params: { q: searchQuery, type: "workers", limit: 8 },
        });
        setSearchResults(res.data.data?.workers || []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [searchQuery]);

  const handleSelectWorker = (worker) => {
    setSelectedWorker(worker);
    setStep(2);
  };

  const handleManualEmail = async () => {
    if (!manualEmail.trim() || !manualEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      // Lookup by email via the search endpoint as fallback
      const res = await api.get("/search", {
        params: { q: manualEmail, type: "workers", limit: 1 },
      });
      const worker = res.data.data?.workers?.[0];
      if (!worker) {
        setError(
          "No worker found with that email. Ask them to sign up on SkilledProz first.",
        );
        return;
      }
      setSelectedWorker(worker);
      setStep(2);
    } catch {
      setError("Could not find that worker. Please check the email.");
    } finally {
      setSearching(false);
    }
  };

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
    setSubmitting(true);
    try {
      const payload = {
        workerId: selectedWorker.id,
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
      };
      const res = await retainedStaffApi.addStaff(payload);
      onSuccess(res.data.data.member);
      onClose();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to add staff member. Please try again.",
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
            <h2 className={styles.title}>
              {step === 1 ? "Add Staff Member" : "Employment Details"}
            </h2>
            <p className={styles.subtitle}>
              {step === 1
                ? "Search for a worker or enter their email"
                : `Setting up payroll for ${selectedWorker?.firstName} ${selectedWorker?.lastName}`}
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

        {/* ═══ STEP 1: FIND WORKER ═══ */}
        {step === 1 && (
          <div className={styles.body}>
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} />
              <input
                type="text"
                placeholder="Search workers by name, skill, or trade…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles.searchInput}
                autoFocus
              />
              {searching && <FiLoader className={styles.searchSpinner} />}
            </div>

            {searchResults.length > 0 && (
              <div className={styles.results}>
                {searchResults.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => handleSelectWorker(w)}
                    className={styles.resultItem}
                  >
                    <div className={styles.resultAvatar}>
                      {w.avatar ? (
                        <img src={w.avatar} alt="" />
                      ) : (
                        <FiUser size={18} />
                      )}
                    </div>
                    <div className={styles.resultInfo}>
                      <p className={styles.resultName}>
                        {w.firstName} {w.lastName}
                      </p>
                      <p className={styles.resultMeta}>
                        {w.workerProfile?.title || "Worker"}
                        {w.city && ` · ${w.city}`}
                      </p>
                    </div>
                    <FiChevronRight className={styles.resultArrow} />
                  </button>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 &&
              !searching &&
              searchResults.length === 0 && (
                <p className={styles.noResults}>
                  No workers found. Try a different search.
                </p>
              )}

            <div className={styles.divider}>
              <span>or add by email</span>
            </div>

            <div className={styles.emailWrap}>
              <input
                type="email"
                placeholder="worker@example.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className={styles.emailInput}
                onKeyDown={(e) => e.key === "Enter" && handleManualEmail()}
              />
              <button
                className={styles.emailBtn}
                onClick={handleManualEmail}
                disabled={searching || !manualEmail.trim()}
              >
                {searching ? <FiLoader /> : "Find"}
              </button>
            </div>
            <p className={styles.hint}>
              The worker must already have a SkilledProz account.
            </p>
          </div>
        )}

        {/* ═══ STEP 2: DETAILS ═══ */}
        {step === 2 && (
          <>
            <div className={styles.body}>
              {/* Selected worker summary */}
              <div className={styles.selectedWorker}>
                <div className={styles.resultAvatar}>
                  {selectedWorker?.avatar ? (
                    <img src={selectedWorker.avatar} alt="" />
                  ) : (
                    <FiUser size={18} />
                  )}
                </div>
                <div>
                  <p className={styles.resultName}>
                    {selectedWorker?.firstName} {selectedWorker?.lastName}
                  </p>
                  <p className={styles.resultMeta}>{selectedWorker?.email}</p>
                </div>
                <button className={styles.changeBtn} onClick={() => setStep(1)}>
                  Change
                </button>
              </div>

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
                    onChange={(e) =>
                      setForm({ ...form, jobTitle: e.target.value })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, payRate: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </div>
                <div className={styles.field}>
                  <label>Currency</label>
                  <select
                    value={form.currency}
                    onChange={(e) =>
                      setForm({ ...form, currency: e.target.value })
                    }
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
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
                        form.workDays.includes(d.value)
                          ? styles.dayBtnActive
                          : ""
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
                    onChange={(e) =>
                      setForm({ ...form, workEnd: e.target.value })
                    }
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
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
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
                {submitting ? "Adding…" : "Add to Staff"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
