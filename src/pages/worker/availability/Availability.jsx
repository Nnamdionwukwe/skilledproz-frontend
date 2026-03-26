import { useState, useEffect } from "react";
import { useFetch } from "../../../hooks/useFetch";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import ui from "../../../components/ui/ui.module.css";

const DAYS = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const DEFAULT_AVAIL = DAYS.map((d) => ({
  dayOfWeek: d.value,
  startTime: "08:00",
  endTime: "18:00",
  isAvailable: !["SATURDAY", "SUNDAY"].includes(d.value),
}));

export default function AvailabilityPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (user?.id) {
      api.get(`/workers/${user?.id}`).then((res) => {
        setData(res.data.data);
        setLoading(false);
      });
    }
  }, [user?.id]);
  const [schedule, setSchedule] = useState(DEFAULT_AVAIL);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (data?.worker?.availability?.length > 0) {
      const avail = data.worker.availability;
      setSchedule(
        DAYS.map((d) => {
          const found = avail.find((a) => a.dayOfWeek === d.value);
          return (
            found || {
              dayOfWeek: d.value,
              startTime: "08:00",
              endTime: "18:00",
              isAvailable: false,
            }
          );
        }),
      );
    }
  }, [data]);

  const toggle = (idx) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, isAvailable: !d.isAvailable } : d)),
    );
  const setTime = (idx, key) => (e) =>
    setSchedule((s) =>
      s.map((d, i) => (i === idx ? { ...d, [key]: e.target.value } : d)),
    );

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      await api.put("/workers/availability", { availability: schedule });
      setMsg({ type: "success", text: "Availability saved!" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkerLayout>
      <div style={{ maxWidth: 680 }}>
        {msg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.25rem",
              background:
                msg.type === "success"
                  ? "var(--green-light)"
                  : "var(--red-light)",
              color: msg.type === "success" ? "var(--green)" : "var(--red)",
              fontWeight: 600,
              fontSize: "0.875rem",
            }}
          >
            {msg.text}
          </div>
        )}

        <div className={ui.card}>
          <div className={ui.cardTitle} style={{ marginBottom: "0.375rem" }}>
            Weekly Schedule
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--ink-4)",
              marginBottom: "1.5rem",
            }}
          >
            Set the days and hours you are available to accept bookings.
          </p>

          {loading ? (
            <div>
              {DAYS.map((d) => (
                <div
                  key={d.value}
                  className={ui.skeleton}
                  style={{ height: 56, marginBottom: 10 }}
                />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.625rem",
              }}
            >
              {schedule.map((day, idx) => (
                <div
                  key={day.dayOfWeek}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.875rem 1rem",
                    borderRadius: "var(--radius-md)",
                    background: day.isAvailable
                      ? "var(--surface)"
                      : "var(--surface-2)",
                    border: `1.5px solid ${day.isAvailable ? "var(--brand-border)" : "var(--surface-3)"}`,
                    opacity: day.isAvailable ? 1 : 0.65,
                    transition: "all 0.2s",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <button
                      onClick={() => toggle(idx)}
                      style={{
                        width: 36,
                        height: 20,
                        background: day.isAvailable
                          ? "var(--brand)"
                          : "rgba(0,0,0,0.15)",
                        border: "none",
                        borderRadius: "999px",
                        position: "relative",
                        cursor: "pointer",
                        transition: "background 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          background: "#fff",
                          borderRadius: "50%",
                          position: "absolute",
                          top: 3,
                          left: day.isAvailable ? 19 : 3,
                          transition: "left 0.2s",
                        }}
                      />
                    </button>
                    <span
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        color: "var(--ink-2)",
                      }}
                    >
                      {DAYS.find((d) => d.value === day.dayOfWeek)?.label}
                    </span>
                  </div>

                  {day.isAvailable ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                      }}
                    >
                      <input
                        type="time"
                        className={ui.input}
                        style={{ padding: "0.375rem 0.625rem", flex: 1 }}
                        value={day.startTime}
                        onChange={setTime(idx, "startTime")}
                      />
                      <span
                        style={{
                          fontSize: "0.8125rem",
                          color: "var(--ink-4)",
                          fontWeight: 600,
                        }}
                      >
                        to
                      </span>
                      <input
                        type="time"
                        className={ui.input}
                        style={{ padding: "0.375rem 0.625rem", flex: 1 }}
                        value={day.endTime}
                        onChange={setTime(idx, "endTime")}
                      />
                    </div>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.875rem",
                        color: "var(--ink-4)",
                        fontStyle: "italic",
                      }}
                    >
                      Not available
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <button
            className={`${ui.btn} ${ui.btnPrimary}`}
            onClick={handleSave}
            disabled={saving || loading}
            style={{ marginTop: "1.5rem" }}
          >
            {saving ? "Saving..." : "Save Availability"}
          </button>
        </div>
      </div>
    </WorkerLayout>
  );
}
