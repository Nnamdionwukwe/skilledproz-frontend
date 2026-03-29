import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import styles from "./CategoryDetail.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";

export default function oCategoryDetail() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch category
    api
      .get(`/categories/${slug}`)
      .then((res) => {
        setCategory(res.data.data.category);
      })
      .catch(() => setError("Category not found"));

    // Fetch workers in this category
    api
      .get("/workers/search", { params: { category: slug, limit: 20 } })
      .then((res) => {
        setWorkers(res.data.data.workers || []);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load workers", err);
        setLoading(false);
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
    <HirerLayout>
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
          {workers.map((worker) => (
            <Link
              key={worker.id}
              to={`/workers/${worker.id}`}
              className={styles.workerCard}
            >
              <div className={styles.avatar}>
                {worker.avatar ? (
                  <img src={worker.avatar} alt={worker.firstName} />
                ) : (
                  <span>
                    {worker.firstName?.[0]}
                    {worker.lastName?.[0]}
                  </span>
                )}
              </div>

              <h3 className={styles.name}>
                {worker.firstName} {worker.lastName}
              </h3>

              {worker.workerProfile?.title && (
                <p className={styles.title}>{worker.workerProfile.title}</p>
              )}

              <div className={styles.rating}>
                <span className={styles.stars}>★</span>
                <span className={styles.ratingValue}>
                  {worker.workerProfile?.avgRating || "N/A"}
                </span>
                <span className={styles.ratingCount}>
                  ({worker.workerProfile?.totalReviews || 0} reviews)
                </span>
              </div>

              {worker.city && (
                <p className={styles.location}>📍 {worker.city}</p>
              )}

              {worker.workerProfile?.hourlyRate && (
                <p className={styles.rate}>
                  {worker.workerProfile.currency || "USD"}{" "}
                  {worker.workerProfile.hourlyRate}/hr
                </p>
              )}

              {worker.workerProfile?.isAvailable && (
                <div className={styles.available}>🟢 Available</div>
              )}
            </Link>
          ))}
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
    </HirerLayout>
  );
}
