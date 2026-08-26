import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./CategoryDetail.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";

import {
  FiArrowLeft,
  FiMapPin,
  FiDollarSign,
  FiStar,
  FiUsers,
  FiClock,
  FiUser,
  FiCamera,
} from "react-icons/fi";

import { FaStar, FaStarHalfAlt, FaRegStar } from "react-icons/fa";

export default function CategoryDetail() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/categories/${slug}`)
      .then((res) => setCategory(res.data.data.category))
      .catch(() => setError("Category not found"));

    api
      .get("/search", {
        params: {
          q: slug,
          type: "workers",
          category: slug,
          limit: 20,
          available: "false",
        },
      })
      .then((res) => {
        const data = res.data.data.workers?.data || res.data.data.workers || [];
        setWorkers(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        api
          .get("/workers", { params: { category: slug, limit: 20 } })
          .then((res) => setWorkers(res.data.data?.workers || []))
          .catch(() => {})
          .finally(() => setLoading(false));
      });
  }, [slug]);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || !category) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Category not found</h1>
          <Link to="/categories" className={styles.backBtn}>
            <FiArrowLeft size={16} /> Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  // Helper to render star ratings
  const renderStars = (rating) => {
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
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/categories" className={styles.backBtn}>
          <FiArrowLeft size={16} /> Back
        </Link>
        {category.icon && <span className={styles.icon}>{category.icon}</span>}
        <h1>{category.name}</h1>
        <p className={styles.workerCount}>
          <FiUsers size={14} /> {workers.length} workers available
        </p>
      </div>

      <div className={styles.workersGrid}>
        {workers.map((worker, i) => {
          const isSearchShape = !!worker.user;
          const userId = isSearchShape ? worker.user?.id : worker.id;
          const firstName = isSearchShape
            ? worker.user?.firstName
            : worker.firstName;
          const lastName = isSearchShape
            ? worker.user?.lastName
            : worker.lastName;
          const avatar = isSearchShape ? worker.user?.avatar : worker.avatar;
          const city = isSearchShape ? worker.user?.city : worker.city;
          const wp = isSearchShape ? worker : worker.workerProfile;

          return (
            <Link
              key={userId || i}
              to={`/workers/${userId}`}
              className={styles.workerCard}
            >
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
              {wp?.isAvailable && (
                <div className={styles.available}>
                  <span className={styles.statusDot} /> Available
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {workers.length === 0 && (
        <div className={styles.empty}>
          <FiUsers size={48} opacity={0.3} />
          <p>No workers found in this category</p>
          <Link to="/categories" className={styles.backBtn}>
            <FiArrowLeft size={16} /> Browse other categories
          </Link>
        </div>
      )}
    </div>
  );
}
