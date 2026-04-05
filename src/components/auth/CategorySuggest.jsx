import { useState } from "react";
import api from "../../lib/api";
import styles from "./CategorySuggest.module.css";

export default function CategorySuggest({ onSelect, selected = [] }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");

  const search = async (q) => {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get(
        `/categories?search=${encodeURIComponent(q)}&limit=10`,
      );
      setResults(res.data.data.categories || []);
    } catch {}
    setLoading(false);
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    setAdding(true);
    setMessage("");
    try {
      const res = await api.post("/categories/suggest", { name: customName });
      const cat = res.data.data.category;
      onSelect?.(cat);
      setMessage(
        res.data.data.alreadyExists
          ? `"${cat.name}" already exists and was selected.`
          : `"${cat.name}" was added and selected!`,
      );
      setCustomName("");
    } catch {
      setMessage("Failed to add category.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {/* Search */}
      <div className={styles.searchWrap}>
        <input
          className={styles.searchInput}
          placeholder="Search for your trade or profession..."
          value={query}
          onChange={(e) => search(e.target.value)}
        />
        {loading && <span className={styles.searchSpinner} />}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.resultItem} ${selected.find((s) => s.id === cat.id) ? styles.resultSelected : ""}`}
              onClick={() => {
                onSelect?.(cat);
                setResults([]);
                setQuery("");
              }}
            >
              <span>{cat.icon || "🔧"}</span>
              <span>{cat.name}</span>
              {selected.find((s) => s.id === cat.id) && (
                <span className={styles.checkmark}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected */}
      {selected.length > 0 && (
        <div className={styles.selectedChips}>
          {selected.map((cat) => (
            <span key={cat.id} className={styles.chip}>
              {cat.icon} {cat.name}
            </span>
          ))}
        </div>
      )}

      {/* Custom add */}
      <div className={styles.customSection}>
        <p className={styles.customLabel}>
          Can't find your profession? Add it:
        </p>
        <div className={styles.customRow}>
          <input
            className={styles.customInput}
            placeholder="e.g. Drone Racing Instructor"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
          />
          <button
            className={styles.customBtn}
            onClick={handleAddCustom}
            disabled={!customName.trim() || adding}
          >
            {adding ? "Adding..." : "+ Add"}
          </button>
        </div>
        {message && <p className={styles.customMsg}>{message}</p>}
      </div>
    </div>
  );
}
