import { useEffect, useState } from "react";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import ui from "../../../components/ui/ui.module.css";

export default function CategoriesPage() {
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
  const categories = data?.worker?.categories || [];

  const [categoryId, setCategoryId] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!categoryId.trim()) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.post("/workers/categories", { categoryId, isPrimary });
      setCategoryId("");
      setIsPrimary(false);
      setMsg({ type: "success", text: "Category added!" });
      refetch();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <WorkerLayout>
      <div
        style={{
          maxWidth: 640,
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div className={ui.card}>
          <div className={ui.cardTitle} style={{ marginBottom: "0.375rem" }}>
            Add Trade Category
          </div>
          <p
            style={{
              fontSize: "0.875rem",
              color: "var(--ink-4)",
              marginBottom: "1.25rem",
            }}
          >
            Add the trades you are skilled in. You can mark one as your primary
            trade.
          </p>

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

          <form onSubmit={handleAdd}>
            <div className={ui.inputGroup}>
              <label className={ui.label}>Category ID</label>
              <input
                className={ui.input}
                placeholder="Enter category ID from the platform"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              />
              <span style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}>
                Get category IDs from{" "}
                <a href="/categories" style={{ color: "var(--brand)" }}>
                  the categories page
                </a>
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                marginBottom: "1.125rem",
              }}
            >
              <input
                type="checkbox"
                id="isPrimary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                style={{
                  width: 18,
                  height: 18,
                  accentColor: "var(--brand)",
                  cursor: "pointer",
                }}
              />
              <label
                htmlFor="isPrimary"
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Set as my primary trade category
              </label>
            </div>
            <button
              type="submit"
              className={`${ui.btn} ${ui.btnPrimary}`}
              disabled={saving}
            >
              {saving ? "Adding..." : "+ Add Category"}
            </button>
          </form>
        </div>

        <div className={ui.card}>
          <div className={ui.cardTitle} style={{ marginBottom: "1rem" }}>
            My Trade Categories ({categories.length})
          </div>
          {loading ? (
            <div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={ui.skeleton}
                  style={{ height: 56, marginBottom: 10 }}
                />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <div className={ui.empty}>
              <div className={ui.emptyIcon}>🔧</div>
              <div className={ui.emptyTitle}>No categories yet</div>
              <div className={ui.emptyDesc}>
                Add your trade categories to appear in search results
              </div>
            </div>
          ) : (
            categories.map((wc) => (
              <div
                key={wc.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.875rem",
                  borderRadius: "var(--radius-md)",
                  background: wc.isPrimary
                    ? "var(--brand-light)"
                    : "var(--surface-2)",
                  border: `1px solid ${wc.isPrimary ? "var(--brand-border)" : "var(--surface-3)"}`,
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ fontSize: "1.375rem" }}>
                  {wc.category?.icon || "🔧"}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9375rem" }}>
                    {wc.category?.name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--ink-4)" }}>
                    {wc.category?.slug}
                  </div>
                </div>
                {wc.isPrimary && (
                  <span
                    className={`${ui.badge}`}
                    style={{ background: "var(--brand)", color: "#fff" }}
                  >
                    Primary
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
