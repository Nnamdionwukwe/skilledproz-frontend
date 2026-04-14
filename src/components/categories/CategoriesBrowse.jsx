import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./CategoriesBrowse.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import { useAuthStore } from "../../store/authStore";

export default function CategoriesBrowse() {
  const { user } = useAuthStore();

  const backDestination =
    user?.role === "WORKER"
      ? "/dashboard/worker"
      : user?.role === "HIRER"
        ? "/dashboard/hirer"
        : "/landingpage"; // Default for Guests

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");

  function loadCategories() {
    api
      .get("/categories?limit=500")
      .then((res) => {
        const data = res.data.data;
        setCategories(Array.isArray(data) ? data : data?.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCategories();
  }, []);

  const filtered = categories.filter(
    (c) => !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleSuggest(e) {
    e.preventDefault();
    if (!suggestName.trim()) return;
    setSuggesting(true);
    setSuggestMsg("");
    try {
      const res = await api.post("/categories/suggest", {
        name: suggestName.trim(),
      });
      const { category, alreadyExists } = res.data.data;
      if (!alreadyExists) {
        setCategories((prev) => [...prev, category]);
      }
      setSuggestMsg(
        alreadyExists
          ? `"${category.name}" already exists.`
          : `✅ "${category.name}" added to the platform!`,
      );
      setSuggestName("");
      setShowSuggest(false);
    } catch (err) {
      setSuggestMsg("Failed to add category. Try again.");
    } finally {
      setSuggesting(false);
      setTimeout(() => setSuggestMsg(""), 5000);
    }
  }

  return (
    <>
      <div className={styles.page}>
        <Link to={backDestination} className={styles.backBtn}>
          ← Back
        </Link>
        <div className={styles.header}>
          <h1 className={styles.title}>Browse Categories</h1>
          <p className={styles.sub}>
            {categories.length > 0
              ? `${categories.length}+ categories`
              : "All categories"}{" "}
            — search or add yours
          </p>
        </div>

        {/* Search + suggest row */}
        <div className={styles.controlRow}>
          <input
            className={styles.searchInput}
            placeholder="🔍 Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!showSuggest ? (
            <button
              className={styles.suggestTrigger}
              onClick={() => setShowSuggest(true)}
            >
              + Add Category
            </button>
          ) : (
            <form onSubmit={handleSuggest} className={styles.suggestForm}>
              <input
                autoFocus
                className={styles.suggestInput}
                placeholder="e.g. Drone Operator, Solar Engineer..."
                value={suggestName}
                onChange={(e) => setSuggestName(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setShowSuggest(false)}
              />
              <button
                type="submit"
                className={styles.suggestBtn}
                disabled={suggesting || !suggestName.trim()}
              >
                {suggesting ? "Adding..." : "Add"}
              </button>
              <button
                type="button"
                className={styles.suggestCancel}
                onClick={() => {
                  setShowSuggest(false);
                  setSuggestName("");
                }}
              >
                Cancel
              </button>
            </form>
          )}
        </div>

        {suggestMsg && (
          <div
            className={`${styles.suggestMsg} ${suggestMsg.startsWith("✅") ? styles.suggestMsgOk : styles.suggestMsgErr}`}
          >
            {suggestMsg}
          </div>
        )}

        {loading ? (
          <div className={styles.grid}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className={styles.skeleton} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>
            <p>No categories found{search ? ` for "${search}"` : ""}.</p>
            {search && (
              <button
                className={styles.suggestTrigger}
                onClick={() => {
                  setSuggestName(search);
                  setShowSuggest(true);
                  setSearch("");
                }}
              >
                + Add "{search}" as a new category
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className={styles.card}
              >
                {cat.icon && <span className={styles.icon}>{cat.icon}</span>}
                <h3 className={styles.name}>{cat.name}</h3>
                <p className={styles.count}>
                  {cat._count?.workers || 0} workers
                </p>
                {cat.isUserSubmitted && (
                  <span className={styles.userTag}>Community</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
