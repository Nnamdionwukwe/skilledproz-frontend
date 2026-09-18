import { useState, useEffect } from "react";
import {
  FiTool,
  FiAlertTriangle,
  FiCheckCircle,
  FiX,
  FiStar,
} from "react-icons/fi";
import { HiOutlineRefresh } from "react-icons/hi";
import api from "../../../lib/api";
import { useAuthStore } from "../../../store/authStore";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import CategorySuggest from "../../../components/auth/CategorySuggest";
import styles from "./Categories.module.css";

export default function CategoriesPage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // ── Confirm modal state ───────────────────────────────────────────────
  const [confirmState, setConfirmState] = useState(null);
  // { linkId, name } | null

  const load = async () => {
    if (!user?.id) return;
    try {
      const res = await api.get(`/workers/${user.id}`);
      const wcs = res.data.data?.worker?.categories || [];
      setCategories(wcs);
      setSelected(wcs.map((wc) => wc.category));
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const handleSelect = async (cat) => {
    if (
      categories.find(
        (wc) => wc.category?.id === cat.id || wc.categoryId === cat.id,
      )
    ) {
      setError(`${cat.name} is already in your list.`);
      setTimeout(() => setError(""), 3000);
      return;
    }

    setSaving(cat.id);
    setError("");
    setSuccess("");
    try {
      await api.post("/workers/categories", {
        categoryId: cat.id,
        isPrimary: categories.length === 0,
      });
      await load();
      setSuccess(`${cat.name} added successfully!`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to add category.");
    } finally {
      setSaving(null);
    }
  };

  // ── Remove flow ──────────────────────────────────────────────────────
  // IMPORTANT: We pass the WorkerCategory link row's own id (wc.id) —
  // NOT the global Category id. The backend deletes the link row scoped
  // by workerProfileId; sending a category id would 404 (its own
  // primary key space, not the link's).
  const requestRemove = (linkId, name) => {
    setConfirmState({ linkId, name });
  };

  const cancelRemove = () => setConfirmState(null);

  const confirmRemove = async () => {
    if (!confirmState) return;
    const { linkId, name } = confirmState;

    setRemoving(linkId);
    setError("");
    setSuccess("");
    setConfirmState(null);

    try {
      await api.delete(`/workers/categories/${linkId}`);
      await load();
      setSuccess(`${name} removed.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to remove category.");
    } finally {
      setRemoving(null);
    }
  };

  const handleSetPrimary = async (categoryId) => {
    try {
      await api.post("/workers/categories", { categoryId, isPrimary: true });
      await load();
    } catch {}
  };

  return (
    <WorkerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Trade Categories</h1>
          <p className={styles.sub}>
            Add the trades and professions you offer. Search from{" "}
            <strong>800+ categories</strong> or add your own.
          </p>
        </div>

        {error && (
          <div className={styles.errorBox}>
            <FiAlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className={styles.successBox}>
            <FiCheckCircle size={14} />
            <span>{success}</span>
          </div>
        )}

        {/* Category picker */}
        <div className={styles.pickerCard}>
          <h2 className={styles.cardTitle}>Add a Category</h2>
          <p className={styles.cardSub}>
            Search for your trade — it's already in our database.
          </p>
          <CategorySuggest
            onSelect={handleSelect}
            selected={selected}
            placeholder="Search plumber, electrician, developer..."
          />
          {saving && (
            <p className={styles.savingMsg}>
              <HiOutlineRefresh className={styles.spinInline} size={13} />
              <span>Adding category...</span>
            </p>
          )}
        </div>

        {/* Current categories */}
        <div className={styles.listCard}>
          <div className={styles.listHeader}>
            <h2 className={styles.cardTitle}>My Categories</h2>
            <span className={styles.countBadge}>{categories.length}</span>
          </div>

          {loading ? (
            [1, 2, 3].map((i) => <div key={i} className={styles.skeleton} />)
          ) : categories.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>
                <FiTool size={32} />
              </span>
              <p className={styles.emptyTitle}>No categories yet</p>
              <p className={styles.emptySub}>
                Search and add your trade above to appear in search results
              </p>
            </div>
          ) : (
            <div className={styles.catList}>
              {categories.map((wc) => {
                const cat = wc.category || wc;
                const catId = wc.categoryId || cat.id; // for Set Primary
                const linkId = wc.id; // for Remove
                return (
                  <div
                    key={linkId || catId}
                    className={`${styles.catRow} ${wc.isPrimary ? styles.catRowPrimary : ""}`}
                  >
                    <div className={styles.catLeft}>
                      <span className={styles.catIcon}>
                        <FiTool size={18} />
                      </span>
                      <div>
                        <p className={styles.catName}>{cat?.name}</p>
                        <p className={styles.catSlug}>{cat?.slug}</p>
                      </div>
                    </div>
                    <div className={styles.catRight}>
                      {wc.isPrimary ? (
                        <span className={styles.primaryBadge}>
                          <FiStar size={11} />
                          <span>Primary</span>
                        </span>
                      ) : (
                        <button
                          className={styles.setPrimaryBtn}
                          onClick={() => handleSetPrimary(catId)}
                          type="button"
                        >
                          <FiStar size={12} />
                          <span>Set Primary</span>
                        </button>
                      )}
                      <button
                        className={styles.removeBtn}
                        disabled={removing === linkId}
                        onClick={() => requestRemove(linkId, cat?.name)}
                        type="button"
                        aria-label={`Remove ${cat?.name}`}
                      >
                        {removing === linkId ? (
                          <HiOutlineRefresh
                            size={14}
                            className={styles.spinInline}
                          />
                        ) : (
                          <FiX size={14} />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Confirm-remove modal ─────────────────────────────────────── */}
      {confirmState && (
        <div
          className={styles.modalOverlay}
          onClick={cancelRemove}
          role="dialog"
          aria-modal="true"
          aria-labelledby="remove-cat-title"
        >
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalIconWrap}>
              <FiAlertTriangle
                size={24}
                className={styles.modalIcon}
                aria-hidden="true"
              />
            </div>
            <h3 id="remove-cat-title" className={styles.modalTitle}>
              Remove category?
            </h3>
            <p className={styles.modalText}>
              <strong>{confirmState.name}</strong> will be removed from your
              trade list. You can always add it back later.
            </p>
            <div className={styles.modalActions}>
              <button
                className={styles.modalCancelBtn}
                onClick={cancelRemove}
                type="button"
              >
                Keep it
              </button>
              <button
                className={styles.modalConfirmBtn}
                onClick={confirmRemove}
                type="button"
              >
                Yes, remove
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkerLayout>
  );
}
