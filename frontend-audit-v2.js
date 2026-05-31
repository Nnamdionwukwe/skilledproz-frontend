#!/usr/bin/env node
// frontend-audit-v2.js — fixed /api/ prefix comparison
// Run from frontend project root: node frontend-audit-v2.js
import fs from "fs";
import path from "path";

const SRC = path.resolve("src");
const ARGS = process.argv.slice(2);
const SAVE = ARGS.includes("--output")
  ? ARGS[ARGS.indexOf("--output") + 1]
  : null;
const LINE = "═".repeat(80);
const out_lines = [];

function out(s = "") {
  out_lines.push(s);
  process.stdout.write(s + "\n");
}
function read(f) {
  try {
    return fs.readFileSync(f, "utf8");
  } catch {
    return "";
  }
}
function rel(f) {
  return f.replace(SRC + path.sep, "src/").replace(/\\/g, "/");
}

function walk(dir, exts = [".js", ".jsx", ".ts", ".tsx", ".css"]) {
  const r = [];
  if (!fs.existsSync(dir)) return r;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (["node_modules", ".git", "dist", "build", ".vite"].includes(e.name))
        continue;
      r.push(...walk(full, exts));
    } else if (exts.some((x) => e.name.endsWith(x))) r.push(full);
  }
  return r;
}

if (!fs.existsSync(SRC)) {
  console.error("src/ not found");
  process.exit(1);
}

