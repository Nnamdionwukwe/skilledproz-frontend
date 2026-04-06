import { useState, useEffect } from "react";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import CategorySuggest from "../../../components/auth/CategorySuggest";
import styles from "./Categories.module.css";

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/workers/${user.id}`);
      const wcs = res.data.data?.worker?.categories || [];
      setCategories(wcs);
      setSelected(wcs.map((wc) => wc.category));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleSelect = async (cat) => {
    if (
      categories.find(
        (wc) => wc.category?.id === cat.id || wc.categoryId === cat.id,
      )
    ) {
      setError(`${cat.name} is already in your list.`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSaving(cat.id);
    setError("");
    setSuccess("");
    try {
      await api.post("/workers/categories", {
        categoryId: cat.id,
        isPrimary: categories.length === 0,
      });
      await load();
      setSuccess(`${cat.name} added successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add category.");
    } finally {
      setSaving(null);
    }
  };

  const handleRemove = async (categoryId, name) => {
    if (!confirm(`Remove "${name}" from your categories?`)) return;
    setRemoving(categoryId);
    setError("");
    setSuccess("");
    try {
      await api.delete(`/workers/categories/${categoryId}`);
      await load();
      setSuccess(`${name} removed.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("Failed to remove category.");
    } finally {
      setRemoving(null);
    }
  };

  const handleSetPrimary = async (categoryId) => {
    try {
      await api.post("/workers/categories", { categoryId, isPrimary: true });
      await load();
    } catch {}
  };

  return (
    <WorkerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Trade Categories</h1>
          <p className={styles.sub}>
            Add the trades and professions you offer. Search from{" "}
            <strong>800+ categories</strong> or add your own.
          </p>
        </div>

        {error && <div className={styles.errorBox}>⚠️ {error}</div>}
        {success && <div className={styles.successBox}>✅ {success}</div>}

        {/* Category picker */}
        <div className={styles.pickerCard}>
          <h2 className={styles.cardTitle}>Add a Category</h2>
          <p className={styles.cardSub}>
            Search for your trade — it's already in our database.
          </p>
          <CategorySuggest
            onSelect={handleSelect}
            selected={selected}
            placeholder="Search plumber, electrician, developer..."
          />
          {saving && <p className={styles.savingMsg}>Adding category...</p>}
        </div>

        {/* Current categories */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <h2 className={styles.cardTitle}>My Categories</h2>
            <span className={styles.countBadge}>{categories.length}</span>
          </div>

          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)
          ) : categories.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>🔧</span>
              <p className={styles.emptyTitle}>No categories yet</p>
              <p className={styles.emptySub}>
                Search and add your trade above to appear in search results
              </p>
            </div>
          ) : (
            <div className={styles.catList}>
              {categories.map((wc) => {
                const cat = wc.category || wc;
                const catId = wc.categoryId || cat.id;
                return (
                  <div
                    key={wc.id || catId}
                    className={`${styles.catRow} ${wc.isPrimary ? styles.catRowPrimary : ""}`}
                  >
                    <div className={styles.catLeft}>
                      <span className={styles.catIcon}>
                        {cat?.icon || "🔧"}
                      </span>
                      <div>
                        <p className={styles.catName}>{cat?.name}</p>
                        <p className={styles.catSlug}>{cat?.slug}</p>
                      </div>
                    </div>
                    <div className={styles.catRight}>
                      {wc.isPrimary ? (
                        <span className={styles.primaryBadge}>⭐ Primary</span>
                      ) : (
                        <button
                          className={styles.setPrimaryBtn}
                          onClick={() => handleSetPrimary(catId)}
                        >
                          Set Primary
                        </button>
                      )}
                      <button
                        className={styles.removeBtn}
                        disabled={removing === catId}
                        onClick={() => handleRemove(catId, cat?.name)}
                      >
                        {removing === catId ? "..." : "✕"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </WorkerLayout>
  );
}
