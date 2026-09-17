import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./CategoriesBrowse.module.css";
import api from "../../lib/api";
import { useAuthStore } from "../../store/authStore";

import {
  FiArrowLeft,
  FiSearch,
  FiPlus,
  FiX,
  FiTag,
  FiCheckCircle,
  FiAlertCircle,
} from "react-icons/fi";

import { FaUsers } from "react-icons/fa";

// ── How many categories per API page ──
const PAGE_SIZE = 100;

// ── Debounce delay for search input (ms) ──
const SEARCH_DEBOUNCE = 300;

export default function CategoriesBrowse() {
  const { user } = useAuthStore();

  const backDestination =
    user?.role === "WORKER"
      ? "/dashboard/worker"
      : user?.role === "HIRER"
        ? "/dashboard/hirer"
        : "/landingpage";

  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState(""); // debounced value used for the fetch

  // Add-category form state
  const [showSuggest, setShowSuggest] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [suggestMsg, setSuggestMsg] = useState("");
  const [suggestMsgKind, setSuggestMsgKind] = useState("error"); // "ok" | "warn" | "error"

  // Prevent overlapping fetches when the user types fast
  const requestIdRef = useRef(0);

  // ── Debounce the search box ──
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE);
    return () => clearTimeout(t);
  }, [searchInput]);

  // ── Fetch a specific page ──
  const fetchPage = useCallback(
    async (pageToFetch, { replace = false } = {}) => {
      const myRequestId = ++requestIdRef.current;

      if (replace) setLoading(true);
      else setLoadingMore(true);
      setLoadError("");

      try {
        const res = await api.get("/categories", {
          params: {
            page: pageToFetch,
            limit: PAGE_SIZE,
            ...(search && { search }),
          },
        });

        // Ignore stale responses (user typed before the previous request finished)
        if (myRequestId !== requestIdRef.current) return;

        const data = res.data.data || {};
        const list = data.categories || [];

        setCategories((prev) => (replace ? list : [...prev, ...list]));
        setTotal(data.total ?? list.length);
        setPages(data.pages ?? 1);
        setPage(data.page ?? pageToFetch);
      } catch (err) {
        if (myRequestId !== requestIdRef.current) return;
        console.error("[CategoriesBrowse] fetch failed:", err);
        setLoadError("Couldn't load categories. Please try again.");
      } finally {
        if (myRequestId === requestIdRef.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [search],
  );

  // ── Load page 1 whenever the search term changes ──
  useEffect(() => {
    fetchPage(1, { replace: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [search, fetchPage]);

  const hasMore = page < pages;

  const handleShowMore = () => {
    if (loadingMore || !hasMore) return;
    fetchPage(page + 1, { replace: false });
  };

  // ── Submit a new category ──
  async function handleSuggest(e) {
    e.preventDefault();
    if (!suggestName.trim()) return;

    const submitted = suggestName.trim();
    setSuggesting(true);
    setSuggestMsg("");
    setSuggestMsgKind("error");

    try {
      const res = await api.post("/categories/suggest", { name: submitted });

      const payload = res?.data?.data ?? res?.data ?? {};
      const category = payload.category ?? payload;
      const alreadyExists = !!payload.alreadyExists;

      if (!alreadyExists && category && category.id) {
        const normalised = {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon ?? "🔧",
          description: category.description ?? null,
          isUserSubmitted: category.isUserSubmitted ?? true,
          _count: category._count ?? { workers: 0, bookings: 0 },
        };

        // If the current search WOULD match the new category, keep it and
        // refresh page 1 so the new item shows in the filtered results.
        // If not, clear search so the user sees it at the top of the list.
        const wouldMatch =
          !search ||
          normalised.name.toLowerCase().includes(search.toLowerCase());

        if (wouldMatch) {
          // If we're currently on a filtered view that would show it,
          // refetch page 1 to get the freshest ordering (it'll be at top).
          if (page === 1) {
            setCategories((prev) => [
              normalised,
              ...prev.filter((c) => c.id !== normalised.id),
            ]);
            setTotal((t) => t + 1);
          } else {
            await fetchPage(1, { replace: true });
          }
        } else {
          setSearchInput("");
          setSearch("");
          // fetchPage(1) will run via the search effect; new item will be top of page 1
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
        setSuggestMsg(`✅ "${normalised.name}" added to the platform!`);
        setSuggestMsgKind("ok");
      } else if (alreadyExists) {
        setSuggestMsg(`"${category?.name || submitted}" already exists.`);
        setSuggestMsgKind("warn");
      } else {
        setSuggestMsg("Unexpected response from the server.");
        setSuggestMsgKind("error");
      }

      setSuggestName("");
      setShowSuggest(false);
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;

      const retryAfterRaw =
        err?.response?.headers?.["retry-after"] ??
        err?.response?.data?.retryAfter;
      const retryAfter = parseInt(retryAfterRaw, 10);

      if (status === 429) {
        if (!Number.isNaN(retryAfter) && retryAfter > 0) {
          const minutes = Math.max(1, Math.ceil(retryAfter / 60));
          setSuggestMsg(
            `Too many suggestions. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`,
          );
        } else {
          setSuggestMsg(
            serverMsg ||
              "Too many suggestions. Please wait a while before trying again.",
          );
        }
        setSuggestMsgKind("warn");
      } else if (status === 400) {
        setSuggestMsg(
          serverMsg || "Please check the category name and try again.",
        );
        setSuggestMsgKind("error");
      } else if (status === 401 || status === 403) {
        setSuggestMsg(
          serverMsg || "You are not allowed to add categories right now.",
        );
        setSuggestMsgKind("error");
      } else if (status >= 500) {
        setSuggestMsg("Server error. Please try again in a moment.");
        setSuggestMsgKind("error");
      } else {
        setSuggestMsg(
          serverMsg ||
            "Couldn't reach the server. Check your connection and try again.",
        );
        setSuggestMsgKind("error");
      }
    } finally {
      setSuggesting(false);
      setTimeout(() => setSuggestMsg(""), 7000);
    }
  }

  const msgClass =
    suggestMsgKind === "ok"
      ? styles.suggestMsgOk
      : suggestMsgKind === "warn"
        ? styles.suggestMsgWarn
        : styles.suggestMsgErr;

  return (
    <div className={styles.page}>
      <Link to={backDestination} className={styles.backBtn}>
        <FiArrowLeft size={16} /> Back
      </Link>

      <div className={styles.header}>
        <h1 className={styles.title}>Browse Categories</h1>
        <p className={styles.sub}>
          {total > 0
            ? `${total} ${search ? "matching " : ""}categor${total === 1 ? "y" : "ies"}`
            : "All categories"}{" "}
          — search or add yours
        </p>
      </div>

      <div className={styles.controlRow}>
        <div className={styles.searchWrap}>
          <FiSearch className={styles.searchIcon} size={18} />
          <input
            className={styles.searchInput}
            placeholder="Search categories..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button
              className={styles.clearBtn}
              onClick={() => setSearchInput("")}
              aria-label="Clear search"
            >
              <FiX size={16} />
            </button>
          )}
        </div>

        {!showSuggest ? (
          <button
            className={styles.suggestTrigger}
            onClick={() => setShowSuggest(true)}
          >
            <FiPlus size={16} /> Add Category
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
              <FiX size={14} /> Cancel
            </button>
          </form>
        )}
      </div>

      {suggestMsg && (
        <div className={`${styles.suggestMsg} ${msgClass}`}>
          {suggestMsgKind === "ok" ? (
            <FiCheckCircle size={16} />
          ) : (
            <FiAlertCircle size={16} />
          )}
          {suggestMsg}
        </div>
      )}

      {loadError && !loading && (
        <div className={`${styles.suggestMsg} ${styles.suggestMsgErr}`}>
          <FiAlertCircle size={16} />
          {loadError}
          <button
            type="button"
            className={styles.retryBtn}
            onClick={() => fetchPage(1, { replace: true })}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className={styles.grid}>
          {[...Array(12)].map((_, i) => (
            <CategorySkeleton key={i} delay={i * 50} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className={styles.empty}>
          <FiSearch size={48} opacity={0.3} />
          <p>
            No categories found
            {search ? ` for "${search}"` : ""}.
          </p>
          {search && (
            <button
              className={styles.suggestTrigger}
              onClick={() => {
                setSuggestName(search);
                setShowSuggest(true);
                setSearchInput("");
                setSearch("");
              }}
            >
              <FiPlus size={16} /> Add "{search}" as a new category
            </button>
          )}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/categories/${cat.slug}`}
                className={styles.card}
              >
                {cat.icon && <span className={styles.icon}>{cat.icon}</span>}
                <h3 className={styles.name}>{cat.name}</h3>
                <p className={styles.count}>
                  <FaUsers size={12} /> {cat._count?.workers || 0} workers
                </p>
                {cat.isUserSubmitted && (
                  <span className={styles.userTag}>
                    <FiTag size={10} /> Community
                  </span>
                )}
              </Link>
            ))}
          </div>

          {hasMore && (
            <div className={styles.showMoreWrap}>
              <button
                type="button"
                className={styles.showMoreBtn}
                onClick={handleShowMore}
                disabled={loadingMore}
              >
                {loadingMore
                  ? "Loading..."
                  : `Show more (${total - categories.length} remaining)`}
              </button>
            </div>
          )}

          {!hasMore && categories.length > 0 && (
            <p className={styles.endOfList}>
              That's all {total} {search ? "matching " : ""}categor
              {total === 1 ? "y" : "ies"}.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function CategorySkeleton({ delay = 0 }) {
  return (
    <div
      className={styles.skeletonCard}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={styles.skIcon} />
      <div className={styles.skLine} style={{ width: "70%" }} />
      <div className={styles.skLineSm} style={{ width: "45%" }} />
    </div>
  );
}