// ── KNOWN BACKEND ROUTES (METHOD, full path with /api/) ──────────────────────
const BACKEND = [
  ["POST", "/api/auth/register"],
  ["POST", "/api/auth/login"],
  ["GET", "/api/auth/verify-email"],
  ["POST", "/api/auth/resend-verification"],
  ["POST", "/api/auth/forgot-password"],
  ["POST", "/api/auth/reset-password"],
  ["POST", "/api/auth/refresh"],
  ["POST", "/api/auth/logout"],
  ["GET", "/api/auth/me"],
  ["POST", "/api/auth/logout-all"],
  ["PUT", "/api/users/me"],
  ["PUT", "/api/users/me/avatar"],
  ["DELETE", "/api/users/me"],
  ["GET", "/api/users/:id"],
  ["GET", "/api/workers/search"],
  ["GET", "/api/workers/dashboard"],
  ["GET", "/api/workers/dashboard/reviews"],
  ["PUT", "/api/workers/profile"],
  ["POST", "/api/workers/categories"],
  ["DELETE", "/api/workers/categories/:id"],
  ["POST", "/api/workers/portfolio"],
  ["DELETE", "/api/workers/portfolio/:id"],
  ["POST", "/api/workers/certifications"],
  ["PUT", "/api/workers/availability"],
  ["POST", "/api/workers/availability"],
  ["POST", "/api/workers/video-intro"],
  ["DELETE", "/api/workers/video-intro"],
  ["GET", "/api/workers/notifications"],
  ["PATCH", "/api/workers/notifications/read-all"],
  ["GET", "/api/workers/:userId"],
  ["GET", "/api/hirers/me/profile"],
  ["PUT", "/api/hirers/me/profile"],
  ["GET", "/api/hirers/me/dashboard"],
  ["GET", "/api/hirers/me/bookings"],
  ["GET", "/api/hirers/me/saved-workers"],
  ["POST", "/api/hirers/me/saved-workers/:workerId"],
  ["DELETE", "/api/hirers/me/saved-workers/:workerId"],
  ["GET", "/api/hirers/me/hired-workers"],
  ["GET", "/api/hirers/me/notifications"],
  ["PATCH", "/api/hirers/me/notifications/read"],
  ["GET", "/api/hirers/me/reviews/received"],
  ["GET", "/api/hirers/me/reviews/given"],
  ["GET", "/api/hirers/me/reviews"],
  ["GET", "/api/hirers/:userId"],
  ["GET", "/api/hirers/:userId/profile"],
  ["GET", "/api/jobs"],
  ["POST", "/api/jobs"],
  ["GET", "/api/jobs/hirer/me"],
  ["GET", "/api/jobs/my/applications"],
  ["GET", "/api/jobs/saved"],
  ["GET", "/api/jobs/:id"],
  ["PATCH", "/api/jobs/:id/status"],
  ["GET", "/api/jobs/:id/applications"],
  ["PATCH", "/api/jobs/:id/applications/:appId/status"],
  ["POST", "/api/jobs/:id/apply"],
  ["POST", "/api/jobs/:id/save"],
  ["DELETE", "/api/jobs/:id/save"],
  ["POST", "/api/bookings"],
  ["GET", "/api/bookings"],
  ["GET", "/api/bookings/:id"],
  ["PATCH", "/api/bookings/:id/status"],
  ["PATCH", "/api/bookings/:id/checkin"],
  ["PATCH", "/api/bookings/:id/checkout"],
  ["POST", "/api/bookings/:id/sos"],
  ["PATCH", "/api/bookings/:id/sos/resolve"],
  ["PATCH", "/api/bookings/:id/emergency-contact"],
  ["POST", "/api/payments/initiate/:bookingId"],
  ["GET", "/api/payments/verify/paystack"],
  ["GET", "/api/payments/verify/flutterwave"],
  ["POST", "/api/payments/webhook/paystack"],
  ["POST", "/api/payments/webhook/flutterwave"],
  ["GET", "/api/payments/banks"],
  ["POST", "/api/payments/verify-account"],
  ["POST", "/api/payments/bank-transfer/:bookingId"],
  ["PATCH", "/api/payments/bank-transfer/:bookingId/confirm"],
  ["POST", "/api/payments/crypto/:bookingId"],
  ["PATCH", "/api/payments/crypto/:bookingId/confirm"],
  ["POST", "/api/payments/release/:bookingId"],
  ["POST", "/api/payments/refund/:bookingId"],
  ["GET", "/api/payments/invoice/:bookingId"],
  ["GET", "/api/payments/hirer"],
  ["GET", "/api/payments/earnings"],
  ["POST", "/api/payments/withdraw"],
  ["GET", "/api/payments/withdrawals"],
  ["GET", "/api/payments/:bookingId"],
  ["POST", "/api/reviews"],
  ["GET", "/api/reviews/my/given"],
  ["GET", "/api/reviews/my/received"],
  ["GET", "/api/reviews/check/:bookingId"],
  ["DELETE", "/api/reviews/:reviewId"],
  ["GET", "/api/reviews/worker/:userId"],
  ["GET", "/api/reviews/hirer/:userId"],
  ["GET", "/api/messages/conversations"],
  ["GET", "/api/messages/:conversationId"],
  ["POST", "/api/messages"],
  ["PATCH", "/api/messages/:conversationId/read"],
  ["GET", "/api/notifications"],
  ["PATCH", "/api/notifications/read-all"],
  ["PATCH", "/api/notifications/:id/read"],
  ["DELETE", "/api/notifications/clear-all"],
  ["DELETE", "/api/notifications/:id"],
  ["POST", "/api/notifications/token"],
  ["DELETE", "/api/notifications/token"],
  ["POST", "/api/notifications/request"],
  ["GET", "/api/verification/status"],
  ["POST", "/api/verification/submit-id"],
  ["POST", "/api/verification/submit-certification"],
  ["DELETE", "/api/verification/certifications/:certId"],
  ["GET", "/api/verification/hirer/status"],
  ["POST", "/api/verification/hirer/submit"],
  ["GET", "/api/search"],
  ["GET", "/api/search/nearby"],
  ["GET", "/api/search/trending"],
  ["GET", "/api/search/filters"],
  ["GET", "/api/categories"],
  ["GET", "/api/categories/:slug"],
  ["POST", "/api/categories/suggest"],
  ["GET", "/api/subscriptions/plans"],
  ["GET", "/api/subscriptions/my"],
  ["POST", "/api/subscriptions/checkout"],
  ["POST", "/api/subscriptions/verify"],
  ["POST", "/api/subscriptions/cancel"],
  ["GET", "/api/subscriptions/invoice/:reference"],
  ["GET", "/api/subscriptions/promo/validate/:code"],
  ["GET", "/api/subscriptions/admin/promo-codes"],
  ["POST", "/api/subscriptions/admin/promo-codes"],
  ["PATCH", "/api/subscriptions/admin/promo-codes/:id"],
  ["PATCH", "/api/subscriptions/admin/promo-codes/:id/toggle"],
  ["DELETE", "/api/subscriptions/admin/promo-codes/:id"],
  ["GET", "/api/featured/packages"],
  ["GET", "/api/featured"],
  ["GET", "/api/featured/my"],
  ["POST", "/api/featured/checkout"],
  ["POST", "/api/featured/verify"],
  ["GET", "/api/insurance/plans"],
  ["GET", "/api/insurance/my"],
  ["POST", "/api/insurance/checkout"],
  ["POST", "/api/insurance/verify"],
  ["GET", "/api/referral/validate/:code"],
  ["GET", "/api/referral/code"],
  ["GET", "/api/referral/dashboard"],
  ["GET", "/api/referral/wallet"],
  ["GET", "/api/referral/leaderboard"],
  ["POST", "/api/referral/withdraw"],
  ["GET", "/api/referral/admin"],
  ["GET", "/api/referral/admin/stats"],
  ["PATCH", "/api/referral/admin/:id/flag"],
  ["PATCH", "/api/referral/admin/:id/expire"],
  ["POST", "/api/referral/admin/:id/reward"],
  ["PATCH", "/api/referral/admin/:id/wallet"],
  ["GET", "/api/campaign/my-tasks"],
  ["POST", "/api/campaign/my-tasks/social"],
  ["GET", "/api/campaign/status"],
  ["GET", "/api/campaign/referrals"],
  ["POST", "/api/campaign/submit"],
  ["GET", "/api/campaign/submissions"],
  ["GET", "/api/campaign/wallet"],
  ["POST", "/api/campaign/withdraw"],
  ["GET", "/api/campaign/admin/stats"],
  ["GET", "/api/campaign/admin/submissions"],
  ["PATCH", "/api/campaign/admin/submissions/:id/review"],
  ["GET", "/api/campaign/admin/withdrawals"],
  ["PATCH", "/api/campaign/admin/withdrawals/:id/approve"],
  ["PATCH", "/api/campaign/admin/withdrawals/:id/reject"],
  ["GET", "/api/posts/feed"],
  ["GET", "/api/posts/my"],
  ["GET", "/api/posts/user/:userId"],
  ["GET", "/api/posts/:id"],
  ["POST", "/api/posts"],
  ["PUT", "/api/posts/:id"],
  ["DELETE", "/api/posts/:id"],
  ["POST", "/api/posts/:id/repost"],
  ["POST", "/api/posts/:id/react"],
  ["GET", "/api/posts/:id/reactions"],
  ["POST", "/api/posts/:id/comments"],
  ["GET", "/api/posts/:id/comments"],
  ["DELETE", "/api/posts/comments/:commentId"],
  ["POST", "/api/reports"],
  ["GET", "/api/reports/my"],
  ["DELETE", "/api/reports/:id"],
  ["GET", "/api/reports/admin/stats"],
  ["GET", "/api/reports/admin"],
  ["PATCH", "/api/reports/admin/bulk-dismiss"],
  ["GET", "/api/reports/admin/:id"],
  ["PATCH", "/api/reports/admin/:id/review"],
  ["PATCH", "/api/reports/admin/:id/resolve"],
  ["PATCH", "/api/reports/admin/:id/dismiss"],
  ["POST", "/api/disputes"],
  ["GET", "/api/disputes/my"],
  ["GET", "/api/disputes/:bookingId"],
  ["PATCH", "/api/disputes/:bookingId/cancel"],
  ["PATCH", "/api/disputes/:bookingId/resolve"],
  ["GET", "/api/settings/profile"],
  ["PATCH", "/api/settings/profile"],
  ["POST", "/api/settings/avatar"],
  ["PATCH", "/api/settings/worker-profile"],
  ["PATCH", "/api/settings/hirer-profile"],
  ["PATCH", "/api/settings/password"],
  ["GET", "/api/settings/security"],
  ["GET", "/api/settings/notifications"],
  ["PATCH", "/api/settings/notifications"],
  ["GET", "/api/settings/privacy"],
  ["PATCH", "/api/settings/privacy"],
  ["GET", "/api/settings/payment-methods"],
  ["GET", "/api/settings/activity"],
  ["DELETE", "/api/settings/account"],
  ["POST", "/api/video-calls/:bookingId/initiate"],
  ["PATCH", "/api/video-calls/:bookingId/accept"],
  ["PATCH", "/api/video-calls/:bookingId/decline"],
  ["PATCH", "/api/video-calls/:bookingId/end"],
  ["GET", "/api/video-calls/:bookingId"],
  ["POST", "/api/ai/assist"],
  ["POST", "/api/translate"],
  ["GET", "/api/admin/dashboard"],
  ["GET", "/api/admin/stats"],
  ["GET", "/api/admin/analytics/users"],
  ["GET", "/api/admin/analytics/revenue"],
  ["GET", "/api/admin/users"],
  ["GET", "/api/admin/users/:userId"],
  ["PATCH", "/api/admin/users/:userId/ban"],
  ["PATCH", "/api/admin/users/:userId/unban"],
  ["DELETE", "/api/admin/users/:userId"],
  ["PATCH", "/api/admin/users/:userId/role"],
  ["PATCH", "/api/admin/users/:userId/verify"],
  ["GET", "/api/admin/verifications/pending"],
  ["GET", "/api/admin/verifications/stats"],
  ["GET", "/api/admin/bookings"],
  ["GET", "/api/admin/bookings/:bookingId"],
  ["PATCH", "/api/admin/bookings/:bookingId/status"],
  ["GET", "/api/admin/disputes"],
  ["PATCH", "/api/admin/disputes/:bookingId/resolve"],
  ["GET", "/api/admin/payments"],
  ["GET", "/api/admin/payments/:paymentId"],
  ["POST", "/api/admin/payments/:bookingId/release"],
  ["POST", "/api/admin/payments/:bookingId/refund"],
  ["PATCH", "/api/admin/payments/:bookingId/verify"],
  ["PATCH", "/api/admin/payments/:bookingId/reject-manual"],
  ["GET", "/api/admin/withdrawals"],
  ["PATCH", "/api/admin/withdrawals/:withdrawalId/approve"],
  ["PATCH", "/api/admin/withdrawals/:withdrawalId/reject"],
  ["POST", "/api/admin/withdrawals/:withdrawalId/payout"],
  ["GET", "/api/admin/categories"],
  ["POST", "/api/admin/categories"],
  ["PATCH", "/api/admin/categories/:categoryId"],
  ["DELETE", "/api/admin/categories/:categoryId"],
  ["GET", "/api/admin/reviews"],
  ["DELETE", "/api/admin/reviews/:reviewId"],
  ["GET", "/api/admin/jobs"],
  ["GET", "/api/admin/subscriptions"],
  ["PATCH", "/api/admin/subscriptions/:subscriptionId/cancel"],
  ["GET", "/api/admin/featured"],
  ["DELETE", "/api/admin/featured/:listingId"],
  ["GET", "/api/admin/posts"],
  ["DELETE", "/api/admin/posts/:postId"],
  ["DELETE", "/api/admin/posts/comments/:commentId"],
  ["GET", "/api/admin/conversations"],
  ["GET", "/api/admin/conversations/:conversationId"],
  ["POST", "/api/admin/broadcast"],
  ["GET", "/api/admin/video-calls"],
  ["GET", "/api/audit"],
  ["GET", "/api/audit/stats"],
  ["GET", "/api/audit/:id"],
  ["DELETE", "/api/audit/purge"],
];

