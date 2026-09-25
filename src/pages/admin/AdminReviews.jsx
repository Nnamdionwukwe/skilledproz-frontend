// src/pages/admin/AdminReviews.jsx
// Full admin reviews management.
//
// Endpoint: GET /admin/reviews?page=&limit=
// Response shape:
//   {
//     reviews: [{
//       id, bookingId, giverId, receiverId, rating, comment,
//       createdAt,
//       giver:    { id, firstName, lastName, avatar },
//       receiver: { id, firstName, lastName, avatar },
//       booking:  { id, title }
//     }],
//     total, page, pages
//   }
//
// Every field the backend sends is rendered. Additional context for the
// giver/receiver is fetched lazily via /admin/users/:userId when the admin
// opens the detail modal.
//
// Emojis removed. Fully responsive. Uses platform AlertModal and
// ConfirmationModal — no custom alert UI.

import { useState, useEffect, useCallback } from "react";
import { FiAlertTriangle, FiCheckCircle, FiTrash2 } from "react-icons/fi";
import AdminLayout from "../../components/layout/AdminLayout";
import AlertModal from "../../components/ui/AlertModal";
import ConfirmationModal from "../../components/ui/ConfirmationModal";
import api from "../../lib/api";
import styles from "./Admin.module.css";

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
  if (!d) return "—";
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

function initials(u) {
  return (
    `${u?.firstName?.[0] ?? ""}${u?.lastName?.[0] ?? ""}`.toUpperCase() || "?"
  );
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
        title="Copy"
        aria-label="Copy"
      >
        {ok ? "✓" : "⎘"}
      </button>
    </span>
  );
}

function Avatar({ user, size = "sm" }) {
  return (
    <div
      className={`${styles.avatar} ${size === "lg" ? styles.avatarLg : size === "xs" ? styles.avatarXs : ""}`}
    >
      {user?.avatar ? (
        <img src={user.avatar} alt="" />
      ) : (
        <span>{initials(user)}</span>
      )}
    </div>
  );
}

function Stars({ rating }) {
  return (
    <span className={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? styles.starOn : styles.starOff}>
          ★
        </span>
      ))}
    </span>
  );
}

