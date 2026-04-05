import { useState, useEffect } from "react";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import styles from "./Availability.module.css";

const DAYS = [
  { value: "MONDAY", label: "Monday", num: 1 },
  { value: "TUESDAY", label: "Tuesday", num: 2 },
  { value: "WEDNESDAY", label: "Wednesday", num: 3 },
  { value: "THURSDAY", label: "Thursday", num: 4 },
  { value: "FRIDAY", label: "Friday", num: 5 },
  { value: "SATURDAY", label: "Saturday", num: 6 },
  { value: "SUNDAY", label: "Sunday", num: 0 },
];

const DAY_MAP = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const NUM_TO_DAY = {
  0: "SUNDAY",
  1: "MONDAY",
  2: "TUESDAY",
  3: "WEDNESDAY",
  4: "THURSDAY",
  5: "FRIDAY",
  6: "SATURDAY",
};

function buildDefault() {
  return DAYS.map((d) => ({
    dayOfWeek: d.value,
    startTime: "08:00",
    endTime: "18:00",
    isAvailable: !["SATURDAY", "SUNDAY"].includes(d.value),
  }));
}

export default function AvailabilityPage() {
  const { user } = useAuthStore();
  const [schedule, setSchedule] = useState(buildDefault());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Load saved availability from backend
  useEffect(() => {
    if (!user?.id) return;
    api
      .get(`/workers/${user.id}`)
      .then((res) => {
        const avail = res.data.data?.worker?.availability || [];
        if (avail.length > 0) {
          // Map numeric dayOfWeek back to named days
          setSchedule(
            DAYS.map((d) => {
              const saved = avail.find((a) => a.dayOfWeek === DAY_MAP[d.value]);
              return saved
                ? {
                    dayOfWeek: d.value,
                    startTime: saved.startTime,
                    endTime: saved.endTime,
                    isAvailable: saved.isAvailable,
                  }
                : {
                    dayOfWeek: d.value,
                    startTime: "08:00",
                    endTime: "18:00",
                    isAvailable: false,
                  };
            }),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  const toggle = (idx) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, isAvailable: !d.isAvailable } : d)),
    );

  const setTime = (idx, key) => (e) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, [key]: e.target.value } : d)),
    );

  const setAllWorkdays = () =>
    setSchedule((s) =>
      s.map((d) => ({
        ...d,
        isAvailable: !["SATURDAY", "SUNDAY"].includes(d.dayOfWeek),
        startTime: "08:00",
        endTime: "18:00",
      })),
    );

  const setAllDays = () =>
    setSchedule((s) =>
      s.map((d) => ({
        ...d,
        isAvailable: true,
        startTime: "08:00",
        endTime: "18:00",
      })),
    );

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await api.put("/workers/availability", { availability: schedule });
      setSuccess("Availability saved successfully!");
      setTimeout(() => setSuccess(""), 4000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  const activeDays = schedule.filter((d) => d.isAvailable).length;

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div>
          <h1 className={styles.title}>Weekly Availability</h1>
          <p className={styles.sub}>
            Set the days and hours you're available. This is shown to hirers on
            your profile.
          </p>
        </div>

        {/* Quick actions */}
        <div className={styles.quickActions}>
          <button className={styles.quickBtn} onClick={setAllWorkdays}>
            Mon–Fri 8am–6pm
          </button>
          <button className={styles.quickBtn} onClick={setAllDays}>
            Every day
          </button>
          <button
            className={styles.quickBtn}
            onClick={() => setSchedule(buildDefault())}
          >
            Reset
          </button>
          <span className={styles.activeSummary}>
            {activeDays} day{activeDays !== 1 ? "s" : ""} active
          </span>
        </div>

        {/* Schedule */}
        <div className={styles.card}>
          <div className={styles.cardTitle}>Weekly Schedule</div>
          <p className={styles.cardDesc}>
            Toggle days on/off and set your working hours.
          </p>

          {loading ? (
            <div className={styles.dayList}>
              {DAYS.map((d) => (
                <div key={d.value} className={styles.skeleton} />
              ))}
            </div>
          ) : (
            <div className={styles.dayList}>
              {schedule.map((day, idx) => (
                <div
                  key={day.dayOfWeek}
                  className={`${styles.dayRow} ${day.isAvailable ? styles.active : styles.inactive}`}
                >
                  <div className={styles.dayLeft}>
                    <button
                      className={`${styles.toggleBtn} ${day.isAvailable ? styles.on : ""}`}
                      onClick={() => toggle(idx)}
                      type="button"
                    >
                      <span className={styles.toggleThumb} />
                    </button>
                    <span className={styles.dayName}>
                      {DAYS.find((d) => d.value === day.dayOfWeek)?.label}
                    </span>
                  </div>

                  {day.isAvailable ? (
                    <div className={styles.timeRow}>
                      <input
                        type="time"
                        className={styles.timeInput}
                        value={day.startTime}
                        onChange={setTime(idx, "startTime")}
                      />
                      <span className={styles.timeSep}>to</span>
                      <input
                        type="time"
                        className={styles.timeInput}
                        value={day.endTime}
                        onChange={setTime(idx, "endTime")}
                      />
                    </div>
                  ) : (
                    <span className={styles.offLabel}>Not available</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Alerts */}
          {error && <div className={styles.alertError}>⚠️ {error}</div>}
          {success && <div className={styles.alertSuccess}>✅ {success}</div>}

          <div className={styles.footer}>
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <>
                  <span className={styles.spinner} /> Saving...
                </>
              ) : (
                "Save Availability"
              )}
            </button>
          </div>
        </div>
      </div>
    </WorkerLayout>
  );
}
