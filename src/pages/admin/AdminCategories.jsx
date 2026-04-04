import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./Admin.module.css";

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    icon: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setCategories(res.data.data || []);
    } catch {
      setError("Failed to load categories.");
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", slug: "", description: "", icon: "" });
    setShowForm(true);
  }
  function openEdit(c) {
    setEditing(c);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description || "",
      icon: c.icon || "",
    });
    setShowForm(true);
  }

  function autoSlug(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (editing) {
        await api.put(`/admin/categories/${editing.id}`, form);
        setSuccess("Category updated.");
      } else {
        await api.post("/admin/categories", form);
        setSuccess("Category created.");
      }
      setShowForm(false);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to save category.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`))
      return;
    setError("");
    setSuccess("");
    try {
      await api.delete(`/admin/categories/${id}`);
      setSuccess(`"${name}" deleted.`);
      load();
    } catch (e) {
      setError(e.response?.data?.message || "Failed to delete.");
    }
  }

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Content</p>
            <h1 className={styles.pageTitle}>
              Categories
              <span className={styles.countPill}>{categories.length}</span>
            </h1>
          </div>
          <button className={styles.primaryBtn} onClick={openCreate}>
            + New Category
          </button>
        </div>

        {error && (
          <Alert type="error" text={error} onClose={() => setError("")} />
        )}
        {success && (
          <Alert type="success" text={success} onClose={() => setSuccess("")} />
        )}

        {/* Search */}
        <div className={styles.searchBar}>
          <span className={styles.searchIcon}>🔍</span>
          <input
            className={styles.searchInput}
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.catGrid}>
            {[...Array(12)].map((_, i) => (
              <div key={i} className={styles.skCard} />
            ))}
          </div>
        ) : (
          <div className={styles.catGrid}>
            {filtered.map((c, i) => (
              <div
                key={c.id}
                className={styles.catCard}
                style={{ animationDelay: `${i * 0.03}s` }}
              >
                <div className={styles.catCardTop}>
                  <span className={styles.catCardIcon}>{c.icon || "🔧"}</span>
                  <div className={styles.catCardActions}>
                    <button
                      className={styles.iconBtn}
                      onClick={() => openEdit(c)}
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      className={styles.iconBtnRed}
                      onClick={() => handleDelete(c.id, c.name)}
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <p className={styles.catCardName}>{c.name}</p>
                <p className={styles.catCardSlug}>{c.slug}</p>
                {c.description && (
                  <p className={styles.catCardDesc}>{c.description}</p>
                )}
                <div className={styles.catCardStats}>
                  <span>{c._count?.workers || 0} workers</span>
                  <span>{c._count?.bookings || 0} bookings</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div
            className={styles.backdrop}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowForm(false);
            }}
          >
            <div className={styles.modal}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  {editing ? "Edit Category" : "New Category"}
                </h2>
                <button
                  className={styles.modalClose}
                  onClick={() => setShowForm(false)}
                >
                  ✕
                </button>
              </div>
              <form className={styles.modalForm} onSubmit={handleSubmit}>
                <Field label="Name *">
                  <input
                    className={styles.input}
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        name: e.target.value,
                        slug: editing ? f.slug : autoSlug(e.target.value),
                      }))
                    }
                    placeholder="e.g. Plumbing"
                    required
                  />
                </Field>
                <Field label="Slug *">
                  <input
                    className={styles.input}
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: e.target.value }))
                    }
                    placeholder="e.g. plumbing"
                    required
                  />
                </Field>
                <Field label="Icon (emoji)">
                  <input
                    className={styles.input}
                    value={form.icon}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, icon: e.target.value }))
                    }
                    placeholder="🔧"
                    maxLength={4}
                  />
                </Field>
                <Field label="Description">
                  <textarea
                    className={styles.textarea}
                    value={form.description}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, description: e.target.value }))
                    }
                    placeholder="Short description..."
                    rows={3}
                  />
                </Field>
                {error && <div className={styles.inlineError}>⚠️ {error}</div>}
                <button
                  type="submit"
                  className={styles.submitBtn}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Spinner />
                  ) : editing ? (
                    "Save Changes"
                  ) : (
                    "Create Category"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

function Field({ label, children }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}</label>
      {children}
    </div>
  );
}
function Alert({ type, text, onClose }) {
  return (
    <div className={`${styles.alert} ${styles[`alert_${type}`]}`}>
      <span>
        {type === "error" ? "⚠️" : "✅"} {text}
      </span>
      <button onClick={onClose} className={styles.alertClose}>
        ×
      </button>
    </div>
  );
}
function Spinner() {
  return <span className={styles.spinner} />;
}
