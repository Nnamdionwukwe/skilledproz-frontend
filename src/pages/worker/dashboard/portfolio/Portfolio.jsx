import { useState } from "react";
import { useFetch } from "../../../../hooks/useFetch";
import { workerAPI } from "../../../../services/api";
import { useAuth } from "../../../../hooks/useAuth";
import WorkerLayout from "../../../../components/layout/WorkerLayout";
import ui from "../../../../components/ui/ui.module.css";

export default function PortfolioPage() {
  const { user } = useAuth();
  const { data, loading, refetch } = useFetch(
    () => workerAPI.getProfile(user?.id),
    [user?.id],
  );
  const portfolio = data?.worker?.portfolio || [];

  const [form, setForm] = useState({ title: "", description: "", file: null });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.file)
      return setMsg({ type: "error", text: "Please select an image" });
    setSaving(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("image", form.file);
      fd.append("title", form.title);
      fd.append("description", form.description);
      await workerAPI.addPortfolio(fd);
      setForm({ title: "", description: "", file: null });
      setMsg({ type: "success", text: "Portfolio item added!" });
      refetch();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this portfolio item?")) return;
    setDeletingId(id);
    try {
      await workerAPI.deletePortfolio(id);
      refetch();
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <WorkerLayout>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Upload form */}
        <div className={ui.card}>
          <div className={ui.cardTitle} style={{ marginBottom: "1.125rem" }}>
            Add Portfolio Item
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
          <form onSubmit={handleUpload}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
              }}
            >
              <div className={ui.inputGroup}>
                <label className={ui.label}>Title</label>
                <input
                  className={ui.input}
                  placeholder="e.g. Kitchen rewiring job"
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </div>
              <div className={ui.inputGroup}>
                <label className={ui.label}>Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className={ui.input}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, file: e.target.files[0] }))
                  }
                />
              </div>
            </div>
            <div className={ui.inputGroup}>
              <label className={ui.label}>Description (optional)</label>
              <input
                className={ui.input}
                placeholder="Describe the work done..."
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            </div>
            <button
              type="submit"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={saving}
            >
              {saving ? "Uploading..." : "+ Add to Portfolio"}
            </button>
          </form>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={ui.grid3}>
            {[1, 2, 3].map((i) => (
              <div key={i} className={ui.skeleton} style={{ height: 200 }} />
            ))}
          </div>
        ) : portfolio.length === 0 ? (
          <div className={ui.empty}>
            <div className={ui.emptyIcon}>🖼</div>
            <div className={ui.emptyTitle}>No portfolio items yet</div>
            <div className={ui.emptyDesc}>
              Upload photos of your completed work to attract more clients
            </div>
          </div>
        ) : (
          <div className={ui.grid3}>
            {portfolio.map((item) => (
              <div
                key={item.id}
                className={ui.card}
                style={{ padding: 0, overflow: "hidden" }}
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  style={{ width: "100%", height: 180, objectFit: "cover" }}
                />
                <div style={{ padding: "0.875rem" }}>
                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {item.title}
                  </div>
                  {item.description && (
                    <div
                      style={{
                        fontSize: "0.8125rem",
                        color: "var(--ink-4)",
                        marginBottom: "0.625rem",
                      }}
                    >
                      {item.description}
                    </div>
                  )}
                  <button
                    className={`${ui.btn} ${ui.btnDanger} ${ui.btnSm}`}
                    onClick={() => handleDelete(item.id)}
                    disabled={deletingId === item.id}
                  >
                    {deletingId === item.id ? "Deleting..." : "🗑 Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
