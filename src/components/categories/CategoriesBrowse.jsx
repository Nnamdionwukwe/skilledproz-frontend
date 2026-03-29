import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styles from "./CategoriesBrowse.module.css";
import api from "../../lib/api";
import HirerLayout from "../layout/HirerLayout";

export default function CategoriesBrowse() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/categories")
      .then((res) => {
        setCategories(res.data.data.categories || []);
        setLoading(false);
      })
      .catch((err) => {
        setError("Failed to load categories");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Browse Services</h1>
          <p>Loading categories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Browse Services</h1>
          <p className={styles.error}>{error}</p>
        </div>
      </div>
    );
  }
  z;

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1>Browse Services</h1>
          <p>Find workers and jobs by category</p>
        </div>

        <div className={styles.grid}>
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/categories/${category.slug}`}
              className={styles.card}
            >
              {category.icon && (
                <span className={styles.icon}>{category.icon}</span>
              )}
              <h3 className={styles.name}>{category.name}</h3>
              <p className={styles.count}>
                {category._count?.workers || 0} workers
              </p>
              {category.children && category.children.length > 0 && (
                <div className={styles.subcategories}>
                  {category.children.map((child) => (
                    <span key={child.id} className={styles.subcat}>
                      {child.name}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className={styles.empty}>
            <p>No categories available</p>
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
