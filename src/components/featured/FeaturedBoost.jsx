import { useState, useEffect } from "react";
import api from "../../lib/api";
import styles from "./FeaturedBoost.module.css";
import HirerLayout from "../layout/HirerLayout";
import WorkerLayout from "../layout/WorkerLayout";
import { useAuthStore } from "../../store/authStore";

export default function FeaturedBoost({ onClose }) {
  const [packages, setPackages] = useState([]);
  const [current, setCurrent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedPkg, setSelectedPkg] = useState(null);
  const [selectedCat, setSelectedCat] = useState("");
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState("");
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  useEffect(() => {
    Promise.all([
      api.get("/featured/packages"),
      api.get("/featured/my"),
      api.get("/categories"),
    ])
      .then(([pkgRes, myRes, catRes]) => {
        setPackages(pkgRes.data.data.packages || []);
        setCurrent(myRes.data.data);
        setCategories(catRes.data.data.categories || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    setError("");
    try {
      const res = await api.post("/featured/checkout", {
        packageId: selectedPkg,
        categoryId: selectedCat || null,
      });
      window.location.href = res.data.data.url;
    } catch (err) {
      setError(err.response?.data?.message || "Checkout failed.");
      setPurchasing(false);
    }
  };

  const pkg = packages.find((p) => p.id === selectedPkg);

  return (
    <Layout>
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>⭐ Featured Listing</h2>
            <p className={styles.sub}>
              Appear at the top of search and get more visibility
            </p>
          </div>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose}>
              ×
            </button>
          )}
        </div>

        {/* Active listing */}
        {current?.isActive && current?.listing && (
          <div className={styles.activeBanner}>
            <span>⭐</span>
            <div>
              <p className={styles.activeTitle}>Featured listing is active</p>
              <p className={styles.activeExpiry}>
                Expires{" "}
                {new Date(current.listing.expiresAt).toLocaleDateString(
                  "en-GB",
                  {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  },
                )}
              </p>
            </div>
          </div>
        )}

        {success ? (
          <div className={styles.successState}>
            <span className={styles.successIcon}>⭐</span>
            <h3>You're now Featured!</h3>
            <p>
              Reference:{" "}
              <strong className={styles.ref}>{success.reference}</strong>
            </p>
            <p>
              Active until:{" "}
              {new Date(success.expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
            <button className={styles.doneBtn} onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Packages */}
            <div className={styles.pkgGrid}>
              {loading
                ? [1, 2, 3].map((i) => (
                    <div key={i} className={styles.skeleton} />
                  ))
                : packages.map((p) => (
                    <button
                      key={p.id}
                      className={`${styles.pkgCard} ${selectedPkg === p.id ? styles.pkgSelected : ""}`}
                      onClick={() => setSelectedPkg(p.id)}
                    >
                      {p.popular && (
                        <div className={styles.popularBadge}>Best Value</div>
                      )}
                      <div className={styles.pkgDays}>{p.days} Days</div>
                      <div className={styles.pkgName}>{p.name}</div>
                      <div className={styles.pkgPrice}>
                        <span className={styles.pkgCurrency}>{p.currency}</span>
                        <span className={styles.pkgAmount}>
                          {p.price.toLocaleString()}
                        </span>
                      </div>
                      <p className={styles.pkgDesc}>{p.description}</p>
                    </button>
                  ))}
            </div>

            {/* Optional category filter */}
            {selectedPkg && (
              <div className={styles.catSelect}>
                <label className={styles.catLabel}>
                  Feature in specific category (optional):
                </label>
                <select
                  className={styles.catInput}
                  value={selectedCat}
                  onChange={(e) => setSelectedCat(e.target.value)}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {error && <div className={styles.errorBox}>⚠️ {error}</div>}

            <div className={styles.footer}>
              {pkg && (
                <p className={styles.summary}>
                  {pkg.name} — {pkg.currency} {pkg.price.toLocaleString()} for{" "}
                  {pkg.days} days
                </p>
              )}
              <button
                className={styles.purchaseBtn}
                onClick={handlePurchase}
                disabled={!selectedPkg || purchasing}
              >
                {purchasing ? (
                  <>
                    <span className={styles.spinner} /> Activating...
                  </>
                ) : (
                  "⭐ Activate Featured Listing"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