// ── COLLECT FRONTEND API CALLS ────────────────────────────────────────────────
const jsxFiles = walk(SRC).filter((f) => /\.(jsx?|tsx?)$/.test(f));
const calls = []; // { method, path, file, line }

for (const file of jsxFiles) {
  const content = read(file);
  const frel = rel(file);
  const lns = content.split("\n");
  for (let i = 0; i < lns.length; i++) {
    const ln = lns[i];
    let m;
    // api.method(
    const re = /api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"\s)]+)/gi;
    while ((m = re.exec(ln)) !== null)
      calls.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: frel,
        line: i + 1,
      });
    // axios.method(
    const re2 = /axios\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"\s)]+)/gi;
    while ((m = re2.exec(ln)) !== null)
      calls.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: frel,
        line: i + 1,
      });
  }
}

// ── NORMALISE for comparison ──────────────────────────────────────────────────
// Frontend calls /payments/withdraw → full URL is /api/payments/withdraw
// Backend routes already have /api/ prefix
function normalise(p) {
  // strip query string and template variable segments
  let n = p
    .split("?")[0]
    .replace(/\$\{[^}]+\}/g, ":x") // template literals → :x
    .replace(/\/\d+/g, "/:x") // /123 → /:x
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "/:x"); // UUIDs

  // add /api/ prefix if missing
  if (!n.startsWith("/api/") && !n.startsWith("/health")) n = "/api" + n;
  return n;
}

