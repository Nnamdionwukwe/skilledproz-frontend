import { useEffect, useRef, useState, useCallback } from "react";
import api from "../lib/api";

/**
 * Polls /posts/feed in the background and surfaces any posts that
 * appeared since the last fetch.
 *
 * @param {object} opts
 * @param {string} opts.filter   current type filter ("ALL" | "HIRING" | ...)
 * @param {Array}  opts.currentPosts  the posts currently on screen
 * @param {number} opts.intervalMs    polling cadence (default 25s)
 * @param {boolean} opts.enabled      master switch (e.g. off while modal open)
 * @returns {{ pendingPosts: Array, dismissPending: () => void, clearPending: () => void }}
 */
export default function useFeedPolling({
  filter = "ALL",
  currentPosts = [],
  intervalMs = 25000,
  enabled = true,
} = {}) {
  const [pendingPosts, setPendingPosts] = useState([]);

  // Keep the latest values in refs so the interval closure never goes stale
  const filterRef = useRef(filter);
  const postsRef = useRef(currentPosts);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    filterRef.current = filter;
  }, [filter]);
  useEffect(() => {
    postsRef.current = currentPosts;
  }, [currentPosts]);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  // Reset pending whenever the filter changes — the list is about to be replaced
  useEffect(() => {
    setPendingPosts([]);
  }, [filter]);

  const runPoll = useCallback(async () => {
    if (!enabledRef.current) return;
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const res = await api.get("/posts/feed", {
        params: {
          page: 1,
          limit: 15,
          ...(filterRef.current !== "ALL" && { type: filterRef.current }),
        },
      });

      const fresh = res?.data?.data?.posts ?? [];
      if (!fresh.length) return;

      const knownIds = new Set(postsRef.current.map((p) => p.id));
      // Also exclude anything already queued so we don't double-add
      const queuedIds = new Set(pendingPosts.map((p) => p.id));
      const brandNew = fresh.filter(
        (p) => !knownIds.has(p.id) && !queuedIds.has(p.id),
      );

      if (brandNew.length) {
        setPendingPosts((prev) => {
          const merged = [...brandNew, ...prev];
          // dedupe by id, keep newest first
          const seen = new Set();
          return merged.filter((p) => {
            if (seen.has(p.id)) return false;
            seen.add(p.id);
            return true;
          });
        });
      }
    } catch {
      // swallow — polling must never break the UI
    }
  }, [pendingPosts]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const tick = () => runPoll();
    const id = setInterval(tick, intervalMs);

    // Refresh immediately when the tab becomes visible again
    const onVisibility = () => {
      if (!document.hidden) runPoll();
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Also refresh on regaining network connectivity
    window.addEventListener("online", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onVisibility);
    };
  }, [enabled, intervalMs, runPoll]);

  const dismissPending = () => setPendingPosts([]);
  const clearPending = () => setPendingPosts([]);

  return { pendingPosts, dismissPending, clearPending };
}
