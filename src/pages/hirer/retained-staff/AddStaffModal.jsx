// src/pages/hirer/retained-staff/AddStaffModal.jsx
import { useState, useEffect, useRef } from "react";
import styles from "./AddStaffModal.module.css";
import {
  FiSearch,
  FiX,
  FiUser,
  FiChevronRight,
  FiAlertCircle,
  FiCheckCircle,
  FiLoader,
  FiMapPin,
  FiNavigation,
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

const LOCATION_TYPES = [
  { value: "ON_SITE", label: "On-site" },
  { value: "REMOTE", label: "Remote" },
  { value: "HYBRID", label: "Hybrid" },
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
  const [step, setStep] = useState(1);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [locating, setLocating] = useState(false);

  // Form state
  const [form, setForm] = useState({
    jobTitle: "",
    department: "",
    employmentType: "FULL_TIME",
    locationType: "ON_SITE",
    location: "", // ✅ New field for location text
    latitude: null, // ✅ New field for auto-detected lat
    longitude: null, // ✅ New field for auto-detected lng
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
      setLocating(false);
      setForm({
        jobTitle: "",
        department: "",
        employmentType: "FULL_TIME",
        locationType: "ON_SITE",
        location: "",
        latitude: null,
        longitude: null,
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
        const res = await retainedStaffApi.lookupWorker(searchQuery);
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
      const res = await retainedStaffApi.lookupWorker(manualEmail);
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

  // ✅ Auto-detect location handler
  const handleAutoLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }

    setLocating(true);
    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        try {
          // Reverse geocode using OpenStreetMap's free Nominatim API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            { headers: { "User-Agent": "SkilledProz/1.0" } },
          );
          const data = await res.json();

          const address =
            data.display_name ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

          setForm((prev) => ({
            ...prev,
            location: address,
            latitude,
            longitude,
          }));
        } catch (err) {
          // If reverse geocoding fails, fall back to raw coordinates
          setForm((prev) => ({
            ...prev,
            location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            latitude,
            longitude,
          }));
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        let msg = "Could not get your location.";
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission denied. Please enable it in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable.";
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out. Please try again.";
        }
        setError(msg);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
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
    // Only validate location if on-site or hybrid
    if (
      ["ON_SITE", "HYBRID"].includes(form.locationType) &&
      !form.location.trim()
    ) {
      setError("Please provide a work location or use the auto-detect button.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        workerId: selectedWorker.id,
        jobTitle: form.jobTitle.trim(),
        department: form.department.trim() || undefined,
        employmentType: form.employmentType,
        locationType: form.locationType,
        location: form.location.trim() || undefined,
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
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

  const showLocationField = ["ON_SITE", "HYBRID"].includes(form.locationType);

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

                {/* Location Type Field */}
                <div className={styles.field}>
                  <label>Location Type</label>
                  <select
                    value={form.locationType}
                    onChange={(e) =>
                      setForm({ ...form, locationType: e.target.value })
                    }
                  >
                    {LOCATION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ✅ Location input (only shown for ON_SITE / HYBRID) */}
                {showLocationField && (
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label>Work Location</label>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <div style={{ position: "relative", flex: 1 }}>
                        <FiMapPin
                          style={{
                            position: "absolute",
                            left: "0.75rem",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                            pointerEvents: "none",
                          }}
                        />
                        <input
                          type="text"
                          value={form.location}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              location: e.target.value,
                              latitude: null,
                              longitude: null,
                            })
                          }
                          placeholder="Street, city, state or full address"
                          style={{ paddingLeft: "2rem", width: "100%" }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoLocate}
                        disabled={locating}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.5rem 0.875rem",
                          background: "var(--orange-dim)",
                          border: "1px solid var(--orange)",
                          borderRadius: "8px",
                          color: "var(--orange)",
                          fontFamily: "var(--font-body)",
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          cursor: locating ? "wait" : "pointer",
                          whiteSpace: "nowrap",
                          opacity: locating ? 0.7 : 1,
                        }}
                      >
                        {locating ? (
                          <FiLoader
                            style={{
                              animation: "spin 0.8s linear infinite",
                            }}
                          />
                        ) : (
                          <FiNavigation />
                        )}
                        {locating ? "Locating…" : "Auto-detect"}
                      </button>
                    </div>
                    {form.latitude && form.longitude && (
                      <p
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.7rem",
                          color: "var(--green)",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                        }}
                      >
                        <FiCheckCircle size={12} /> GPS captured:{" "}
                        {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                      </p>
                    )}
                  </div>
                )}

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