// ─── Review Detail Modal ─────────────────────────────────────────────────────
// Fetches richer context for giver + receiver via /admin/users/:userId.
function ReviewDetailModal({ review, onClose, onDelete }) {
  const [giverDetail, setGiverDetail] = useState(null);
  const [receiverDetail, setReceiverDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api
        .get(`/admin/users/${review.giverId}`)
        .then((r) => r.data.data?.user ?? null)
        .catch(() => null),
      api
        .get(`/admin/users/${review.receiverId}`)
        .then((r) => r.data.data?.user ?? null)
        .catch(() => null),
    ]).then(([g, r]) => {
      if (cancelled) return;
      setGiverDetail(g);
      setReceiverDetail(r);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [review.giverId, review.receiverId]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        className={`${styles.modal} ${styles.modalLg}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>Review Detail</h3>
          <button
            className={styles.modalClose}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Rating hero */}
          <div className={styles.ratingHero}>
            <span className={styles.ratingHeroNum}>{review.rating}</span>
            <div className={styles.ratingHeroInfo}>
              <Stars rating={review.rating} />
              <span className={styles.ratingHeroLabel}>
                out of 5 · {fmtDateTime(review.createdAt)}
              </span>
            </div>
          </div>

          {/* Comment */}
          {review.comment && (
            <div className={styles.reviewCommentBlock}>
              <span className={styles.reviewCommentLabel}>Comment</span>
              <p className={styles.reviewCommentText}>{review.comment}</p>
            </div>
          )}

          {/* Identifiers */}
          <p className={styles.sectionTitle}>Identifiers</p>
          <div className={styles.detailGrid}>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Review ID</span>
              <CopyPill text={review.id} label={review.id.slice(0, 12) + "…"} />
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Booking ID</span>
              <CopyPill
                text={review.bookingId}
                label={review.bookingId.slice(0, 12) + "…"}
              />
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Giver ID</span>
              <CopyPill
                text={review.giverId}
                label={review.giverId.slice(0, 12) + "…"}
              />
            </div>
            <div className={styles.detailCell}>
              <span className={styles.detailLabel}>Receiver ID</span>
              <CopyPill
                text={review.receiverId}
                label={review.receiverId.slice(0, 12) + "…"}
              />
            </div>
          </div>

          {/* Giver detail */}
          <p className={styles.sectionTitle}>Giver (author of the review)</p>
          {loading ? (
            <div className={styles.detailSkeleton} />
          ) : giverDetail ? (
            <div className={styles.userBlock}>
              <Avatar user={giverDetail} size="lg" />
              <div className={styles.userBlockInfo}>
                <p className={styles.userBlockName}>
                  {giverDetail.firstName} {giverDetail.lastName}
                </p>
                <p className={styles.userBlockMeta}>
                  {giverDetail.email || "—"}
                </p>
                <p className={styles.userBlockMeta}>
                  {giverDetail.role || "—"}
                  {giverDetail.city || giverDetail.country
                    ? ` · ${[giverDetail.city, giverDetail.country]
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </p>
                <div className={styles.userBlockIds}>
                  <CopyPill
                    text={giverDetail.id}
                    label={giverDetail.id.slice(0, 12) + "…"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.userBlock}>
              <Avatar user={review.giver} size="lg" />
              <div className={styles.userBlockInfo}>
                <p className={styles.userBlockName}>
                  {review.giver?.firstName} {review.giver?.lastName}
                </p>
                <div className={styles.userBlockIds}>
                  <CopyPill
                    text={review.giver?.id}
                    label={review.giver?.id?.slice(0, 12) + "…"}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Receiver detail */}
          <p className={styles.sectionTitle}>
            Receiver (subject of the review)
          </p>
          {loading ? (
            <div className={styles.detailSkeleton} />
          ) : receiverDetail ? (
            <div className={styles.userBlock}>
              <Avatar user={receiverDetail} size="lg" />
              <div className={styles.userBlockInfo}>
                <p className={styles.userBlockName}>
                  {receiverDetail.firstName} {receiverDetail.lastName}
                </p>
                <p className={styles.userBlockMeta}>
                  {receiverDetail.email || "—"}
                </p>
                <p className={styles.userBlockMeta}>
                  {receiverDetail.role || "—"}
                  {receiverDetail.city || receiverDetail.country
                    ? ` · ${[receiverDetail.city, receiverDetail.country]
                        .filter(Boolean)
                        .join(", ")}`
                    : ""}
                </p>
                <div className={styles.userBlockIds}>
                  <CopyPill
                    text={receiverDetail.id}
                    label={receiverDetail.id.slice(0, 12) + "…"}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.userBlock}>
              <Avatar user={review.receiver} size="lg" />
              <div className={styles.userBlockInfo}>
                <p className={styles.userBlockName}>
                  {review.receiver?.firstName} {review.receiver?.lastName}
                </p>
                <div className={styles.userBlockIds}>
                  <CopyPill
                    text={review.receiver?.id}
                    label={review.receiver?.id?.slice(0, 12) + "…"}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Booking info */}
          {review.booking && (
            <>
              <p className={styles.sectionTitle}>Booking</p>
              <div className={styles.detailGrid}>
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Booking ID</span>
                  <CopyPill
                    text={review.booking.id}
                    label={review.booking.id.slice(0, 12) + "…"}
                  />
                </div>
                <div className={styles.detailCell}>
                  <span className={styles.detailLabel}>Title</span>
                  <span className={styles.detailVal}>
                    {review.booking.title || "—"}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Delete button */}
          <div className={styles.modalActions}>
            <button className={styles.btnGhost} onClick={onClose}>
              Close
            </button>
            <button
              className={styles.btnRed}
              onClick={() => {
                onClose();
                onDelete(review);
              }}
            >
              Delete Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleting, setDeleting] = useState(null);
  const [notify, setNotify] = useState(null); // { type: "error" | "success", text }
  const [detailReview, setDetailReview] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // review object pending delete

  const load = useCallback(async (p) => {
    setLoading(true);
    setNotify(null);
    try {
      const res = await api.get("/admin/reviews", {
        params: { page: p, limit: 15 },
      });
      setReviews(res.data.data.reviews);
      setTotal(res.data.data.total);
      setPages(Math.ceil(res.data.data.total / 15));
      setPage(p);
    } catch {
      setNotify({ type: "error", text: "Failed to load reviews." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  // Opens the ConfirmationModal
  function requestDelete(id) {
    setConfirmDelete(id);
  }

  // Runs after the user confirms in ConfirmationModal
  async function handleDelete(id) {
    setConfirmDelete(null);
    setDeleting(id);
    setNotify(null);
    try {
      await api.delete(`/admin/reviews/${id}`);
      setNotify({ type: "success", text: "Review deleted." });
      setReviews((prev) => prev.filter((r) => r.id !== id));
      setTotal((t) => t - 1);
    } catch (e) {
      setNotify({
        type: "error",
        text: e.response?.data?.message || "Failed to delete review.",
      });
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Content</p>
            <h1 className={styles.pageTitle}>
              Reviews
              {total > 0 && <span className={styles.countPill}>{total}</span>}
            </h1>
          </div>
        </div>

        <div className={styles.listWrap}>
          {loading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className={styles.skRow} />
            ))
          ) : reviews.length === 0 ? (
            <div className={styles.empty}>
              <span className={styles.emptyIcon}>★</span>
              <p className={styles.emptyTitle}>No reviews yet</p>
            </div>
          ) : (
            reviews.map((r, i) => (
              <div
                key={r.id}
                className={`${styles.reviewRow} ${styles.reviewRowClickable}`}
                style={{ animationDelay: `${i * 0.03}s` }}
                onClick={() => setDetailReview(r)}
              >
                <div className={styles.reviewLeft}>
                  {/* Stars + numeric */}
                  <div className={styles.stars}>
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span
                        key={s}
                        className={
                          s <= r.rating ? styles.starOn : styles.starOff
                        }
                      >
                        ★
                      </span>
                    ))}
                    <span className={styles.ratingNum}>{r.rating}/5</span>
                  </div>

                  {/* Comment */}
                  {r.comment && (
                    <p className={styles.reviewComment}>"{r.comment}"</p>
                  )}

                  {/* Party row: avatar + name + arrow + avatar + name */}
                  <div className={styles.reviewParties}>
                    <div className={styles.reviewPartyChip}>
                      <Avatar user={r.giver} size="xs" />
                      <span className={styles.reviewPartyName}>
                        {r.giver?.firstName} {r.giver?.lastName}
                      </span>
                    </div>
                    <span className={styles.reviewArrow}>→</span>
                    <div className={styles.reviewPartyChip}>
                      <Avatar user={r.receiver} size="xs" />
                      <span className={styles.reviewPartyName}>
                        {r.receiver?.firstName} {r.receiver?.lastName}
                      </span>
                    </div>
                  </div>

                  {/* Booking */}
                  {r.booking && (
                    <div className={styles.reviewBooking}>
                      <span className={styles.reviewBookingLabel}>Booking</span>
                      <span className={styles.reviewBookingTitle}>
                        {r.booking.title}
                      </span>
                      <CopyPill
                        text={r.bookingId}
                        label={`id ${r.bookingId.slice(0, 10)}…`}
                      />
                    </div>
                  )}

                  {/* IDs row */}
                  <div className={styles.reviewIdsRow}>
                    <CopyPill
                      text={r.id}
                      label={`review ${r.id.slice(0, 8)}…`}
                    />
                    <span className={styles.reviewDotSep}>·</span>
                    <span className={styles.reviewDateFull}>
                      {fmtDateTime(r.createdAt)}
                    </span>
                  </div>

                  <p className={styles.reviewDate}>{timeAgo(r.createdAt)}</p>
                </div>

                <button
                  className={styles.btnRed}
                  disabled={deleting === r.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    requestDelete(r.id);
                  }}
                >
                  {deleting === r.id ? <Spinner /> : "Delete"}
                </button>
              </div>
            ))
          )}
        </div>

        {pages > 1 && (
          <div className={styles.pager}>
            <button
              className={styles.pageBtn}
              disabled={page === 1}
              onClick={() => load(page - 1)}
            >
              ← Prev
            </button>
            <span className={styles.pageInfo}>
              {page} / {pages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page === pages}
              onClick={() => load(page + 1)}
            >
              Next →
            </button>
          </div>
        )}

        {/* Detail modal */}
        {detailReview && (
          <ReviewDetailModal
            review={detailReview}
            onClose={() => setDetailReview(null)}
            onDelete={(rev) => requestDelete(rev.id)}
          />
        )}

        {/* Platform confirmation modal (replaces window.confirm) */}
        <ConfirmationModal
          isOpen={confirmDelete !== null}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => confirmDelete && handleDelete(confirmDelete)}
          title="Delete this review?"
          message="This action cannot be undone. The review will be permanently removed from the platform."
          confirmLabel="Delete Review"
          cancelLabel="Cancel"
          confirmVariant="danger"
        />

        {/* Platform alert modal (replaces inline NotifyModal) */}
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
                    icon:
                      notify.type === "error" ? FiAlertTriangle : FiCheckCircle,
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
