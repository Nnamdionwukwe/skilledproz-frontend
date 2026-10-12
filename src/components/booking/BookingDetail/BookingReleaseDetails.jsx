// src/components/booking/BookingReleaseDetails.jsx
//
// Booking detail → Release details card.
//
// Visible to BOTH the hirer and the worker whenever the booking's payment
// has at least one partial (or final) release recorded. Backed by
// Payment.releases (PaymentRelease[]), which is included by
// GET /api/payments/:bookingId.
//
// If the payment has no releases yet, this component renders nothing —
// the caller doesn't need to guard.

import { useState, useMemo } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaMoneyBillWave,
  FaUser,
  FaClock,
  FaLock,
  FaCheckCircle,
} from "react-icons/fa";
import styles from "./BookingReleaseDetails.module.css";

function formatMoney(amount, currency = "NGN") {
  const n = Number(amount);
  if (amount == null || isNaN(n)) return "—";
  return `${currency} ${n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDateTime(date) {
  if (!date) return "—";
  const d = new Date(date);
  return `${d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })} · ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export default function BookingReleaseDetails({
  payment,
  currency: currencyProp,
  defaultOpen = false,
}) {
  const releases = Array.isArray(payment?.releases) ? payment.releases : [];
  const hasReleases = releases.length > 0;

  const [open, setOpen] = useState(defaultOpen);

  // ── Derived money values ────────────────────────────────────────────
  const currency = currencyProp || payment?.currency || "NGN";
  const workerPayout = Number(payment?.workerPayout) || 0;
  const releasedAmount = Number(payment?.releasedAmount) || 0;
  const remaining = useMemo(
    () => parseFloat(Math.max(0, workerPayout - releasedAmount).toFixed(2)),
    [workerPayout, releasedAmount],
  );
  const releaseCount = Number(payment?.releaseCount) || releases.length;
  const releasedPct =
    workerPayout > 0 ? Math.round((releasedAmount / workerPayout) * 100) : 0;
  const isFullyReleased =
    workerPayout > 0 && remaining === 0 && releasedAmount > 0;

  // Sort releases newest-first for display.
  const sortedReleases = useMemo(
    () =>
      [...releases].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
      ),
    [releases],
  );

  // Hide the card entirely when there's nothing to show.
  if (!hasReleases) return null;

  return (
    <section className={styles.section}>
      {/* Header row — always visible */}
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Hide release details" : "Show release details"}
      >
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>
            {isFullyReleased ? <FaCheckCircle /> : <FaMoneyBillWave />}
          </span>
          <div>
            <p className={styles.headerTitle}>
              {isFullyReleased
                ? "Payment Fully Released"
                : `Release Details (${releaseCount})`}
            </p>
            <p className={styles.headerSub}>
              {formatMoney(releasedAmount, currency)} released
              {!isFullyReleased && (
                <> · {formatMoney(remaining, currency)} still in escrow</>
              )}
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          {/* Progress bar */}
          <div className={styles.progressWrap} aria-hidden="true">
            <div
              className={`${styles.progressBar} ${
                isFullyReleased ? styles.progressBarDone : ""
              }`}
              style={{ width: `${Math.min(100, releasedPct)}%` }}
            />
          </div>
          <span className={styles.progressLabel}>{releasedPct}%</span>
          <span className={styles.chevron}>
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </span>
        </div>
      </button>

      {/* Expanded body */}
      {open && (
        <div className={styles.body}>
          {/* Summary block */}
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Worker payout total</span>
              <span className={styles.summaryValue}>
                {formatMoney(workerPayout, currency)}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabel}>Released so far</span>
              <span
                className={styles.summaryValue}
                style={{ color: "var(--orange)" }}
              >
                {formatMoney(releasedAmount, currency)} ({releasedPct}%)
              </span>
            </div>
            <div className={styles.summaryDivider} />
            <div className={styles.summaryRow}>
              <span className={styles.summaryLabelStrong}>
                Remaining in escrow
              </span>
              <span
                className={styles.summaryValueStrong}
                style={{
                  color: isFullyReleased ? "var(--green)" : "var(--orange)",
                }}
              >
                {formatMoney(remaining, currency)}
              </span>
            </div>
            {isFullyReleased && (
              <p className={styles.fullyReleasedNote}>
                <FaLock style={{ marginRight: "6px" }} />
                All funds have been released. This payment is closed.
              </p>
            )}
          </div>

          {/* Release timeline */}
          <div className={styles.timelineWrap}>
            <p className={styles.timelineTitle}>Release history</p>
            <div className={styles.timeline}>
              {sortedReleases.map((r, i) => {
                const isLatest = i === 0;
                const by = r.releasedBy;
                const releasedByLabel = by
                  ? by.role === "HIRER"
                    ? `Hirer · ${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
                    : by.role === "ADMIN"
                      ? `Admin · ${by.firstName ?? ""} ${by.lastName ?? ""}`.trim()
                      : `${by.firstName ?? ""} ${by.lastName ?? ""}`.trim() ||
                        "System"
                  : "System";

                return (
                  <div key={r.id} className={styles.timelineItem}>
                    <div className={styles.timelineMarkerCol}>
                      <span
                        className={`${styles.timelineDot} ${
                          isLatest ? styles.timelineDotLatest : ""
                        }`}
                      />
                      {i < sortedReleases.length - 1 && (
                        <span className={styles.timelineLine} />
                      )}
                    </div>

                    <div className={styles.timelineBody}>
                      <div className={styles.timelineTopRow}>
                        <span className={styles.timelineAmount}>
                          {formatMoney(r.amount, r.currency || currency)}
                        </span>
                        {isLatest && (
                          <span className={styles.timelineBadge}>Latest</span>
                        )}
                      </div>

                      <div className={styles.timelineMeta}>
                        <span className={styles.timelineMetaItem}>
                          <FaClock />
                          {formatDateTime(r.createdAt)}
                        </span>
                        <span className={styles.timelineMetaItem}>
                          <FaUser />
                          {releasedByLabel}
                        </span>
                      </div>

                      {r.note && (
                        <p className={styles.timelineNote}>
                          <span className={styles.timelineNoteLabel}>
                            Note:
                          </span>{" "}
                          {r.note}
                        </p>
                      )}

                      {/* Per-release snapshot — what was remaining before / after */}
                      {(r.remainingBefore != null ||
                        r.remainingAfter != null) && (
                        <div className={styles.timelineSnapshot}>
                          {r.remainingBefore != null && (
                            <span className={styles.snapshotItem}>
                              <span className={styles.snapshotLabel}>
                                Before
                              </span>
                              <span className={styles.snapshotValue}>
                                {formatMoney(
                                  r.remainingBefore,
                                  r.currency || currency,
                                )}
                              </span>
                            </span>
                          )}
                          {r.remainingAfter != null && (
                            <span className={styles.snapshotItem}>
                              <span className={styles.snapshotLabel}>
                                After
                              </span>
                              <span className={styles.snapshotValue}>
                                {formatMoney(
                                  r.remainingAfter,
                                  r.currency || currency,
                                )}
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
