import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import ui from "../../../components/ui/ui.module.css";

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CertificationsPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const refetch = () =>
    api.get(`/workers/${user?.id}`).then((res) => setData(res.data.data));
  useEffect(() => {
    if (user?.id) {
      api.get(`/workers/${user?.id}`).then((res) => {
        setData(res.data.data);
        setLoading(false);
      });
    }
  }, [user?.id]);
  const certs = data?.worker?.certifications || [];

  const [form, setForm] = useState({
    name: "",
    issuedBy: "",
    issueDate: "",
    expiryDate: "",
    file: null,
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.files ? e.target.files[0] : e.target.value,
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("issuedBy", form.issuedBy);
      if (form.issueDate) fd.append("issueDate", form.issueDate);
      if (form.expiryDate) fd.append("expiryDate", form.expiryDate);
      if (form.file) fd.append("document", form.file);
      const token = localStorage.getItem("accessToken");
      await fetch(
        `${import.meta.env.VITE_API_URL || "/api"}/workers/certifications`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
      setForm({
        name: "",
        issuedBy: "",
        issueDate: "",
        expiryDate: "",
        file: null,
      });
      setMsg({ type: "success", text: "Certification added!" });
      refetch();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const isExpired = (d) => d && new Date(d) < new Date();

  return (
    <WorkerLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Add form */}
        <div className={ui.card}>
          <div className={ui.cardTitle} style={{ marginBottom: "1.125rem" }}>
            Add Certification
          </div>
          {msg && (
            <div
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "var(--radius-md)",
                marginBottom: "1rem",
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
          <form onSubmit={handleSubmit}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className={ui.inputGroup}>
                <label className={ui.label}>Certification Name *</label>
                <input
                  className={ui.input}
                  required
                  placeholder="e.g. City & Guilds Electrical"
                  value={form.name}
                  onChange={set("name")}
                />
              </div>
              <div className={ui.inputGroup}>
                <label className={ui.label}>Issued By *</label>
                <input
                  className={ui.input}
                  required
                  placeholder="e.g. City & Guilds UK"
                  value={form.issuedBy}
                  onChange={set("issuedBy")}
                />
              </div>
              <div className={ui.inputGroup}>
                <label className={ui.label}>Issue Date</label>
                <input
                  className={ui.input}
                  type="date"
                  value={form.issueDate}
                  onChange={set("issueDate")}
                />
              </div>
              <div className={ui.inputGroup}>
                <label className={ui.label}>Expiry Date</label>
                <input
                  className={ui.input}
                  type="date"
                  value={form.expiryDate}
                  onChange={set("expiryDate")}
                />
              </div>
            </div>
            <div className={ui.inputGroup}>
              <label className={ui.label}>
                Certificate Document (optional)
              </label>
              <input
                className={ui.input}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={set("file")}
              />
            </div>
            <button
              type="submit"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={saving}
            >
              {saving ? "Saving..." : "+ Add Certification"}
            </button>
          </form>
        </div>

        {/* List */}
        <div className={ui.card}>
          <div className={ui.cardTitle} style={{ marginBottom: "1.125rem" }}>
            My Certifications ({certs.length})
          </div>
          {loading ? (
            <div>
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={ui.skeleton}
                  style={{ height: 72, marginBottom: 12 }}
                />
              ))}
            </div>
          ) : certs.length === 0 ? (
            <div className={ui.empty}>
              <div className={ui.emptyIcon}>🏅</div>
              <div className={ui.emptyTitle}>No certifications added</div>
              <div className={ui.emptyDesc}>
                Add your trade certifications to build trust with clients
              </div>
            </div>
          ) : (
            certs.map((c) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "1rem 0",
                  borderBottom: "1px solid var(--surface-2)",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: "var(--radius-md)",
                    background: isExpired(c.expiryDate)
                      ? "var(--red-light)"
                      : "var(--green-light)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    flexShrink: 0,
                  }}
                >
                  🏅
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9375rem",
                      marginBottom: "2px",
                    }}
                  >
                    {c.name}
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--ink-4)" }}>
                    Issued by {c.issuedBy} · {fmtDate(c.issueDate)}
                    {c.expiryDate && ` · Expires ${fmtDate(c.expiryDate)}`}
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {isExpired(c.expiryDate) && (
                    <span className={`${ui.badge} ${ui.badgeCancelled}`}>
                      Expired
                    </span>
                  )}
                  {c.documentUrl && (
                    <a
                      href={c.documentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={`${ui.btn} ${ui.btnOutline} ${ui.btnSm}`}
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
