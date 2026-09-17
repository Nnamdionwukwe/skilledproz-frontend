// src/hooks/useSavedWorker.js
import { useState, useEffect, useCallback, useRef } from "react";
import api from "../lib/api";

/**
 * Tracks whether a given worker is saved by the current hirer, and
 * provides a toggle() to save/unsave.
 *
 * @param {string} workerId  the worker's User.id
 * @param {object} opts
 * @param {boolean} opts.enabled  skip fetching (e.g. for workers viewing)
 * @returns {{ isSaved, checking, toggling, toggle }}
 */
export default function useSavedWorker(workerId, { enabled = true } = {}) {
  const [isSaved, setIsSaved] = useState(false);
  const [checking, setChecking] = useState(enabled && !!workerId);
  const [toggling, setToggling] = useState(false);
  const cancelledRef = useRef(false);

  // ── Check current saved status ──
  useEffect(() => {
    if (!enabled || !workerId) {
      setChecking(false);
      return;
    }
    cancelledRef.current = false;
    setChecking(true);

    api
      .get("/hirers/me/saved-workers", { params: { limit: 200 } })
      .then((res) => {
        if (cancelledRef.current) return;
        const workers = res.data?.data?.workers || [];
        setIsSaved(workers.some((w) => w.id === workerId));
      })
      .catch(() => {
        // silent — button just stays in default state
      })
      .finally(() => {
        if (!cancelledRef.current) setChecking(false);
      });

    return () => {
      cancelledRef.current = true;
    };
  }, [workerId, enabled]);

  // ── Toggle save state ──
  const toggle = useCallback(async () => {
    if (!workerId || toggling) return;
    setToggling(true);
    const next = !isSaved;
    setIsSaved(next); // optimistic

    try {
      if (next) {
        await api.post(`/hirers/me/saved-workers/${workerId}`);
      } else {
        await api.delete(`/hirers/me/saved-workers/${workerId}`);
      }
    } catch {
      setIsSaved(!next); // revert
    } finally {
      setToggling(false);
    }
  }, [workerId, isSaved, toggling]);

  return { isSaved, checking, toggling, toggle };
}
