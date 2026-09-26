// src/lib/analytics/domains.js
// ─────────────────────────────────────────────────────────────────────────────
// Typed convenience wrappers for domain events.
// Keeps event names consistent across the codebase — no more typos like
// "booking.create" vs "booking.created".
//
// Usage:
//   import { domain } from "@/lib/analytics/domains";
//   domain.bookingCreated({ bookingId, amount, currency });
// ─────────────────────────────────────────────────────────────────────────────

import tracker from "./tracker";

export const domain = {
  // ── Bookings ────────────────────────────────────────────────────────────
  bookingCreated: (props = {}) => tracker.action("booking.created", props),
  bookingAccepted: (props = {}) => tracker.action("booking.accepted", props),
  bookingCompleted: (props = {}) => tracker.action("booking.completed", props),
  bookingCancelled: (props = {}) => tracker.action("booking.cancelled", props),

  // ── Payments ────────────────────────────────────────────────────────────
  paymentInitiated: (props = {}) => tracker.action("payment.initiated", props),
  paymentHeld: (props = {}) => tracker.action("payment.held", props),
  paymentReleased: (props = {}) => tracker.action("payment.released", props),
  paymentRefunded: (props = {}) => tracker.action("payment.refunded", props),

  // ── Jobs ────────────────────────────────────────────────────────────────
  jobApplied: (props = {}) => tracker.action("job.applied", props),
  jobPosted: (props = {}) => tracker.action("job.posted", props),
  jobViewed: (props = {}) => tracker.track("job.viewed", props),

  // ── Profile ─────────────────────────────────────────────────────────────
  profileViewed: (props = {}) => tracker.track("profile.viewed", props),
  profileUpdated: (props = {}) => tracker.action("profile.updated", props),

  // ── Reviews ─────────────────────────────────────────────────────────────
  reviewSubmitted: (props = {}) => tracker.action("review.submitted", props),
  reviewReceived: (props = {}) => tracker.track("review.received", props),

  // ── Messages ────────────────────────────────────────────────────────────
  messageSent: (props = {}) => tracker.action("message.sent", props),
  messageRead: (props = {}) => tracker.track("message.read", props),

  // ── Disputes ────────────────────────────────────────────────────────────
  disputeRaised: (props = {}) => tracker.action("dispute.raised", props),
  disputeResolved: (props = {}) => tracker.track("dispute.resolved", props),

  // ── Verification ────────────────────────────────────────────────────────
  workerVerified: (props = {}) => tracker.track("worker.verified", props),
  workerFeatured: (props = {}) => tracker.track("worker.featured", props),

  // ── Referral ────────────────────────────────────────────────────────────
  referralSignup: (props = {}) => tracker.action("referral.signup", props),
  referralConverted: (props = {}) =>
    tracker.action("referral.converted", props),
};

export default domain;
