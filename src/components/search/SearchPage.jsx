import { useState, useEffect, useRef } from "react";
import styles from "./SearchPage.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import VoiceSearch from "./VoiceSearch";
import { ShieldCheck } from "lucide-react";
import useSavedWorker from "../../hooks/useSavedWorker";
import {
  FiSearch,
  FiMapPin,
  FiSliders,
  FiX,
  FiStar,
  FiInfo,
  FiFrown,
  FiArrowLeft,
  FiArrowRight,
  FiTool,
  FiBookmark,
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import tracker from "../../lib/analytics/tracker";

const RATINGS = [
  { label: "4★ & above", value: 4 },
  { label: "3★ & above", value: 3 },
  { label: "Any rating", value: "" },
];

const DISTANCES = [5, 10, 25, 50, 100, 200];

const GENDERS = [
  { label: "Any", value: "" },
  { label: "Male", value: "Male" },
  { label: "Female", value: "Female" },
  { label: "Non-binary", value: "Non-binary" },
];

const VERIFICATIONS = [
  { label: "Any", value: "" },
  { label: "Verified", value: "VERIFIED" },
];

const DEFAULT_FILTERS = {
  category: "",
  city: "",
  country: "",
  minRate: "",
  maxRate: "",
  rating: "",
  available: "true",
  language: "",
  gender: "",
  verification: "",
  radius: "",
  lat: "",
  lng: "",
};

export default function SearchPage() {
  const params = new URLSearchParams(window.location.search);
  const initQuery = params.get("q") || "";

  const [query, setQuery] = useState(initQuery);
  const [input, setInput] = useState(initQuery);
  const [workers, setWorkers] = useState([]);
  const [trending, setTrending] = useState({
    categories: [],
    topWorkers: [],
    recentlyJoined: [],
  });
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterMeta, setFilterMeta] = useState({
    categories: [],
    locations: [],
    rateRange: { min: 0, max: 500 },
    languages: [],
    distances: DISTANCES,
  });
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState(initQuery ? "results" : "trending");
  const [showFilters, setShowFilters] = useState(false);
  const [nearbyWorkers, setNearbyWorkers] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const sugRef = useRef(null);

  // ── ANALYTICS: page view on mount ────────────────────────────────────────
  useEffect(() => {
    tracker.track("page.search.view", {
      hasInitialQuery: !!initQuery,
      initialQueryLength: initQuery.length,
      referrer: document.referrer || null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handler(e) {
      if (sugRef.current && !sugRef.current.contains(e.target))
        setSuggestions(null);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    api
      .get("/search/filters")
      .then((r) => setFilterMeta(r.data.data || {}))
      .catch(() => {});
    api
      .get("/search/trending")
      .then((r) => {
        setTrending(r.data.data || {});
        // ── ANALYTICS: trending data loaded ───────────────────────────────
        tracker.track("search.trending.loaded", {
          categoryCount: r.data.data?.categories?.length || 0,
          topWorkersCount: r.data.data?.topWorkers?.length || 0,
          recentlyJoinedCount: r.data.data?.recentlyJoined?.length || 0,
        });
      })
      .catch(() => {});
    if (initQuery) doSearch(initQuery, DEFAULT_FILTERS, 1);
  }, []);

  useEffect(() => {
    if (input.length < 2) {
      setSuggestions(null);
      return;
    }
    const t = setTimeout(() => {
      api
        .get("/search", { params: { q: input, type: "suggest" } })
        .then((r) => setSuggestions(r.data.data.suggestions))
        .catch(() => {});
    }, 280);
    return () => clearTimeout(t);
  }, [input]);

  async function doSearch(q, f, p) {
    if (!q || q.trim().length < 2) return;
    setLoading(true);
    setTab("results");

    // ── ANALYTICS: search submitted ───────────────────────────────────────
    const activeFilterKeys = Object.keys(f).filter(
      (k) =>
        f[k] &&
        !(k === "available" && f[k] === "true") &&
        !["lat", "lng"].includes(k),
    );
    tracker.track("search.executed", {
      queryLength: q.length,
      page: p,
      activeFilterCount: activeFilterKeys.length,
      activeFilterKeys,
    });

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
          ...(f.language && { language: f.language }),
          ...(f.gender && { gender: f.gender }),
          ...(f.verification && { verification: f.verification }),
          ...(f.radius && { radius: f.radius }),
          ...(f.lat && { lat: f.lat }),
          ...(f.lng && { lng: f.lng }),
        },
      });
      const resultCount = res.data.data.workers?.total || 0;
      setWorkers(res.data.data.workers?.data || []);
      setTotal(resultCount);
      setPages(res.data.data.workers?.pages || 1);

      // ── ANALYTICS: search results received ────────────────────────────
      tracker.track("search.results", {
        queryLength: q.length,
        resultCount,
        isZeroResult: resultCount === 0,
        page: p,
      });
    } catch {
      setWorkers([]);
      // ── ANALYTICS: search API error ───────────────────────────────────
      tracker.track("search.failed", {
        queryLength: q.length,
        page: p,
      });
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

    // ── ANALYTICS: filter applied ─────────────────────────────────────────
    tracker.action("search.filter.applied", {
      filterKey: key,
      value: val,
      activeFilterCount: Object.keys(next).filter(
        (k) =>
          next[k] &&
          !(k === "available" && next[k] === "true") &&
          !["lat", "lng"].includes(k),
      ).length,
    });

    if (query) doSearch(query, next, 1);
  }

  function clearFilters() {
    // ── ANALYTICS: filters cleared ────────────────────────────────────────
    tracker.action("search.filters.cleared", {
      previousActiveCount: activeFiltersCount,
      previousFilters: Object.keys(filters).filter(
        (k) =>
          filters[k] &&
          !(k === "available" && filters[k] === "true") &&
          !["lat", "lng"].includes(k),
      ),
    });

    setFilters(DEFAULT_FILTERS);
    setPage(1);
    if (query) doSearch(query, DEFAULT_FILTERS, 1);
  }

  function changePage(p) {
    setPage(p);
    doSearch(query, filters, p);
    window.scrollTo({ top: 0, behavior: "smooth" });

    // ── ANALYTICS: pagination ─────────────────────────────────────────────
    tracker.track("search.pagination", {
      fromPage: page,
      toPage: p,
      direction: p > page ? "next" : "prev",
    });
  }

  async function findNearby() {
    if (!navigator.geolocation) return;
    setLocating(true);
    setNearbyLoading(true);
    setTab("nearby");

    // ── ANALYTICS: nearby search attempted ────────────────────────────────
    tracker.action("search.nearby.attempt");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFilters((f) => ({ ...f, lat: String(lat), lng: String(lng) }));
        try {
          const res = await api.get("/search/nearby", {
            params: {
              lat,
              lng,
              radius: filters.radius || 25,
              ...(filters.category && { category: filters.category }),
              ...(filters.language && { language: filters.language }),
              ...(filters.gender && { gender: filters.gender }),
              ...(filters.verification && {
                verification: filters.verification,
              }),
            },
          });
          const data = res.data.data;
          const workersWithNote = data.workers || [];
          workersWithNote._expansionNote = data.expansionNote || null;
          setNearbyWorkers(workersWithNote);

          // ── ANALYTICS: nearby results received ────────────────────────
          tracker.track("search.nearby.results", {
            workerCount: workersWithNote.length,
            radius: filters.radius || 25,
          });
        } catch {
          setNearbyWorkers([]);
          // ── ANALYTICS: nearby API error ──────────────────────────────
          tracker.track("search.nearby.failed");
        } finally {
          setLocating(false);
          setNearbyLoading(false);
        }
      },
      () => {
        setLocating(false);
        setNearbyLoading(false);
        // ── ANALYTICS: user denied location ───────────────────────────────
        tracker.track("search.nearby.denied");
      },
    );
  }

  const activeFiltersCount = Object.entries(filters).filter(
    ([k, v]) =>
      v && !(k === "available" && v === "true") && !["lat", "lng"].includes(k),
  ).length;

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* Search bar */}
        <div className={styles.searchWrap} ref={sugRef}>
          <form className={styles.searchBar} onSubmit={handleSearch}>
            <span className={styles.searchIcon}>
              <FiSearch size={16} />
            </span>
            <input
              className={styles.searchInput}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search plumbers, electricians, cleaners..."
              autoComplete="off"
              onFocus={() => {
                if (!input) {
                  tracker.track("search.input.focused");
                }
              }}
              data-track-id="search.input"
            />
            {input && (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setInput("");
                  setSuggestions(null);
                  tracker.track("search.input.cleared");
                }}
                aria-label="Clear search"
                data-track-id="search.input.clear"
              >
                <FiX size={18} />
              </button>
            )}
            <VoiceSearch onResult={(t) => setInput(t)} onError={() => {}} />
            <button
              type="button"
              className={styles.nearbyBtn}
              onClick={findNearby}
              title="Find nearby"
              aria-label="Find nearby workers"
              data-track-id="search.nearby.btn"
            >
              {locating ? (
                <span className={styles.spinner} />
              ) : (
                <FiMapPin size={16} />
              )}
            </button>
            <button
              type="submit"
              className={styles.searchSubmit}
              data-track-id="search.submit"
            >
              Search
            </button>
          </form>

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
                        // ── ANALYTICS: suggestion clicked ────────────────
                        tracker.action("search.suggestion.clicked", {
                          type: "category",
                          categorySlug: c.slug,
                          categoryName: c.name,
                        });
                      }}
                      data-track-id={`search.suggestion.category.${c.slug}`}
                    >
                      {c.icon ? <span>{c.icon}</span> : <FiTool size={14} />}
                      <span>{c.name}</span>
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
                      onClick={() =>
                        tracker.action("search.suggestion.clicked", {
                          type: "worker",
                          workerId: w.id,
                          workerTitle: w.workerProfile?.title || null,
                        })
                      }
                      data-track-id={`search.suggestion.worker.${w.id}`}
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
                        // ── ANALYTICS: suggestion clicked ────────────────
                        tracker.action("search.suggestion.clicked", {
                          type: "city",
                          city: c.city,
                          country: c.country,
                        });
                      }}
                      data-track-id={`search.suggestion.city.${c.city}`}
                    >
                      <FiMapPin size={13} /> {c.city}, {c.country}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.layout}>
          {/* Filter sidebar */}
          <>
            {/* Mobile overlay backdrop */}
            {showFilters && (
              <div
                className={styles.filterOverlay}
                onClick={() => setShowFilters(false)}
              />
            )}

            <aside
              className={`${styles.filterSidebar} ${showFilters ? styles.filterSidebarOpen : ""}`}
            >
              <div className={styles.filterHeader}>
                <p className={styles.filterTitle}>
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className={styles.filterCount}>
                      {activeFiltersCount}
                    </span>
                  )}
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  {activeFiltersCount > 0 && (
                    <button
                      className={styles.clearFiltersBtn}
                      onClick={clearFilters}
                      data-track-id="search.filters.clearAll"
                    >
                      Clear all
                    </button>
                  )}
                  {/* Close button mobile */}
                  <button
                    className={styles.filterCloseBtn}
                    onClick={() => setShowFilters(false)}
                    aria-label="Close filters"
                    data-track-id="search.filters.close"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              </div>

              {/* ── AVAILABILITY ── */}
              <FilterSection title="Availability">
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={filters.available === "true"}
                    onChange={(e) =>
                      applyFilter(
                        "available",
                        e.target.checked ? "true" : "false",
                      )
                    }
                    data-track-id="search.filter.available"
                  />
                  <span className={styles.toggleSlider} />
                  <span className={styles.toggleLabel}>Available only</span>
                </label>
              </FilterSection>

              {/* ── CATEGORY ── */}
              <FilterSection title="Category">
                <select
                  className={styles.filterSelect}
                  value={filters.category}
                  onChange={(e) => applyFilter("category", e.target.value)}
                  data-track-id="search.filter.category"
                >
                  <option value="">All categories</option>
                  {filterMeta.categories?.map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </FilterSection>

              {/* ── CITY ── */}
              <FilterSection title="City">
                <input
                  className={styles.filterInput}
                  placeholder="e.g. Lagos"
                  value={filters.city}
                  onChange={(e) => applyFilter("city", e.target.value)}
                  data-track-id="search.filter.city"
                />
              </FilterSection>

              {/* ── RATE RANGE ── */}
              <FilterSection title="Hourly Rate">
                <div className={styles.rateInputs}>
                  <input
                    className={styles.filterInput}
                    type="number"
                    placeholder="Min"
                    value={filters.minRate}
                    onChange={(e) => applyFilter("minRate", e.target.value)}
                    data-track-id="search.filter.minRate"
                  />
                  <span className={styles.rateSep}>–</span>
                  <input
                    className={styles.filterInput}
                    type="number"
                    placeholder="Max"
                    value={filters.maxRate}
                    onChange={(e) => applyFilter("maxRate", e.target.value)}
                    data-track-id="search.filter.maxRate"
                  />
                </div>
              </FilterSection>

              {/* ── RATING ── */}
              <FilterSection title="Minimum Rating">
                <div className={styles.ratingOptions}>
                  {RATINGS.map((r) => (
                    <button
                      key={r.value}
                      className={`${styles.ratingOpt} ${filters.rating == r.value ? styles.ratingOptActive : ""}`}
                      onClick={() => applyFilter("rating", r.value)}
                      data-track-id={`search.filter.rating.${r.value || "any"}`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* ── DISTANCE ── */}
              <FilterSection title="Max Distance">
                <select
                  className={styles.filterSelect}
                  value={filters.radius}
                  onChange={(e) => {
                    applyFilter("radius", e.target.value);
                    if (e.target.value && !filters.lat) findNearby();
                  }}
                  data-track-id="search.filter.radius"
                >
                  <option value="">Any distance</option>
                  {DISTANCES.map((d) => (
                    <option key={d} value={d}>
                      {d} km
                    </option>
                  ))}
                </select>
                {filters.radius && !filters.lat && (
                  <p className={styles.filterHint}>
                    <FiMapPin size={12} /> Allow location for distance filter
                  </p>
                )}
              </FilterSection>

              {/* ── LANGUAGE ── */}
              <FilterSection title="Language">
                <select
                  className={styles.filterSelect}
                  value={filters.language}
                  onChange={(e) => applyFilter("language", e.target.value)}
                  data-track-id="search.filter.language"
                >
                  <option value="">Any language</option>
                  {(filterMeta.languages?.length
                    ? filterMeta.languages
                    : [
                        "English",
                        "French",
                        "Arabic",
                        "Yoruba",
                        "Hausa",
                        "Igbo",
                        "Swahili",
                        "Portuguese",
                      ]
                  ).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </FilterSection>

              {/* ── GENDER ── */}
              <FilterSection title="Gender Preference">
                <div className={styles.ratingOptions}>
                  {GENDERS.map((g) => (
                    <button
                      key={g.value}
                      className={`${styles.ratingOpt} ${filters.gender === g.value ? styles.ratingOptActive : ""}`}
                      onClick={() => applyFilter("gender", g.value)}
                      data-track-id={`search.filter.gender.${g.value || "any"}`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </FilterSection>

              {/* ── VERIFICATION ── */}
              <FilterSection title="Verification">
                <div className={styles.ratingOptions}>
                  {VERIFICATIONS.map((v) => (
                    <button
                      key={v.value}
                      className={`${styles.ratingOpt} ${filters.verification === v.value ? styles.ratingOptActive : ""}`}
                      onClick={() => applyFilter("verification", v.value)}
                      data-track-id={`search.filter.verification.${v.value || "any"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </FilterSection>
            </aside>
          </>

          {/* Main content */}
          <div className={styles.mainContent}>
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
                    onClick={() => {
                      const prev = tab;
                      setTab(t.key);
                      // ── ANALYTICS: tab switched ───────────────────────
                      tracker.track("search.tab.switched", {
                        from: prev,
                        to: t.key,
                      });
                    }}
                    data-track-id={`search.tab.${t.key}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                className={styles.mobileFilterBtn}
                onClick={() => setShowFilters((s) => !s)}
                data-track-id="search.filters.mobileToggle"
              >
                <FiSliders size={14} /> Filters{" "}
                {activeFiltersCount > 0 && (
                  <span className={styles.filterCount}>
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Trending */}
            {tab === "trending" && (
              <div className={styles.trendingWrap}>
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
                            // ── ANALYTICS: trending category clicked ──
                            tracker.action("search.trending.category.clicked", {
                              categoryId: c.id,
                              categorySlug: c.slug,
                              categoryName: c.name,
                            });
                          }}
                          data-track-id={`search.trending.category.${c.slug}`}
                        >
                          <span className={styles.catIcon}>
                            {c.icon || <FiTool size={24} />}
                          </span>
                          <span className={styles.catName}>{c.name}</span>
                          <span className={styles.catCount}>
                            {c._count?.workers || 0} workers
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
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

            {/* Results */}
            {tab === "results" && (
              <>
                {!query ? (
                  <div className={styles.promptSearch}>
                    <span className={styles.promptIcon}>
                      <FiSearch size={40} />
                    </span>
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
                    <span className={styles.emptyIcon}>
                      <FiFrown size={40} />
                    </span>
                    <p className={styles.emptyTitle}>
                      No workers found for "{query}"
                    </p>
                    <p className={styles.emptyText}>
                      Try different keywords or adjust your filters.
                    </p>
                    <button
                      className={styles.emptyBtn}
                      onClick={clearFilters}
                      data-track-id="search.empty.clearFilters"
                    >
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
                          showDistance={!!w._distanceKm}
                        />
                      ))}
                    </div>
                    {pages > 1 && (
                      <div className={styles.pager}>
                        <button
                          className={styles.pageBtn}
                          disabled={page === 1}
                          onClick={() => changePage(page - 1)}
                          data-track-id="search.pagination.prev"
                        >
                          <FiArrowLeft size={14} /> Prev
                        </button>
                        <span className={styles.pageInfo}>
                          {page} / {pages}
                        </span>
                        <button
                          className={styles.pageBtn}
                          disabled={page === pages}
                          onClick={() => changePage(page + 1)}
                          data-track-id="search.pagination.next"
                        >
                          Next <FiArrowRight size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Nearby */}
            {tab === "nearby" &&
              (nearbyLoading ? (
                <div className={styles.workerGrid}>
                  {[...Array(4)].map((_, i) => (
                    <WorkerSkeleton key={i} />
                  ))}
                </div>
              ) : nearbyWorkers.length === 0 ? (
                <div className={styles.empty}>
                  <span className={styles.emptyIcon}>
                    <FiMapPin size={40} />
                  </span>
                  <p className={styles.emptyTitle}>No nearby workers found</p>
                  <p className={styles.emptyText}>
                    Allow location access and tap the{" "}
                    <FiMapPin
                      size={12}
                      style={{ verticalAlign: "middle", margin: "0 2px" }}
                    />{" "}
                    button to find workers near you.
                  </p>
                  <button
                    className={styles.emptyBtn}
                    onClick={findNearby}
                    data-track-id="search.nearby.retry"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {nearbyWorkers._expansionNote && (
                    <div className={styles.expansionNote}>
                      <FiInfo size={14} /> {nearbyWorkers._expansionNote}
                    </div>
                  )}
                  <p className={styles.resultsMeta}>
                    {nearbyWorkers.length} worker
                    {nearbyWorkers.length !== 1 ? "s" : ""} within{" "}
                    {filters.radius || 25} km
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
              ))}
          </div>
        </div>
      </div>
    </HirerLayout>
  );
}

function WorkerCard({
  worker,
  delay = 0,
  isNew = false,
  showDistance = false,
}) {
  const { user: viewer } = useAuthStore();
  const isHirer = viewer?.role === "HIRER";

  const {
    isSaved,
    checking: checkingSave,
    toggling,
    toggle,
  } = useSavedWorker(worker.user?.id, { enabled: isHirer });

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
    _distanceKm,
    verificationStatus,
  } = worker;

  const dist = _distanceKm ?? distanceKm;
  const primaryCat = categories?.find((c) => c.isPrimary) || categories?.[0];

  return (
    <a
      href={`/workers/${user?.id}`}
      className={styles.workerCard}
      style={{ animationDelay: `${delay}s` }}
      onClick={() =>
        tracker.action("search.workerCard.clicked", {
          workerId: user?.id,
          workerTitle: worker.title || null,
          isNew,
          isVerified: verificationStatus === "VERIFIED",
          hasDistance: dist != null,
          source: "search",
        })
      }
      data-track-id={`search.workerCard.${user?.id}`}
    >
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
          {verificationStatus === "VERIFIED" && <ShieldCheck size={18} />}
          {showDistance && dist != null && (
            <span className={styles.distBadge}>
              <FiMapPin size={10} /> {dist} km
            </span>
          )}
        </div>
      </div>

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
      {(user?.city || user?.country) && (
        <p className={styles.wcLocation}>
          <FiMapPin size={11} />{" "}
          {[user.city, user.country].filter(Boolean).join(", ")}
        </p>
      )}
      <div className={styles.wcStats}>
        <span className={styles.wcRating}>
          <FiStar size={12} /> {avgRating > 0 ? avgRating.toFixed(1) : "New"}
          <span className={styles.wcReviews}> ({totalReviews})</span>
        </span>
        <span className={styles.wcJobs}>{completedJobs} jobs</span>
      </div>
      <div className={styles.wcFooter}>
        <span className={styles.wcRate}>
          {currency} {hourlyRate?.toLocaleString()}
          <span className={styles.wcRateUnit}>/hr</span>
        </span>

        <div className={styles.wcFooterRight}>
          <span
            className={`${styles.wcAvail} ${
              isAvailable ? styles.wcAvailOn : styles.wcAvailOff
            }`}
          >
            {isAvailable ? "Available" : "Busy"}
          </span>

          {isHirer && (
            <button
              type="button"
              className={`${styles.wcSaveBtn} ${
                isSaved ? styles.wcSaveBtnActive : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle();
                // ── ANALYTICS: save/unsave worker ─────────────────────────
                tracker.action("search.workerCard.save.toggled", {
                  workerId: user?.id,
                  wasSaved: isSaved,
                });
              }}
              disabled={checkingSave || toggling}
              title={isSaved ? "Remove from saved" : "Save worker"}
              aria-label={isSaved ? "Remove from saved" : "Save worker"}
              data-track-id={`search.workerCard.save.${user?.id}`}
            >
              <FiBookmark size={14} fill={isSaved ? "currentColor" : "none"} />
            </button>
          )}
        </div>
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
