import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./CategoryDetail.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";

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

    // Use /search endpoint with category filter — this is what exists
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
        // Fallback: fetch all workers via worker endpoint
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
            ← Back to Categories
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.page}>
        <div className={styles.header}>
          <Link to="/categories" className={styles.backBtn}>
            ← Back
          </Link>
          {category.icon && (
            <span className={styles.icon}>{category.icon}</span>
          )}
          <h1>{category.name}</h1>
          <p className={styles.workerCount}>
            {workers.length} workers available
          </p>
        </div>

        <div className={styles.workersGrid}>
          {workers.map((worker, i) => {
            // Search returns workerProfile shape; /workers endpoint returns user shape
            const isSearchShape = !!worker.user; // has nested user
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
                      {firstName?.[0]}
                      {lastName?.[0]}
                    </span>
                  )}
                </div>
                <h3 className={styles.name}>
                  {firstName} {lastName}
                </h3>
                {wp?.title && <p className={styles.title}>{wp.title}</p>}
                <div className={styles.rating}>
                  <span className={styles.stars}>★</span>
                  <span className={styles.ratingValue}>
                    {wp?.avgRating || "New"}
                  </span>
                  <span className={styles.ratingCount}>
                    ({wp?.totalReviews || 0} reviews)
                  </span>
                </div>
                {city && <p className={styles.location}>📍 {city}</p>}
                {wp?.hourlyRate && (
                  <p className={styles.rate}>
                    {wp.currency || "USD"} {wp.hourlyRate}/hr
                  </p>
                )}
                {wp?.isAvailable && (
                  <div className={styles.available}>🟢 Available</div>
                )}
              </Link>
            );
          })}
        </div>

        {workers.length === 0 && (
          <div className={styles.empty}>
            <p>No workers found in this category</p>
            <Link to="/categories" className={styles.backBtn}>
              Browse other categories
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
