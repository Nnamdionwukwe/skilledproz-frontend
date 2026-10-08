import { useState, useEffect, useRef } from "react";
import api from "../../lib/api";
import styles from "./CategorySuggest.module.css";

// Curated list of "popular" categories to surface at the top of the
// dropdown when no search is typed. Everything else is still available
// via search.
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
  const [allCategories, setAllCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [customName, setCustomName] = useState("");
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const wrapRef = useRef(null);

  // ── Load ALL platform categories on mount ────────────────────────────
  // `all=true` tells the backend to bypass its default 200-item pagination
  // cap, so the worker can browse every category (~1200).
  useEffect(() => {
    api
      .get("/categories?all=true")
      .then((res) => {
        const data = res.data.data;
        const list = Array.isArray(data) ? data : data?.categories || [];
        setAllCategories(list);
      })
      .catch(() => setAllCategories([]))
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    const fn = (e) => {
      if (!wrapRef.current?.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  // ── Compute what to render in the dropdown ───────────────────────────
  // Two modes:
  //   • Query ≥ 2 chars → filter ALL categories by name/description,
  //     cap at 100 so the dropdown stays usable on mobile.
  //   • Empty query     → show "popular" categories first (curated list),
  //     then everything else, sorted alphabetically. No cap — the whole
  //     list is browsable by scrolling.
  const trimmedQuery = query.trim().toLowerCase();

  const filteredCategories = trimmedQuery
    ? allCategories.filter(
        (c) =>
          c.name.toLowerCase().includes(trimmedQuery) ||
          c.description?.toLowerCase().includes(trimmedQuery),
      )
    : null; // null means "no search active"

  const popularSet = new Set(POPULAR.map((p) => p.toLowerCase()));
  const popularCats = allCategories.filter((c) =>
    popularSet.has(c.name.toLowerCase()),
  );
  const otherCats = allCategories
    .filter((c) => !popularSet.has(c.name.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  // What actually shows in the dropdown:
  const displayList = filteredCategories
    ? filteredCategories.slice(0, 100) // search mode: cap at 100 matches
    : [...popularCats, ...otherCats]; // browse mode: everything

  const isSearchMode = trimmedQuery.length >= 2;
  const totalMatches = filteredCategories?.length ?? 0;

  const isSelected = (cat) => selected.some((s) => s.id === cat.id);

  const handleSelect = (cat) => {
    if (!isSelected(cat)) onSelect?.(cat);
    setQuery("");
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
          {/* Header — differs by mode */}
          <div className={styles.dropdownHeader}>
            {isSearchMode ? (
              <>
                <span>
                  {totalMatches} result{totalMatches === 1 ? "" : "s"} for "
                  {query.trim()}"
                </span>
                {totalMatches > 100 && (
                  <span className={styles.totalCount}>showing first 100</span>
                )}
              </>
            ) : (
              <>
                <span>Browse all categories</span>
                <span className={styles.totalCount}>
                  {allCategories.length} total
                </span>
              </>
            )}
          </div>

          {/* Empty state when searching with no matches */}
          {isSearchMode && displayList.length === 0 && !loading && (
            <div className={styles.noResults}>
              <span>No results for "{query.trim()}"</span>
              <button
                className={styles.addCustomInline}
                onClick={() => {
                  setCustomName(query.trim());
                  setShowCustom(true);
                  setShowDropdown(false);
                }}
              >
                + Add "{query.trim()}" as new category
              </button>
            </div>
          )}

          {/* Results list */}
          <div className={styles.resultsList}>
            {displayList.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.resultItem} ${
                  isSelected(cat) ? styles.resultSelected : ""
                }`}
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

          {/* Footer */}
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
