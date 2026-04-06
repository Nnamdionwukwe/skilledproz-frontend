import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import styles from "./CategorySuggest.module.css";

const POPULAR = [
  "Electrician",
  "Plumber",
  "Carpenter",
  "Cleaner",
  "Driver",
  "Web Developer",
  "Photographer",
  "Nurse",
  "Teacher",
  "Mechanic",
  "Chef",
  "Security Guard",
  "Accountant",
  "Lawyer",
  "Graphic Designer",
];

export default function CategorySuggest({
  onSelect,
  selected = [],
  placeholder = "Search trades, professions...",
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const wrapRef = useRef(null);

  // Load all categories on mount for the browser
  useEffect(() => {
    api
      .get("/categories?limit=500")
      .then((res) => setAllCategories(res.data.data.categories || []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    const fn = (e) => {
      if (!wrapRef.current?.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // Search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      const filtered = allCategories
        .filter(
          (c) =>
            c.name.toLowerCase().includes(query.toLowerCase()) ||
            c.description?.toLowerCase().includes(query.toLowerCase()),
        )
        .slice(0, 12);
      setResults(filtered);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [query, allCategories]);

  const isSelected = (cat) => selected.some((s) => s.id === cat.id);

  const handleSelect = (cat) => {
    if (!isSelected(cat)) onSelect?.(cat);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  };

  const handleAddCustom = async () => {
    if (!customName.trim()) return;
    setAdding(true);
    setMessage("");
    try {
      const res = await api.post("/categories/suggest", { name: customName });
      const cat = res.data.data.category;
      handleSelect(cat);
      setMessage(
        res.data.data.alreadyExists
          ? `"${cat.name}" already exists — added!`
          : `"${cat.name}" added to the platform!`,
      );
      setCustomName("");
      // Add to local list
      setAllCategories((prev) => {
        if (prev.find((c) => c.id === cat.id)) return prev;
        return [...prev, cat];
      });
    } catch {
      setMessage("Failed to add. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  // Show popular categories when focused but no query
  const displayList =
    query.length >= 2
      ? results
      : allCategories
          .filter((c) =>
            POPULAR.some((p) => c.name.toLowerCase().includes(p.toLowerCase())),
          )
          .slice(0, 10);

  return (
    <div className={styles.wrap} ref={wrapRef}>
      {/* Search input */}
      <div className={styles.searchWrap}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          className={styles.searchInput}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
        {loading && <span className={styles.searchSpinner} />}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className={styles.dropdown}>
          {!query && (
            <div className={styles.dropdownHeader}>
              <span>Popular categories</span>
              <span className={styles.totalCount}>
                {allCategories.length} total
              </span>
            </div>
          )}

          {query.length >= 2 && results.length === 0 && !loading && (
            <div className={styles.noResults}>
              <span>No results for "{query}"</span>
              <button
                className={styles.addCustomInline}
                onClick={() => {
                  setCustomName(query);
                  setShowCustom(true);
                  setShowDropdown(false);
                }}
              >
                + Add "{query}" as new category
              </button>
            </div>
          )}

          <div className={styles.resultsList}>
            {displayList.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.resultItem} ${isSelected(cat) ? styles.resultSelected : ""}`}
                onClick={() => handleSelect(cat)}
              >
                <span className={styles.resultIcon}>{cat.icon || "🔧"}</span>
                <div className={styles.resultInfo}>
                  <span className={styles.resultName}>{cat.name}</span>
                  {cat._count?.workers > 0 && (
                    <span className={styles.resultCount}>
                      {cat._count.workers} workers
                    </span>
                  )}
                </div>
                {isSelected(cat) && <span className={styles.checkmark}>✓</span>}
              </button>
            ))}
          </div>

          {/* Custom add inside dropdown */}
          <div className={styles.dropdownFooter}>
            <button
              className={styles.addCustomTrigger}
              onClick={() => {
                setShowCustom(!showCustom);
                setShowDropdown(false);
              }}
            >
              + Can't find your profession? Add it
            </button>
          </div>
        </div>
      )}

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className={styles.selectedChips}>
          {selected.map((cat) => (
            <span key={cat.id} className={styles.chip}>
              <span>{cat.icon || "🔧"}</span>
              <span>{cat.name}</span>
            </span>
          ))}
        </div>
      )}

      {/* Custom add form */}
      {showCustom && (
        <div className={styles.customSection}>
          <p className={styles.customLabel}>
            Add your profession to the platform:
          </p>
          <div className={styles.customRow}>
            <input
              className={styles.customInput}
              placeholder="e.g. Drone Racing Instructor"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCustom()}
              autoFocus
            />
            <button
              className={styles.customBtn}
              onClick={handleAddCustom}
              disabled={!customName.trim() || adding}
            >
              {adding ? "Adding..." : "+ Add"}
            </button>
            <button
              className={styles.customCancel}
              onClick={() => setShowCustom(false)}
            >
              ×
            </button>
          </div>
          {message && <p className={styles.customMsg}>{message}</p>}
        </div>
      )}
    </div>
  );
}
