// src/pages/hirer/HirerSavedWorkers.jsx
// Unified component for Saved Workers (explicit bookmarks) and
// Hired Workers (booking history). Handles save + unsave inline.
//
// Bug fixed from original: FeatureGate was blocking the list from rendering.
// The component now renders without any subscription gate.

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../../components/layout/HirerLayout";
import api from "../../lib/api";
import styles from "./HirerSavedWorkers.module.css";
import ReportButton from "../../pages/reports/ReportButton";

// ── Helpers ───────────────────────────────────────────────────────────────────
function Avatar({ user, size = 44 }) {
  const initials =
    `${user?.firstName?.[0] || ""}${user?.lastName?.[0] || ""}`.toUpperCase() ||
    "?";
  return (
    <div className={styles.avatar} style={{ width: size, height: size }}>
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}

function StarRating({ rating }) {
  if (!rating) return null;
  return <span className={styles.rating}>★ {Number(rating).toFixed(1)}</span>;
}

// ── Single worker card ─────────────────────────────────────────────────────────
function WorkerCard({ worker, isSaved, onUnsave, unsaving }) {
  const wp = worker.workerProfile;
  return (
    <article className={styles.card}>
      <div className={styles.cardTop}>
        <Avatar user={worker} />
        <div className={styles.cardInfo}>
          <p className={styles.cardName}>
            {worker.firstName} {worker.lastName}
          </p>
          {wp?.title && <p className={styles.cardTitle}>{wp.title}</p>}
          <div className={styles.cardMeta}>
            {(worker.city || worker.country) && (
              <span className={styles.location}>
                📍 {[worker.city, worker.country].filter(Boolean).join(", ")}
              </span>
            )}
            {wp?.isAvailable && (
              <span className={styles.available}>● Available</span>
            )}
          </div>
        </div>
        <StarRating rating={wp?.avgRating} />
      </div>

      {/* Categories */}
      {wp?.categories?.length > 0 && (
        <div className={styles.categories}>
          {wp.categories.map((c) => (
            <span key={c.category?.name} className={styles.categoryPill}>
              {c.category?.icon} {c.category?.name}
            </span>
          ))}
        </div>
      )}

      {/* Stats row */}
      <div className={styles.statsRow}>
        {wp?.hourlyRate && (
          <div className={styles.stat}>
            <span className={styles.statVal}>
              {wp.currency || "NGN"} {Number(wp.hourlyRate).toLocaleString()}
            </span>
            <span className={styles.statLabel}>/hr</span>
          </div>
        )}
        {wp?.completedJobs > 0 && (
          <div className={styles.stat}>
            <span className={styles.statVal}>{wp.completedJobs}</span>
            <span className={styles.statLabel}>jobs</span>
          </div>
        )}
        {wp?.totalReviews > 0 && (
          <div className={styles.stat}>
            <span className={styles.statVal}>{wp.totalReviews}</span>
            <span className={styles.statLabel}>reviews</span>
          </div>
        )}
        {wp?.verificationStatus === "VERIFIED" && (
          <span className={styles.verifiedBadge}>✓ Verified</span>
        )}
      </div>

      {/* Last hired for (hired-workers tab only) */}
      {worker.lastCategory && (
        <p className={styles.lastHired}>
          Last hired for: <strong>{worker.lastCategory.name}</strong>
        </p>
      )}

      {/* Saved at (saved-workers tab only) */}
      {worker.savedAt && (
        <p className={styles.savedAt}>
          Saved{" "}
          {new Date(worker.savedAt).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      )}

      {/* Actions */}
      <div className={styles.cardActions}>
        <Link to={`/workers/${worker.id}`} className={styles.viewBtn}>
          View Profile →
        </Link>
        <ReportButton
          targetType="USER"
          targetId={worker.id}
          targetName={`${worker.firstName} ${worker.lastName}`}
        />
        <Link
          to={`/bookings/new?workerId=${worker.id}`}
          className={styles.bookBtn}
        >
          Book
        </Link>

        {isSaved && (
          <button
            className={styles.unsaveBtn}
            onClick={() => onUnsave(worker.id)}
            disabled={unsaving === worker.id}
            title="Remove from saved"
          >
            {unsaving === worker.id ? "…" : "🔖"}
          </button>
        )}
      </div>
    </article>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function Skeletons() {
  return (
    <div className={styles.grid}>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className={styles.skeleton}
          style={{ animationDelay: `${i * 60}ms` }}
        />
      ))}
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────
function Empty({ tab }) {
  return (
    <div className={styles.empty}>
      <span className={styles.emptyIcon}>{tab === "saved" ? "🔖" : "👔"}</span>
      <p className={styles.emptyTitle}>
        {tab === "saved" ? "No saved workers yet" : "No hired workers yet"}
      </p>
      <p className={styles.emptySub}>
        {tab === "saved"
          ? "Browse workers and tap the bookmark icon to save them here."
          : "Workers you've previously booked will appear here."}
      </p>
      <Link to="/workers" className={styles.emptyBtn}>
        Browse Workers →
      </Link>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function HirerSavedWorkers() {
  const [tab, setTab] = useState("saved"); // "saved" | "hired"
  const [saved, setSaved] = useState([]);
  const [hired, setHired] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [loadingHired, setLoadingHired] = useState(true);
  const [unsaving, setUnsaving] = useState(null); // workerId being unsaved
  const [toast, setToast] = useState(null);

  function notify(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Fetch saved workers ──────────────────────────────────────────────────────
  const fetchSaved = useCallback(async () => {
    setLoadingSaved(true);
    try {
      const res = await api.get("/hirers/me/saved-workers");
      setSaved(res.data.data?.workers || []);
    } catch {
      notify("Failed to load saved workers", "error");
    } finally {
      setLoadingSaved(false);
    }
  }, []);

  // ── Fetch hired workers ──────────────────────────────────────────────────────
  const fetchHired = useCallback(async () => {
    setLoadingHired(true);
    try {
      const res = await api.get("/hirers/me/hired-workers");
      setHired(res.data.data?.workers || []);
    } catch {
      notify("Failed to load hired workers", "error");
    } finally {
      setLoadingHired(false);
    }
  }, []);

  useEffect(() => {
    fetchSaved();
  }, [fetchSaved]);
  useEffect(() => {
    fetchHired();
  }, [fetchHired]);

  // ── Unsave a worker ──────────────────────────────────────────────────────────
  async function handleUnsave(workerId) {
    setUnsaving(workerId);
    try {
      await api.delete(`/hirers/me/saved-workers/${workerId}`);
      setSaved((prev) => prev.filter((w) => w.id !== workerId));
      notify("Worker removed from saved list");
    } catch {
      notify("Failed to remove worker", "error");
    } finally {
      setUnsaving(null);
    }
  }

  const activeWorkers = tab === "saved" ? saved : hired;
  const isLoading = tab === "saved" ? loadingSaved : loadingHired;

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* Toast */}
        {toast && (
          <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.pageTitle}>My Workers</h1>
            <p className={styles.pageSubtitle}>
              Manage your saved shortlist and view your hiring history.
            </p>
          </div>
          <Link to="/workers" className={styles.browseBtn}>
            + Browse Workers
          </Link>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === "saved" ? styles.tabActive : ""}`}
            onClick={() => setTab("saved")}
          >
            🔖 Saved
            {saved.length > 0 && (
              <span className={styles.tabBadge}>{saved.length}</span>
            )}
          </button>
          <button
            className={`${styles.tab} ${tab === "hired" ? styles.tabActive : ""}`}
            onClick={() => setTab("hired")}
          >
            👔 Previously Hired
            {hired.length > 0 && (
              <span className={styles.tabBadge}>{hired.length}</span>
            )}
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <Skeletons />
        ) : activeWorkers.length === 0 ? (
          <Empty tab={tab} />
        ) : (
          <div className={styles.grid}>
            {activeWorkers.map((w) => (
              <WorkerCard
                key={w.id}
                worker={w}
                isSaved={tab === "saved"}
                onUnsave={handleUnsave}
                unsaving={unsaving}
              />
            ))}
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
