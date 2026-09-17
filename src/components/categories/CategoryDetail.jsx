import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./CategoryDetail.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";
import { useAuthStore } from "../../store/authStore";
import useSavedWorker from "../../hooks/useSavedWorker";

import {
  FiArrowLeft,
  FiMapPin,
  FiDollarSign,
  FiUsers,
  FiUser,
  FiBookmark,
} from "react-icons/fi";

import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

// Shared star renderer — kept outside the component so both the card
// and any parent can reuse it without redefining the function.
function renderStars(rating) {
  if (!rating) return null;
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return (
    <span className={styles.starsContainer}>
      {[...Array(fullStars)].map((_, i) => (
        <FaStar key={`full-${i}`} className={styles.starFilled} />
      ))}
      {halfStar && <FaStarHalfAlt className={styles.starFilled} />}
      {[...Array(emptyStars)].map((_, i) => (
        <FaRegStar key={`empty-${i}`} className={styles.starEmpty} />
      ))}
    </span>
  );
}

// ── Single worker card ──
function WorkerCard({ worker }) {
  const { user: viewer } = useAuthStore();
  const isHirer = viewer?.role === "HIRER";

  const isSearchShape = !!worker.user;
  const userId = isSearchShape ? worker.user?.id : worker.id;
  const firstName = isSearchShape ? worker.user?.firstName : worker.firstName;
  const lastName = isSearchShape ? worker.user?.lastName : worker.lastName;
  const avatar = isSearchShape ? worker.user?.avatar : worker.avatar;
  const city = isSearchShape ? worker.user?.city : worker.city;
  const wp = isSearchShape ? worker : worker.workerProfile;

  const {
    isSaved,
    checking: checkingSave,
    toggling,
    toggle,
  } = useSavedWorker(userId, { enabled: isHirer });

  return (
    <Link to={`/workers/${userId}`} className={styles.workerCard}>
      <div className={styles.avatar}>
        {avatar ? (
          <img src={avatar} alt={firstName} />
        ) : (
          <span>
            <FiUser size={28} />
          </span>
        )}
      </div>
      <h3 className={styles.name}>
        {firstName} {lastName}
      </h3>
      {wp?.title && <p className={styles.title}>{wp.title}</p>}
      <div className={styles.rating}>
        {wp?.avgRating ? (
          <>
            {renderStars(wp.avgRating)}
            <span className={styles.ratingValue}>
              {wp.avgRating.toFixed(1)}
            </span>
            <span className={styles.ratingCount}>
              ({wp.totalReviews || 0} reviews)
            </span>
          </>
        ) : (
          <span className={styles.ratingNew}>New</span>
        )}
      </div>
      {city && (
        <p className={styles.location}>
          <FiMapPin size={12} /> {city}
        </p>
      )}
      {wp?.hourlyRate && (
        <p className={styles.rate}>
          <FiDollarSign size={14} />
          {wp.currency || "USD"} {wp.hourlyRate}/hr
        </p>
      )}

      <div className={styles.cardFooter}>
        {wp?.isAvailable ? (
          <span className={styles.available}>
            <span className={styles.statusDot} /> Available
          </span>
        ) : (
          <span className={styles.availableOff}>Busy</span>
        )}

        {isHirer && (
          <button
            type="button"
            className={`${styles.saveBtn} ${
              isSaved ? styles.saveBtnActive : ""
            }`}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle();
            }}
            disabled={checkingSave || toggling}
            title={isSaved ? "Remove from saved" : "Save worker"}
            aria-label={isSaved ? "Remove from saved" : "Save worker"}
          >
            <FiBookmark size={14} fill={isSaved ? "currentColor" : "none"} />
          </button>
        )}
      </div>
    </Link>
  );
}

// ── Skeleton card ──
function WorkerSkeleton() {
  return (
    <div className={styles.workerSkeleton}>
      <div className={styles.skAvatar} />
      <div className={styles.skLine} style={{ width: "70%" }} />
      <div className={styles.skLine} style={{ width: "50%" }} />
      <div className={styles.skLine} style={{ width: "60%" }} />
      <div className={styles.skFooter} />
    </div>
  );
}

export default function CategoryDetail() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    api
      .get(`/categories/${slug}/workers`, { params: { limit: 40 } })
      .then((res) => {
        const payload = res.data.data;
        setCategory(payload.category);
        setWorkers(payload.workers || []);
      })
      .catch((err) => {
        console.error("[CategoryDetail] failed:", err?.response?.data || err);
        setError(
          err?.response?.status === 404
            ? "Category not found"
            : "Could not load workers for this category",
        );
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (error || (!loading && !category)) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <h1>Category not found</h1>
            <Link to="/categories" className={styles.backBtn}>
              <FiArrowLeft size={16} /> Back to Categories
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link to="/categories" className={styles.backBtn}>
            <FiArrowLeft size={16} /> Back
          </Link>
          {loading ? (
            <>
              <div className={styles.skIcon} />
              <div className={styles.skTitle} />
              <div className={styles.skSubtitle} />
            </>
          ) : (
            <>
              {category.icon && (
                <span className={styles.icon}>{category.icon}</span>
              )}
              <h1>{category.name}</h1>
              <p className={styles.workerCount}>
                <FiUsers size={14} /> {workers.length} workers available
              </p>
            </>
          )}
        </div>

        {loading ? (
          <div className={styles.workersGrid}>
            {[...Array(8)].map((_, i) => (
              <WorkerSkeleton key={i} />
            ))}
          </div>
        ) : workers.length === 0 ? (
          <div className={styles.empty}>
            <FiUsers size={48} opacity={0.3} />
            <p>No workers found in this category</p>
            <Link to="/categories" className={styles.backBtn}>
              <FiArrowLeft size={16} /> Browse other categories
            </Link>
          </div>
        ) : (
          <div className={styles.workersGrid}>
            {workers.map((worker, i) => (
              <WorkerCard
                key={worker.user?.id || worker.id || i}
                worker={worker}
              />
            ))}
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
