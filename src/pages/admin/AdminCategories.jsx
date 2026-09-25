// src/pages/admin/AdminCategories.jsx
// Full admin categories management.
//
// Endpoints:
//   GET    /admin/categories?search=&page=&limit=      (paginated, richer than public)
//   POST   /admin/categories                            { name, slug, description, icon, parentId }
//   PATCH  /admin/categories/:categoryId                { name, slug, description, icon, parentId }
//   DELETE /admin/categories/:categoryId
//
// Every field the backend sends is rendered:
//   id, name, slug, description, icon, parentId, isUserSubmitted, submittedBy,
//   createdAt, updatedAt, parent { id, name, icon, slug }, children[],
//   _count { workers, bookings, jobPosts }
//
// Emojis removed. Fully responsive. Uses platform AlertModal + ConfirmationModal.

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Tag,
  Hammer,
  ClipboardList,
  FileText,
  Search,
  X,
  Pencil,
  Trash2,
  Plus,
  Moon,
  FolderTree,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle,
  Inbox,
} from "lucide-react";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import api from "../../lib/api";
import styles from "./AdminCategories.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function autoSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timeAgo(d) {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(String(text));
    return true;
  } catch {
    return false;
  }
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function Spinner() {
  return <span className={styles.spinner} />;
}

function CopyPill({ text, label }) {
  const [ok, setOk] = useState(false);
  if (!text) return <span className={styles.dimText}>—</span>;
  return (
    <span className={styles.copyPill} title={String(text)}>
      <span className={styles.copyPillText}>{label ?? text}</span>
      <button
        type="button"
        className={styles.copyPillBtn}
        onClick={async (e) => {
          e.stopPropagation();
          if (await copyText(text)) {
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }
        }}
        aria-label="Copy"
      >
        {ok ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}

function StatChip({ icon: Icon, label, value, accent }) {
  return (
    <div
      className={`${styles.statChip} ${accent ? styles[`chipAccent_${accent}`] : ""}`}
    >
      <span className={styles.chipIcon}>
        {Icon ? <Icon size={16} /> : null}
      </span>
      <div className={styles.chipBody}>
        <div className={styles.chipVal}>{value ?? "—"}</div>
        <div className={styles.chipLabel}>{label}</div>
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
        await api.patch(`/admin/categories/${editing.id}`, payload);
        onSaved(`"${form.name}" updated`);
      } else {
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
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <form className={styles.modalForm} onSubmit={handleSubmit}>
          {/* Icon + Name on same row */}
          <div className={styles.iconNameRow}>
            <div className={styles.iconPreview}>
              {form.icon || <Tag size={18} />}
            </div>
            <div className={`${styles.formField} ${styles.flexOne}`}>
              <label className={styles.formLabel}>Icon</label>
              <input
                className={styles.input}
                value={form.icon}
                onChange={(e) => setField("icon", e.target.value)}
                placeholder="Optional icon"
                maxLength={8}
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

          {/* parentId — wires the Category.parentId relation */}
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

          {editing && (
            <div className={styles.metaGrid}>
              <div className={styles.metaCell}>
                <span className={styles.metaLabel}>ID</span>
                <CopyPill
                  text={editing.id}
                  label={editing.id.slice(0, 12) + "…"}
                />
              </div>
              {editing.createdAt && (
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>Created</span>
                  <span className={styles.metaVal}>
                    {fmtDateTime(editing.createdAt)}
                  </span>
                </div>
              )}
              {editing.updatedAt && (
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>Updated</span>
                  <span className={styles.metaVal}>
                    {fmtDateTime(editing.updatedAt)}
                  </span>
                </div>
              )}
              <div className={styles.metaCell}>
                <span className={styles.metaLabel}>Source</span>
                <span className={styles.metaVal}>
                  {editing.isUserSubmitted ? "User submitted" : "Seeded"}
                </span>
              </div>
              {editing.submittedBy && (
                <div className={styles.metaCell}>
                  <span className={styles.metaLabel}>Submitted by</span>
                  <CopyPill
                    text={editing.submittedBy}
                    label={editing.submittedBy.slice(0, 12) + "…"}
                  />
                </div>
              )}
            </div>
          )}

          {error && (
            <div className={styles.inlineError}>
              <AlertTriangle size={13} /> {error}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Spinner /> Saving…
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

  const isEdited =
    cat.updatedAt && cat.createdAt && cat.updatedAt !== cat.createdAt;

  return (
    <div className={styles.catCard} style={{ animationDelay: `${i * 30}ms` }}>
      <div className={styles.catCardTop}>
        <div className={styles.catCardIconWrap}>
          <span className={styles.catCardIcon}>
            {cat.icon || <Tag size={20} />}
          </span>
        </div>
        <div className={styles.catCardActions}>
          <button
            className={styles.iconBtn}
            onClick={() => onEdit(cat)}
            title="Edit"
            aria-label="Edit"
          >
            <Pencil size={13} />
          </button>
          <button
            className={styles.iconBtnRed}
            onClick={() => onDelete(cat)}
            title="Delete"
            aria-label="Delete"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className={styles.catCardBody}>
        <div className={styles.catCardNameRow}>
          <p className={styles.catCardName}>{cat.name}</p>
          {cat.isUserSubmitted && (
            <span className={styles.userSubmittedTag}>User</span>
          )}
        </div>

        {cat.parent && (
          <p className={styles.catCardParent}>
            <FolderTree size={11} /> {cat.parent.icon || ""} {cat.parent.name}
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

        {/* Children chips */}
        {Array.isArray(cat.children) && cat.children.length > 0 && (
          <div className={styles.childRow}>
            {cat.children.slice(0, 3).map((ch) => (
              <span key={ch.id} className={styles.childChip}>
                {ch.icon ? `${ch.icon} ` : ""}
                {ch.name}
              </span>
            ))}
            {cat.children.length > 3 && (
              <span className={styles.childChipDim}>
                +{cat.children.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Identifiers */}
        <div className={styles.catCardIds}>
          <CopyPill text={cat.id} label={`id ${cat.id.slice(0, 8)}…`} />
        </div>
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
          <Hammer size={11} /> {cat._count?.workers || 0} workers
        </span>
        <span className={styles.statPill}>
          <ClipboardList size={11} /> {cat._count?.bookings || 0} jobs
        </span>
        <span className={styles.statPillDim}>
          <FileText size={11} /> {cat._count?.jobPosts || 0} posts
        </span>
      </div>

      {/* Timestamps */}
      <div className={styles.catCardTimes}>
        <span className={styles.catCardTime}>
          {timeAgo(cat.createdAt)} · {fmtDate(cat.createdAt)}
        </span>
        {isEdited && (
          <span className={styles.catCardTime}>
            edited {timeAgo(cat.updatedAt)}
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

  const [notify, setNotify] = useState(null); // { type: "error" | "success", text }

  function showToast(msg, type = "success") {
    setNotify({ type, text: msg });
  }

  function setParam(k, v) {
    const p = new URLSearchParams(searchParams);
    if (v) p.set(k, v);
    else p.delete(k);
    if (k !== "page") p.set("page", "1");
    setSearchParams(p);
  }

  // ── Fetch — GET /admin/categories ─────────────────────────────────────────

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
    const target = deleteTarget;
    setDeleteTarget(null);
    setDeleting(true);
    try {
      await api.delete(`/admin/categories/${target.id}`);
      showToast(`"${target.name}" deleted`, "success");
      fetchCategories();
    } catch (e) {
      showToast(e.response?.data?.message || "Failed to delete", "error");
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
            <Plus size={13} /> New Category
          </button>
        </div>

        {/* ── Stats Bar ── */}
        <div className={styles.statsBar}>
          <StatChip icon={Tag} label="Total" value={total} />
          <StatChip
            icon={Hammer}
            label="Workers"
            value={totalWorkers.toLocaleString()}
            accent="orange"
          />
          <StatChip
            icon={ClipboardList}
            label="Bookings"
            value={totalBookings.toLocaleString()}
            accent="green"
          />
          <StatChip
            icon={Moon}
            label="Unused"
            value={unusedCount}
            accent={unusedCount > 0 ? "red" : undefined}
          />
        </div>

        {/* ── Search + Sort ── */}
        <div className={styles.controlBar}>
          <div className={styles.searchWrap}>
            <span className={styles.searchIcon}>
              <Search size={13} />
            </span>
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
                aria-label="Clear search"
              >
                <X size={13} />
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
            <span className={styles.emptyIcon}>
              <Inbox size={40} />
            </span>
            <p className={styles.emptyTitle}>
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
                <Plus size={13} /> Create First Category
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
              <ChevronLeft size={13} /> Prev
            </button>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => setParam("page", String(page + 1))}
            >
              Next <ChevronRight size={13} />
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
              showToast(msg, "success");
              fetchCategories();
            }}
          />
        )}

        {/* ── Platform confirmation modal ── */}
        <ConfirmationModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete this category?"
          message={
            deleteTarget
              ? `"${deleteTarget.name}" will be permanently removed. ${
                  (deleteTarget._count?.workers || 0) > 0 ||
                  (deleteTarget._count?.bookings || 0) > 0
                    ? `This category is linked to ${deleteTarget._count?.workers || 0} worker(s) and ${deleteTarget._count?.bookings || 0} booking(s), and cannot be deleted.`
                    : "This action cannot be undone."
                }`
              : ""
          }
          confirmLabel="Delete Category"
          cancelLabel="Cancel"
          confirmVariant="danger"
        />

        {/* ── Platform alert modal ── */}
        <AlertModal
          isOpen={!!notify}
          onClose={() => setNotify(null)}
          title={notify?.type === "error" ? "Something went wrong" : "Done"}
          subtitle={
            notify?.type === "error"
              ? "The action could not be completed."
              : "The action was completed successfully."
          }
          alerts={
            notify
              ? [
                  {
                    icon: notify.type === "error" ? AlertTriangle : CheckCircle,
                    label: notify.type === "error" ? "Error" : "Success",
                    description: notify.text,
                    variant: notify.type === "error" ? "red" : "green",
                  },
                ]
              : []
          }
        />
      </div>
    </AdminLayout>
  );
}
