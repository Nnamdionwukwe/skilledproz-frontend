import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminCategories.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
      {toast.msg}
    </div>
  );
}

// ─── Stat Chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>{icon}</span>
      <div>
        <div className={styles.chipVal}>{value ?? "—"}</div>
        <div className={styles.chipLabel}>{label}</div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ category, onConfirm, onClose, loading }) {
  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle} style={{ color: "var(--red)" }}>
            Delete Category
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.deletePreview}>
            <span className={styles.deleteIcon}>{category.icon || "🔧"}</span>
            <div>
              <p className={styles.deleteName}>{category.name}</p>
              <p className={styles.deleteSlug}>{category.slug}</p>
            </div>
          </div>
          <p className={styles.deleteWarning}>
            This will permanently delete <strong>{category.name}</strong>.
            {(category._count?.workers > 0 ||
              category._count?.bookings > 0) && (
              <span className={styles.deleteConflict}>
                {" "}
                ⚠️ Cannot delete — {category._count?.workers || 0} workers and{" "}
                {category._count?.bookings || 0} bookings are linked to this
                category.
              </span>
            )}
          </p>
          <div className={styles.modalActions}>
            <button
              className={styles.modalCancel}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className={styles.modalDelete}
              onClick={onConfirm}
              disabled={
                loading ||
                category._count?.workers > 0 ||
                category._count?.bookings > 0
              }
            >
              {loading ? <span className={styles.spinner} /> : "Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({ editing, allCategories, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: editing?.name || "",
    slug: editing?.slug || "",
    description: editing?.description || "",
    icon: editing?.icon || "",
    parentId: editing?.parentId || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Available parents — exclude self and its children
  const parentOptions = allCategories.filter((c) => c.id !== editing?.id);

  function setField(k, v) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || undefined,
        icon: form.icon.trim() || undefined,
        parentId: form.parentId || undefined,
      };

      if (editing) {
        // PATCH — not PUT — /admin/categories/:categoryId
        await api.patch(`/admin/categories/${editing.id}`, payload);
        onSaved(`"${form.name}" updated`);
      } else {
        // POST /admin/categories
        await api.post("/admin/categories", payload);
        onSaved(`"${form.name}" created`);
      }
      onClose();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <p className={styles.modalTitle}>
            {editing ? "Edit Category" : "New Category"}
          </p>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          {/* Icon + Name on same row */}
          <div className={styles.iconNameRow}>
            <div className={styles.iconPreview}>{form.icon || "🔧"}</div>
            <div className={styles.formField} style={{ flex: 1 }}>
              <label className={styles.formLabel}>Icon (emoji)</label>
              <input
                className={styles.input}
                value={form.icon}
                onChange={(e) => setField("icon", e.target.value)}
                placeholder="🔧"
                maxLength={4}
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Name *</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={(e) => {
                setField("name", e.target.value);
                if (!editing) setField("slug", autoSlug(e.target.value));
              }}
              placeholder="e.g. Plumbing"
              required
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Slug *</label>
            <div className={styles.slugWrap}>
              <span className={styles.slugPrefix}>/</span>
              <input
                className={`${styles.input} ${styles.slugInput}`}
                value={form.slug}
                onChange={(e) => setField("slug", e.target.value)}
                placeholder="plumbing"
                required
              />
            </div>
          </div>

          {/* parentId — new field wiring the Category.parentId relation */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>
              Parent Category (optional)
            </label>
            <select
              className={styles.select}
              value={form.parentId}
              onChange={(e) => setField("parentId", e.target.value)}
            >
              <option value="">— None (top-level) —</option>
              {parentOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Description</label>
            <textarea
              className={styles.textarea}
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              placeholder="Short description shown to hirers and workers…"
              rows={3}
            />
          </div>

          {error && <div className={styles.inlineError}>⚠️ {error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className={styles.spinner} /> Saving…
              </>
            ) : editing ? (
              "Save Changes"
            ) : (
              "Create Category"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Category Card ────────────────────────────────────────────────────────────

function CategoryCard({ cat, maxBookings, onEdit, onDelete, i }) {
  const bookingPct =
    maxBookings > 0
      ? Math.min(
          100,
          Math.round(((cat._count?.bookings || 0) / maxBookings) * 100),
        )
      : 0;

  return (
    <div className={styles.catCard} style={{ animationDelay: `${i * 30}ms` }}>
      <div className={styles.catCardTop}>
        <div className={styles.catCardIconWrap}>
          <span className={styles.catCardIcon}>{cat.icon || "🔧"}</span>
        </div>
        <div className={styles.catCardActions}>
          <button
            className={styles.iconBtn}
            onClick={() => onEdit(cat)}
            title="Edit"
          >
            ✎
          </button>
          <button
            className={styles.iconBtnRed}
            onClick={() => onDelete(cat)}
            title="Delete"
          >
            ✕
          </button>
        </div>
      </div>

      <div className={styles.catCardBody}>
        <p className={styles.catCardName}>{cat.name}</p>
        {cat.parent && (
          <p className={styles.catCardParent}>
            ↳ {cat.parent.icon || ""} {cat.parent.name}
          </p>
        )}
        <p className={styles.catCardSlug}>/{cat.slug}</p>
        {cat.description && (
          <p className={styles.catCardDesc}>
            {cat.description.length > 72
              ? cat.description.slice(0, 72) + "…"
              : cat.description}
          </p>
        )}
      </div>

      {/* Usage bar */}
      <div className={styles.usageBar}>
        <div
          className={styles.usageBarFill}
          style={{ width: `${bookingPct}%` }}
          title={`${cat._count?.bookings || 0} bookings`}
        />
      </div>

      {/* Stats row */}
      <div className={styles.catCardStats}>
        <span className={styles.statPill}>
          🔨 {cat._count?.workers || 0} workers
        </span>
        <span className={styles.statPill}>
          📋 {cat._count?.bookings || 0} jobs
        </span>
        {(cat._count?.jobPosts ?? 0) > 0 && (
          <span className={styles.statPillDim}>
            📝 {cat._count.jobPosts} posts
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "name", label: "A–Z" },
  { value: "bookings", label: "Most Booked" },
  { value: "workers", label: "Most Workers" },
];

export default function AdminCategories() {
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get("search") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "name";

  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  // ── Fetch — GET /admin/categories (not the public endpoint) ───────────────

  const fetchCategories = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 24 };
    if (search) params.search = search;

    api
      .get("/admin/categories", { params })
      .then((r) => {
        const d = r.data.data;
        let cats = d.categories || [];

        // Client-side sort since the controller sorts by name only
        if (sort === "bookings")
          cats = [...cats].sort(
            (a, b) => (b._count?.bookings || 0) - (a._count?.bookings || 0),
          );
        if (sort === "workers")
          cats = [...cats].sort(
            (a, b) => (b._count?.workers || 0) - (a._count?.workers || 0),
          );

        setCategories(cats);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
      })
      .catch(() => showToast("Failed to load categories", "error"))
      .finally(() => setLoading(false));
  }, [search, page, sort]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // ── Delete — DELETE /admin/categories/:categoryId ─────────────────────────

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/categories/${deleteTarget.id}`);
      showToast(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to delete", "error");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Derived stats ─────────────────────────────────────────────────────────

  const maxBookings = Math.max(
    ...categories.map((c) => c._count?.bookings || 0),
    1,
  );
  const totalWorkers = categories.reduce(
    (s, c) => s + (c._count?.workers || 0),
    0,
  );
  const totalBookings = categories.reduce(
    (s, c) => s + (c._count?.bookings || 0),
    0,
  );
  const unusedCount = categories.filter(
    (c) => (c._count?.bookings || 0) === 0,
  ).length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <AdminLayout>
      <div className={styles.page}>
        <Toast toast={toast} />

        {/* ── Header ── */}
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Content</p>
            <h1 className={styles.pageTitle}>
              Categories
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
          <button
            className={styles.primaryBtn}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            + New Category
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className={styles.statsBar}>
          <StatChip icon="🏷️" label="Total" value={total} />
          <StatChip
            icon="🔨"
            label="Workers"
            value={totalWorkers.toLocaleString()}
            accent="orange"
          />
          <StatChip
            icon="📋"
            label="Bookings"
            value={totalBookings.toLocaleString()}
            accent="green"
          />
          <StatChip
            icon="💤"
            label="Unused"
            value={unusedCount}
            accent={unusedCount > 0 ? "red" : undefined}
          />
        </div>

        {/* ── Search + Sort ── */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              className={styles.searchInput}
              placeholder="Search name or slug…"
              value={search}
              onChange={(e) => setParam("search", e.target.value)}
            />
            {search && (
              <button
                className={styles.clearBtn}
                onClick={() => setParam("search", "")}
              >
                ×
              </button>
            )}
          </div>
          <div className={styles.sortGroup}>
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`${styles.sortBtn} ${sort === opt.value ? styles.sortBtnActive : ""}`}
                onClick={() => setParam("sort", opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <span className={styles.totalPill}>{total} categories</span>
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className={styles.catGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className={styles.empty}>
            <span>🏷️</span>
            <p>
              {search
                ? `No categories matching "${search}"`
                : "No categories yet"}
            </p>
            {!search && (
              <button
                className={styles.primaryBtn}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                + Create First Category
              </button>
            )}
          </div>
        ) : (
          <div className={styles.catGrid}>
            {categories.map((c, i) => (
              <CategoryCard
                key={c.id}
                cat={c}
                maxBookings={maxBookings}
                onEdit={(cat) => {
                  setEditing(cat);
                  setFormOpen(true);
                }}
                onDelete={(cat) => setDeleteTarget(cat)}
                i={i}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => setParam("page", String(page - 1))}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next →
            </button>
          </div>
        )}

        {/* ── Form Modal ── */}
        {formOpen && (
          <CategoryFormModal
            editing={editing}
            allCategories={categories}
            onClose={() => setFormOpen(false)}
            onSaved={(msg) => {
              showToast(msg);
              fetchCategories();
            }}
          />
        )}

        {/* ── Delete Confirm Modal ── */}
        {deleteTarget && (
          <DeleteModal
            category={deleteTarget}
            loading={deleting}
            onConfirm={handleDelete}
            onClose={() => setDeleteTarget(null)}
          />
        )}
      </div>
    </AdminLayout>
  );
}