function normRoute(p) {
  return p.replace(/:\w+/g, ":x");
}

// build set of (method, normPath) from frontend
const frontendSet = new Set();
for (const c of calls)
  frontendSet.add(`${c.method} ${normalise(c.path).replace(/:\w+/g, ":x")}`);

// ── COVERAGE ─────────────────────────────────────────────────────────────────
const covered = BACKEND.filter(([m, p]) =>
  frontendSet.has(`${m} ${normRoute(p)}`),
);
const uncovered = BACKEND.filter(
  ([m, p]) => !frontendSet.has(`${m} ${normRoute(p)}`),
);

// ── WRONG CALLS (frontend calls that match no backend route) ──────────────────
const backendSet = new Set(BACKEND.map(([m, p]) => `${m} ${normRoute(p)}`));
const callsByKey = {};
for (const c of calls) {
  const key = `${c.method} ${normalise(c.path).replace(/:\w+/g, ":x")}`;
  if (!callsByKey[key]) callsByKey[key] = [];
  callsByKey[key].push(`${c.file}:${c.line}`);
}
const wrong = Object.entries(callsByKey).filter(([k]) => !backendSet.has(k));

const pct = Math.round((covered.length / BACKEND.length) * 100);

// ── PRINT ─────────────────────────────────────────────────────────────────────
out(`\n${LINE}`);
out(` SkilledProz — Frontend ↔ Backend Coverage  (v2 — /api/ prefix fixed)`);
out(LINE);
out(`\n  Backend routes   : ${BACKEND.length}`);
out(
  `  Frontend calls   : ${calls.length} (${Object.keys(callsByKey).length} unique)`,
);
out(`  Covered          : ${covered.length}  (${pct}%)`);
out(`  NOT COVERED      : ${uncovered.length}`);
out(`  WRONG CALLS      : ${wrong.length}\n`);

if (uncovered.length) {
  out(`${LINE}`);
  out(` UNCOVERED BACKEND ROUTES (frontend never calls these)`);
  out(LINE);
  for (const [m, p] of uncovered) out(`  ❌  ${m.padEnd(7)} ${p}`);
}

if (wrong.length) {
  out(`\n${LINE}`);
  out(` WRONG / ORPHAN FRONTEND CALLS (no matching backend route)`);
  out(LINE);
  for (const [key, locs] of wrong) {
    out(`  ❓  ${key}`);
    locs.slice(0, 3).forEach((l) => out(`       ← ${l}`));
  }
}

out(`\n${LINE}`);
out(` Done`);
out(LINE + "\n");

if (SAVE) fs.writeFileSync(SAVE, out_lines.join("\n"));
