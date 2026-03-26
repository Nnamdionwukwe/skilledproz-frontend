import { useState, useEffect, useRef, useCallback } from "react";
import styles from "./SearchPage.module.css";
import api from "../../lib/api";

const CURRENCIES = ["USD", "NGN", "GBP", "EUR", "GHS", "KES", "ZAR", "INR"];
const RATINGS = [
  { label: "4★ & above", value: 4 },
  { label: "3★ & above", value: 3 },
  { label: "Any rating", value: "" },
];

export default function SearchPage() {
  // URL params
  const params = new URLSearchParams(window.location.search);
  const initQuery = params.get("q") || "";
  const initCat = params.get("category") || "";
  const initCity = params.get("city") || "";

  const [query, setQuery] = useState(initQuery);
  const [input, setInput] = useState(initQuery);
  const [workers, setWorkers] = useState([]);
  const [trending, setTrending] = useState({
    categories: [],
    topWorkers: [],
    recentlyJoined: [],
  });
  const [filters, setFilters] = useState({
    category: initCat,
    city: initCity,
    country: "",
    minRate: "",
    maxRate: "",
    rating: "",
    available: "true",
  });
  const [filterMeta, setFilterMeta] = useState({
    categories: [],
    locations: [],
    rateRange: { min: 0, max: 500 },
  });
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState(initQuery ? "results" : "trending");
  const [showFilters, setShowFilters] = useState(false);
  const [locating, setLocating] = useState(false);
  const [nearbyWorkers, setNearbyWorkers] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const sugRef = useRef(null);

  // Close suggestions on outside click
  useEffect(() => {
    function handler(e) {
      if (sugRef.current && !sugRef.current.contains(e.target))
        setSuggestions(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Load filter metadata + trending on mount
  useEffect(() => {
    api
      .get("/search/filters")
      .then((res) => setFilterMeta(res.data.data || {}));
    api.get("/search/trending").then((res) => setTrending(res.data.data || {}));
    if (initQuery) doSearch(initQuery, filters, 1);
  }, []);

  // Suggestions on keystroke
  useEffect(() => {
    if (input.length < 2) {
      setSuggestions(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .get("/search", { params: { q: input, type: "suggest" } })
        .then((res) => setSuggestions(res.data.data.suggestions))
        .catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [input]);

  async function doSearch(q, f, p) {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    setTab("results");
    try {
      const res = await api.get("/search", {
        params: {
          q,
          type: "workers",
          page: p,
          limit: 12,
          ...(f.category && { category: f.category }),
          ...(f.city && { city: f.city }),
          ...(f.country && { country: f.country }),
          ...(f.minRate && { minRate: f.minRate }),
          ...(f.maxRate && { maxRate: f.maxRate }),
          ...(f.rating && { rating: f.rating }),
          ...(f.available && { available: f.available }),
        },
      });
      setWorkers(res.data.data.workers?.data || []);
      setTotal(res.data.data.workers?.total || 0);
      setPages(res.data.data.workers?.pages || 1);
    } catch {
      setWorkers([]);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e) {
    e?.preventDefault();
    setSuggestions(null);
    setPage(1);
    setQuery(input);
    doSearch(input, filters, 1);
    window.history.replaceState({}, "", `?q=${encodeURIComponent(input)}`);
  }

  function applyFilter(key, val) {
    const next = { ...filters, [key]: val };
    setFilters(next);
    setPage(1);
    if (query) doSearch(query, next, 1);
  }

  function clearFilters() {
    const def = {
      category: "",
      city: "",
      country: "",
      minRate: "",
      maxRate: "",
      rating: "",
      available: "true",
    };
    setFilters(def);
    setPage(1);
    if (query) doSearch(query, def, 1);
  }

  function changePage(p) {
    setPage(p);
    doSearch(query, filters, p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function findNearby() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setNearbyLoading(true);
    setTab("nearby");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await api.get("/search/nearby", {
            params: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              radius: 25,
              ...(filters.category && { category: filters.category }),
            },
          });
          setNearbyWorkers(res.data.data.workers || []);
        } catch {
          setNearbyWorkers([]);
        } finally {
          setLocating(false);
          setNearbyLoading(false);
        }
      },
      () => {
        setLocating(false);
        setNearbyLoading(false);
      },
    );
  }

  const activeFiltersCount = Object.entries(filters).filter(
    ([k, v]) => v && !(k === "available" && v === "true"),
  ).length;

  return (
    <div className={styles.page}>
      {/* ── Search bar ── */}
      <div className={styles.searchWrap} ref={sugRef}>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search plumbers, electricians, cleaners..."
            autoComplete="off"
          />
          {input && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setInput("");
                setSuggestions(null);
              }}
            >
              ×
            </button>
          )}
          <button
            type="button"
            className={styles.nearbyBtn}
            onClick={findNearby}
            title="Find nearby workers"
          >
            {locating ? <span className={styles.spinner} /> : "📍"}
          </button>
          <button type="submit" className={styles.searchSubmit}>
            Search
          </button>
        </form>

        {/* Suggestions dropdown */}
        {suggestions && (
          <div className={styles.suggestions}>
            {suggestions.categories?.length > 0 && (
              <div className={styles.sugGroup}>
                <p className={styles.sugLabel}>Categories</p>
                {suggestions.categories.map((c) => (
                  <button
                    key={c.slug}
                    className={styles.sugItem}
                    onClick={() => {
                      setInput(c.name);
                      applyFilter("category", c.slug);
                      setSuggestions(null);
                      handleSearch();
                    }}
                  >
                    <span>{c.icon || "🔧"}</span> {c.name}
                  </button>
                ))}
              </div>
            )}
            {suggestions.workers?.length > 0 && (
              <div className={styles.sugGroup}>
                <p className={styles.sugLabel}>Workers</p>
                {suggestions.workers.map((w) => (
                  <a
                    key={w.id}
                    href={`/workers/${w.id}`}
                    className={styles.sugItem}
                  >
                    <div className={styles.sugAvatar}>
                      {w.avatar ? (
                        <img src={w.avatar} alt="" />
                      ) : (
                        <span>
                          {w.firstName?.[0]}
                          {w.lastName?.[0]}
                        </span>
                      )}
                    </div>
                    <span>
                      {w.firstName} {w.lastName}
                    </span>
                    <span className={styles.sugSub}>
                      {w.workerProfile?.title}
                    </span>
                  </a>
                ))}
              </div>
            )}
            {suggestions.cities?.length > 0 && (
              <div className={styles.sugGroup}>
                <p className={styles.sugLabel}>Cities</p>
                {suggestions.cities.map((c, i) => (
                  <button
                    key={i}
                    className={styles.sugItem}
                    onClick={() => {
                      setInput(c.city);
                      applyFilter("city", c.city);
                      setSuggestions(null);
                    }}
                  >
                    📍 {c.city}, {c.country}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.layout}>
        {/* ── Filters sidebar ── */}
        <aside
          className={`${styles.filterSidebar} ${showFilters ? styles.filterSidebarOpen : ""}`}
        >
          <div className={styles.filterHeader}>
            <p className={styles.filterTitle}>
              Filters{" "}
              {activeFiltersCount > 0 && (
                <span className={styles.filterCount}>{activeFiltersCount}</span>
              )}
            </p>
            {activeFiltersCount > 0 && (
              <button className={styles.clearFiltersBtn} onClick={clearFilters}>
                Clear all
              </button>
            )}
          </div>

          {/* Availability toggle */}
          <FilterSection title="Availability">
            <label className={styles.toggle}>
              <input
                type="checkbox"
                checked={filters.available === "true"}
                onChange={(e) =>
                  applyFilter("available", e.target.checked ? "true" : "false")
                }
              />
              <span className={styles.toggleSlider} />
              <span className={styles.toggleLabel}>Available only</span>
            </label>
          </FilterSection>

          {/* Category */}
          <FilterSection title="Category">
            <select
              className={styles.filterSelect}
              value={filters.category}
              onChange={(e) => applyFilter("category", e.target.value)}
            >
              <option value="">All categories</option>
              {filterMeta.categories?.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterSection>

          {/* Location */}
          <FilterSection title="City">
            <input
              className={styles.filterInput}
              placeholder="e.g. Lagos"
              value={filters.city}
              onChange={(e) => applyFilter("city", e.target.value)}
            />
          </FilterSection>

          {/* Rate range */}
          <FilterSection title="Hourly Rate">
            <div className={styles.rateInputs}>
              <input
                className={styles.filterInput}
                type="number"
                placeholder={`Min (${filterMeta.rateRange?.min || 0})`}
                value={filters.minRate}
                onChange={(e) => applyFilter("minRate", e.target.value)}
              />
              <span className={styles.rateSep}>–</span>
              <input
                className={styles.filterInput}
                type="number"
                placeholder={`Max (${filterMeta.rateRange?.max || 500})`}
                value={filters.maxRate}
                onChange={(e) => applyFilter("maxRate", e.target.value)}
              />
            </div>
          </FilterSection>

          {/* Rating */}
          <FilterSection title="Minimum Rating">
            <div className={styles.ratingOptions}>
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  className={`${styles.ratingOpt} ${filters.rating == r.value ? styles.ratingOptActive : ""}`}
                  onClick={() => applyFilter("rating", r.value)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </FilterSection>
        </aside>

        {/* ── Main content ── */}
        <div className={styles.mainContent}>
          {/* Tab bar */}
          <div className={styles.tabBar}>
            <div className={styles.tabs}>
              {[
                { key: "trending", label: "Trending" },
                {
                  key: "results",
                  label: `Results${total > 0 ? ` (${total})` : ""}`,
                },
                { key: "nearby", label: "Nearby" },
              ].map((t) => (
                <button
                  key={t.key}
                  className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button
              className={styles.mobileFilterBtn}
              onClick={() => setShowFilters((s) => !s)}
            >
              🔧 Filters{" "}
              {activeFiltersCount > 0 && (
                <span className={styles.filterCount}>{activeFiltersCount}</span>
              )}
            </button>
          </div>

          {/* ── TRENDING ── */}
          {tab === "trending" && (
            <div className={styles.trendingWrap}>
              {/* Categories */}
              {trending.categories?.length > 0 && (
                <section className={styles.trendSection}>
                  <h2 className={styles.trendTitle}>Popular Categories</h2>
                  <div className={styles.catGrid}>
                    {trending.categories.map((c) => (
                      <button
                        key={c.id}
                        className={styles.catCard}
                        onClick={() => {
                          applyFilter("category", c.slug);
                          setTab("results");
                        }}
                      >
                        <span className={styles.catIcon}>{c.icon || "🔧"}</span>
                        <span className={styles.catName}>{c.name}</span>
                        <span className={styles.catCount}>
                          {c._count?.workers || 0} workers
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Top rated */}
              {trending.topWorkers?.length > 0 && (
                <section className={styles.trendSection}>
                  <h2 className={styles.trendTitle}>Top Rated Workers</h2>
                  <div className={styles.workerGrid}>
                    {trending.topWorkers.map((w, i) => (
                      <WorkerCard key={w.user?.id || i} worker={w} />
                    ))}
                  </div>
                </section>
              )}

              {/* Recently joined */}
              {trending.recentlyJoined?.length > 0 && (
                <section className={styles.trendSection}>
                  <h2 className={styles.trendTitle}>New on SkilledProz</h2>
                  <div className={styles.workerGrid}>
                    {trending.recentlyJoined.map((w, i) => (
                      <WorkerCard key={w.user?.id || i} worker={w} isNew />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}

          {/* ── RESULTS ── */}
          {tab === "results" && (
            <>
              {!query ? (
                <div className={styles.promptSearch}>
                  <span className={styles.promptIcon}>🔍</span>
                  <p className={styles.promptTitle}>
                    Search for a skilled worker
                  </p>
                  <p className={styles.promptText}>
                    Try "plumber Lagos", "electrician", or "house cleaning"
                  </p>
                </div>
              ) : loading ? (
                <div className={styles.workerGrid}>
                  {[...Array(6)].map((_, i) => (
                    <WorkerSkeleton key={i} />
                  ))}
                </div>
              ) : workers.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>😕</span>
                  <p className={styles.emptyTitle}>
                    No workers found for "{query}"
                  </p>
                  <p className={styles.emptyText}>
                    Try different keywords or adjust your filters.
                  </p>
                  <button className={styles.emptyBtn} onClick={clearFilters}>
                    Clear Filters
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.resultsMeta}>
                    {total} worker{total !== 1 ? "s" : ""} found for "{query}"
                  </p>
                  <div className={styles.workerGrid}>
                    {workers.map((w, i) => (
                      <WorkerCard
                        key={w.user?.id || i}
                        worker={w}
                        delay={i * 0.04}
                      />
                    ))}
                  </div>
                  {pages > 1 && (
                    <div className={styles.pager}>
                      <button
                        className={styles.pageBtn}
                        disabled={page === 1}
                        onClick={() => changePage(page - 1)}
                      >
                        ← Prev
                      </button>
                      <span className={styles.pageInfo}>
                        {page} / {pages}
                      </span>
                      <button
                        className={styles.pageBtn}
                        disabled={page === pages}
                        onClick={() => changePage(page + 1)}
                      >
                        Next →
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {/* ── NEARBY ── */}
          {tab === "nearby" && (
            <>
              {nearbyLoading ? (
                <div className={styles.workerGrid}>
                  {[...Array(4)].map((_, i) => (
                    <WorkerSkeleton key={i} />
                  ))}
                </div>
              ) : nearbyWorkers.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>📍</span>
                  <p className={styles.emptyTitle}>No nearby workers found</p>
                  <p className={styles.emptyText}>
                    Allow location access and tap the 📍 button to find workers
                    near you.
                  </p>
                  <button className={styles.emptyBtn} onClick={findNearby}>
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <p className={styles.resultsMeta}>
                    {nearbyWorkers.length} worker
                    {nearbyWorkers.length !== 1 ? "s" : ""} within 25 km
                  </p>
                  <div className={styles.workerGrid}>
                    {nearbyWorkers.map((w, i) => (
                      <WorkerCard
                        key={w.user?.id || i}
                        worker={w}
                        delay={i * 0.04}
                        showDistance
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Worker card ───────────────────────────────────────────────
function WorkerCard({
  worker,
  delay = 0,
  isNew = false,
  showDistance = false,
}) {
  const {
    user,
    categories,
    hourlyRate,
    currency,
    avgRating,
    totalReviews,
    completedJobs,
    isAvailable,
    distanceKm,
  } = worker;
  const primaryCat = categories?.find((c) => c.isPrimary) || categories?.[0];

  return (
    <a
      href={`/workers/${user?.id}`}
      className={styles.workerCard}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Card top */}
      <div className={styles.wcTop}>
        <div className={styles.wcAvatar}>
          {user?.avatar ? (
            <img src={user.avatar} alt="" />
          ) : (
            <span>
              {user?.firstName?.[0]}
              {user?.lastName?.[0]}
            </span>
          )}
          {isAvailable && <span className={styles.wcOnline} />}
        </div>
        <div className={styles.wcBadges}>
          {isNew && <span className={styles.newBadge}>New</span>}
          {showDistance && distanceKm !== undefined && (
            <span className={styles.distBadge}>📍 {distanceKm} km</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className={styles.wcInfo}>
        <p className={styles.wcName}>
          {user?.firstName} {user?.lastName}
        </p>
        {worker.title && <p className={styles.wcTitle}>{worker.title}</p>}
        {primaryCat && (
          <span className={styles.wcCat}>
            {primaryCat.category?.icon} {primaryCat.category?.name}
          </span>
        )}
      </div>

      {/* Location */}
      {(user?.city || user?.country) && (
        <p className={styles.wcLocation}>
          📍 {[user.city, user.country].filter(Boolean).join(", ")}
        </p>
      )}

      {/* Stats */}
      <div className={styles.wcStats}>
        <span className={styles.wcRating}>
          ★ {avgRating > 0 ? avgRating.toFixed(1) : "New"}
          <span className={styles.wcReviews}> ({totalReviews})</span>
        </span>
        <span className={styles.wcJobs}>{completedJobs} jobs</span>
      </div>

      {/* Footer */}
      <div className={styles.wcFooter}>
        <span className={styles.wcRate}>
          {currency} {hourlyRate?.toLocaleString()}
          <span className={styles.wcRateUnit}>/hr</span>
        </span>
        <span
          className={`${styles.wcAvail} ${isAvailable ? styles.wcAvailOn : styles.wcAvailOff}`}
        >
          {isAvailable ? "Available" : "Busy"}
        </span>
      </div>
    </a>
  );
}

function FilterSection({ title, children }) {
  return (
    <div className={styles.filterSection}>
      <p className={styles.filterSectionTitle}>{title}</p>
      {children}
    </div>
  );
}

function WorkerSkeleton() {
  return <div className={styles.workerSkeleton} />;
}
