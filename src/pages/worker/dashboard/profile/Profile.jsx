import { useState, useEffect } from "react";
import api from "../../../../lib/api";
import { useFetch } from "../../../../hooks/useFetch";
import { useAuthStore } from "../../../../store/authStore";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import ui from "../../../../components/ui/ui.module.css";
import VideoIntro from "../../VideoIntro";

const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES"];

export default function EditProfilePage() {
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

  const [form, setForm] = useState({
    title: "",
    description: "",
    hourlyRate: "",
    currency: "NGN",
    yearsExperience: "",
    serviceRadius: "",
    isAvailable: true,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (data?.worker) {
      const w = data.worker;
      setForm({
        title: w.title || "",
        description: w.description || "",
        hourlyRate: w.hourlyRate || "",
        currency: w.currency || "NGN",
        yearsExperience: w.yearsExperience || "",
        serviceRadius: w.serviceRadius || "",
        isAvailable: w.isAvailable ?? true,
      });
    }
  }, [data]);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await api.put("/workers/profile", form);
      setMsg({ type: "success", text: "Profile updated successfully!" });
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkerLayout>
      <div style={{ maxWidth: 640 }}>
        {msg && (
          <div
            style={{
              padding: "0.875rem 1.25rem",
              borderRadius: "var(--radius-md)",
              marginBottom: "1.25rem",
              background:
                msg.type === "success"
                  ? "var(--green-light)"
                  : "var(--red-light)",
              color: msg.type === "success" ? "var(--green)" : "var(--red)",
              fontWeight: 600,
              fontSize: "0.9rem",
            }}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={ui.card}>
            <div className={ui.cardTitle} style={{ marginBottom: "1.25rem" }}>
              Professional Info
            </div>

            <div className={ui.inputGroup}>
              <label className={ui.label}>Professional Title</label>
              <input
                className={ui.input}
                placeholder="e.g. Master Electrician"
                value={form.title}
                onChange={set("title")}
              />
            </div>

            <div className={ui.inputGroup}>
              <label className={ui.label}>Bio / Description</label>
              <textarea
                className={ui.input}
                style={{ minHeight: 120, resize: "vertical" }}
                placeholder="Tell clients about your experience, skills, and what makes you stand out..."
                value={form.description}
                onChange={set("description")}
              />
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className={ui.inputGroup}>
                <label className={ui.label}>Daily Rate</label>
                <input
                  className={ui.input}
                  type="number"
                  placeholder="8500"
                  value={form.hourlyRate}
                  onChange={set("hourlyRate")}
                />
              </div>
              <div className={ui.inputGroup}>
                <label className={ui.label}>Currency</label>
                <select
                  className={ui.input}
                  value={form.currency}
                  onChange={set("currency")}
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className={ui.inputGroup}>
                <label className={ui.label}>Years of Experience</label>
                <input
                  className={ui.input}
                  type="number"
                  placeholder="5"
                  value={form.yearsExperience}
                  onChange={set("yearsExperience")}
                />
              </div>
              <div className={ui.inputGroup}>
                <label className={ui.label}>Service Radius (km)</label>
                <input
                  className={ui.input}
                  type="number"
                  placeholder="25"
                  value={form.serviceRadius}
                  onChange={set("serviceRadius")}
                />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.875rem 0",
              }}
            >
              <input
                type="checkbox"
                id="isAvailable"
                checked={form.isAvailable}
                onChange={set("isAvailable")}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: "var(--brand)",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="isAvailable"
                style={{
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                I am currently available for work
              </label>
            </div>

            <button
              type="submit"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={saving}
              style={{ marginTop: "0.5rem" }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </WorkerLayout>
  );
}
