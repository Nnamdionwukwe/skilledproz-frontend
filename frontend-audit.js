#!/usr/bin/env node
// frontend-audit.js
// ─────────────────────────────────────────────────────────────────────────────
// Full SkilledProz frontend audit:
//   § 1  File inventory
//   § 2  API call inventory  (every api.get/post/patch/put/delete)
//   § 3  Backend coverage    (which backend routes have NO frontend call)
//   § 4  Orphan API calls    (frontend calls that match no backend route)
//   § 5  CSS audit           (defined classes vs used classes per module)
//   § 6  Import audit        (broken / missing imports)
//   § 7  Store audit         (zustand store actions + which components use them)
//   § 8  React Router audit  (declared routes vs navigate() / Link calls)
//   § 9  Missing auth guards (pages that fetch data but have no auth check)
//   §10  Summary + priority actions
//
// Run from the FRONTEND project root:
//   node frontend-audit.js
//   node frontend-audit.js --output report.txt   (also saves to file)
// ─────────────────────────────────────────────────────────────────────────────
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const ARGS = process.argv.slice(2);
const OUTPUT_FILE = ARGS.includes("--output")
  ? ARGS[ARGS.indexOf("--output") + 1]
  : null;
const SRC = path.resolve("src");
const LINE = "═".repeat(80);
const THIN = "─".repeat(80);
const lines = [];

function out(...args) {
  const str = args.join(" ");
  lines.push(str);
  process.stdout.write(str + "\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILS
// ─────────────────────────────────────────────────────────────────────────────
function walk(dir, exts = [".js", ".jsx", ".ts", ".tsx", ".css"]) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        ["node_modules", ".git", "dist", "build", ".vite"].includes(entry.name)
      )
        continue;
      results.push(...walk(full, exts));
    } else if (exts.some((e) => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

function read(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function rel(file) {
  return file.replace(SRC + path.sep, "src/").replace(/\\/g, "/");
}

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN BACKEND ROUTES  (from full-audit.js output — update if routes change)
// Format: [METHOD, path, auth-level, feature-area]
// ─────────────────────────────────────────────────────────────────────────────
const BACKEND_ROUTES = [
  // Auth
  ["POST", "/api/auth/register", "PUBLIC", "auth"],
  ["POST", "/api/auth/login", "PUBLIC", "auth"],
  ["GET", "/api/auth/verify-email", "PUBLIC", "auth"],
  ["POST", "/api/auth/resend-verification", "PUBLIC", "auth"],
  ["POST", "/api/auth/forgot-password", "PUBLIC", "auth"],
  ["POST", "/api/auth/reset-password", "PUBLIC", "auth"],
  ["POST", "/api/auth/refresh", "AUTH", "auth"],
  ["POST", "/api/auth/logout", "AUTH", "auth"],
  ["GET", "/api/auth/me", "AUTH", "auth"],
  ["POST", "/api/auth/logout-all", "AUTH", "auth"],
  // Users
  ["PUT", "/api/users/me", "AUTH", "user"],
  ["PUT", "/api/users/me/avatar", "AUTH", "user"],
  ["DELETE", "/api/users/me", "AUTH", "user"],
  ["GET", "/api/users/:id", "OPT", "user"],
  // Workers
  ["GET", "/api/workers/search", "AUTH", "worker"],
  ["GET", "/api/workers/dashboard", "AUTH", "worker"],
  ["GET", "/api/workers/dashboard/reviews", "AUTH", "worker"],
  ["PUT", "/api/workers/profile", "AUTH", "worker"],
  ["POST", "/api/workers/categories", "AUTH", "worker"],
  ["DELETE", "/api/workers/categories/:id", "AUTH", "worker"],
  ["POST", "/api/workers/portfolio", "AUTH", "worker"],
  ["DELETE", "/api/workers/portfolio/:id", "AUTH", "worker"],
  ["POST", "/api/workers/certifications", "AUTH", "worker"],
  ["PUT", "/api/workers/availability", "AUTH", "worker"],
  ["POST", "/api/workers/availability", "AUTH", "worker"],
  ["POST", "/api/workers/video-intro", "AUTH", "worker"],
  ["DELETE", "/api/workers/video-intro", "AUTH", "worker"],
  ["GET", "/api/workers/notifications", "AUTH", "worker"],
  ["PATCH", "/api/workers/notifications/read-all", "AUTH", "worker"],
  ["GET", "/api/workers/:userId", "AUTH", "worker"],
  // Hirers
  ["GET", "/api/hirers/me/profile", "AUTH", "hirer"],
  ["PUT", "/api/hirers/me/profile", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/dashboard", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/bookings", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/saved-workers", "AUTH", "hirer"],
  ["POST", "/api/hirers/me/saved-workers/:workerId", "AUTH", "hirer"],
  ["DELETE", "/api/hirers/me/saved-workers/:workerId", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/hired-workers", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/notifications", "AUTH", "hirer"],
  ["PATCH", "/api/hirers/me/notifications/read", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/reviews/received", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/reviews/given", "AUTH", "hirer"],
  ["GET", "/api/hirers/me/reviews", "AUTH", "hirer"],
  ["GET", "/api/hirers/:userId", "PUBLIC", "hirer"],
  ["GET", "/api/hirers/:userId/profile", "PUBLIC", "hirer"],
  // Jobs
  ["GET", "/api/jobs", "AUTH", "jobs"],
  ["POST", "/api/jobs", "AUTH", "jobs"],
  ["GET", "/api/jobs/hirer/me", "AUTH", "jobs"],
  ["GET", "/api/jobs/my/applications", "AUTH", "jobs"],
  ["GET", "/api/jobs/saved", "AUTH", "jobs"],
  ["GET", "/api/jobs/:id", "AUTH", "jobs"],
  ["PATCH", "/api/jobs/:id/status", "AUTH", "jobs"],
  ["GET", "/api/jobs/:id/applications", "AUTH", "jobs"],
  ["PATCH", "/api/jobs/:id/applications/:appId/status", "AUTH", "jobs"],
  ["POST", "/api/jobs/:id/apply", "AUTH", "jobs"],
  ["POST", "/api/jobs/:id/save", "AUTH", "jobs"],
  ["DELETE", "/api/jobs/:id/save", "AUTH", "jobs"],
  // Bookings
  ["POST", "/api/bookings", "AUTH", "bookings"],
  ["GET", "/api/bookings", "AUTH", "bookings"],
  ["GET", "/api/bookings/:id", "AUTH", "bookings"],
  ["PATCH", "/api/bookings/:id/status", "AUTH", "bookings"],
  ["PATCH", "/api/bookings/:id/checkin", "AUTH", "bookings"],
  ["PATCH", "/api/bookings/:id/checkout", "AUTH", "bookings"],
  ["POST", "/api/bookings/:id/sos", "AUTH", "bookings"],
  ["PATCH", "/api/bookings/:id/sos/resolve", "AUTH", "bookings"],
  ["PATCH", "/api/bookings/:id/emergency-contact", "AUTH", "bookings"],
  // Payments
  ["POST", "/api/payments/initiate/:bookingId", "AUTH", "payments"],
  ["GET", "/api/payments/verify/paystack", "AUTH", "payments"],
  ["GET", "/api/payments/verify/flutterwave", "AUTH", "payments"],
  ["POST", "/api/payments/webhook/paystack", "PUBLIC", "payments"],
  ["POST", "/api/payments/webhook/flutterwave", "PUBLIC", "payments"],
  ["GET", "/api/payments/banks", "AUTH", "payments"],
  ["POST", "/api/payments/verify-account", "AUTH", "payments"],
  ["POST", "/api/payments/bank-transfer/:bookingId", "AUTH", "payments"],
  [
    "PATCH",
    "/api/payments/bank-transfer/:bookingId/confirm",
    "AUTH",
    "payments",
  ],
  ["POST", "/api/payments/crypto/:bookingId", "AUTH", "payments"],
  ["PATCH", "/api/payments/crypto/:bookingId/confirm", "AUTH", "payments"],
  ["POST", "/api/payments/release/:bookingId", "AUTH", "payments"],
  ["POST", "/api/payments/refund/:bookingId", "AUTH", "payments"],
  ["GET", "/api/payments/invoice/:bookingId", "AUTH", "payments"],
  ["GET", "/api/payments/hirer", "AUTH", "payments"],
  ["GET", "/api/payments/earnings", "AUTH", "payments"],
  ["POST", "/api/payments/withdraw", "AUTH", "payments"],
  ["GET", "/api/payments/withdrawals", "AUTH", "payments"],
  ["GET", "/api/payments", "ADMIN", "payments"],
  ["GET", "/api/payments/:bookingId", "AUTH", "payments"],
  // Reviews
  ["POST", "/api/reviews", "AUTH", "reviews"],
  ["GET", "/api/reviews/my/given", "AUTH", "reviews"],
  ["GET", "/api/reviews/my/received", "AUTH", "reviews"],
  ["GET", "/api/reviews/check/:bookingId", "AUTH", "reviews"],
  ["DELETE", "/api/reviews/:reviewId", "AUTH", "reviews"],
  ["GET", "/api/reviews/worker/:userId", "AUTH", "reviews"],
  ["GET", "/api/reviews/hirer/:userId", "AUTH", "reviews"],
  // Messages
  ["GET", "/api/messages/conversations", "AUTH", "messages"],
  ["GET", "/api/messages/:conversationId", "AUTH", "messages"],
  ["POST", "/api/messages", "AUTH", "messages"],
  ["PATCH", "/api/messages/:conversationId/read", "AUTH", "messages"],
  // Notifications
  ["GET", "/api/notifications", "AUTH", "notifications"],
  ["PATCH", "/api/notifications/read-all", "AUTH", "notifications"],
  ["PATCH", "/api/notifications/:id/read", "AUTH", "notifications"],
  ["DELETE", "/api/notifications/clear-all", "AUTH", "notifications"],
  ["DELETE", "/api/notifications/:id", "AUTH", "notifications"],
  ["POST", "/api/notifications/token", "AUTH", "notifications"],
  ["DELETE", "/api/notifications/token", "AUTH", "notifications"],
  // Verification
  ["GET", "/api/verification/status", "AUTH", "verification"],
  ["POST", "/api/verification/submit-id", "AUTH", "verification"],
  ["POST", "/api/verification/submit-certification", "AUTH", "verification"],
  [
    "DELETE",
    "/api/verification/certifications/:certId",
    "AUTH",
    "verification",
  ],
  ["GET", "/api/verification/hirer/status", "AUTH", "verification"],
  ["POST", "/api/verification/hirer/submit", "AUTH", "verification"],
  // Search
  ["GET", "/api/search", "PUBLIC", "search"],
  ["GET", "/api/search/nearby", "PUBLIC", "search"],
  ["GET", "/api/search/trending", "PUBLIC", "search"],
  ["GET", "/api/search/filters", "PUBLIC", "search"],
  // Categories
  ["GET", "/api/categories", "PUBLIC", "categories"],
  ["GET", "/api/categories/:slug", "PUBLIC", "categories"],
  ["POST", "/api/categories/suggest", "OPT", "categories"],
  // Subscriptions
  ["GET", "/api/subscriptions/plans", "AUTH", "subscriptions"],
  ["GET", "/api/subscriptions/my", "AUTH", "subscriptions"],
  ["POST", "/api/subscriptions/checkout", "AUTH", "subscriptions"],
  ["POST", "/api/subscriptions/verify", "AUTH", "subscriptions"],
  ["POST", "/api/subscriptions/cancel", "AUTH", "subscriptions"],
  ["GET", "/api/subscriptions/invoice/:reference", "AUTH", "subscriptions"],
  ["GET", "/api/subscriptions/promo/validate/:code", "AUTH", "subscriptions"],
  // Featured
  ["GET", "/api/featured/packages", "AUTH", "featured"],
  ["GET", "/api/featured", "AUTH", "featured"],
  ["GET", "/api/featured/my", "AUTH", "featured"],
  ["POST", "/api/featured/checkout", "AUTH", "featured"],
  ["POST", "/api/featured/verify", "AUTH", "featured"],
  // Insurance
  ["GET", "/api/insurance/plans", "AUTH", "insurance"],
  ["GET", "/api/insurance/my", "AUTH", "insurance"],
  ["POST", "/api/insurance/checkout", "AUTH", "insurance"],
  ["POST", "/api/insurance/verify", "AUTH", "insurance"],
  // Referral
  ["GET", "/api/referral/validate/:code", "PUBLIC", "referral"],
  ["GET", "/api/referral/code", "AUTH", "referral"],
  ["GET", "/api/referral/dashboard", "AUTH", "referral"],
  ["GET", "/api/referral/wallet", "AUTH", "referral"],
  ["GET", "/api/referral/leaderboard", "AUTH", "referral"],
  ["POST", "/api/referral/withdraw", "AUTH", "referral"],
  // Campaign
  ["GET", "/api/campaign/my-tasks", "AUTH", "campaign"],
  ["POST", "/api/campaign/my-tasks/social", "AUTH", "campaign"],
  ["GET", "/api/campaign/status", "AUTH", "campaign"],
  ["GET", "/api/campaign/referrals", "AUTH", "campaign"],
  ["POST", "/api/campaign/submit", "AUTH", "campaign"],
  ["GET", "/api/campaign/submissions", "AUTH", "campaign"],
  ["GET", "/api/campaign/wallet", "AUTH", "campaign"],
  ["POST", "/api/campaign/withdraw", "AUTH", "campaign"],
  // Posts
  ["GET", "/api/posts/feed", "AUTH", "posts"],
  ["GET", "/api/posts/my", "AUTH", "posts"],
  ["GET", "/api/posts/user/:userId", "AUTH", "posts"],
  ["GET", "/api/posts/:id", "AUTH", "posts"],
  ["POST", "/api/posts", "AUTH", "posts"],
  ["PUT", "/api/posts/:id", "AUTH", "posts"],
  ["DELETE", "/api/posts/:id", "AUTH", "posts"],
  ["POST", "/api/posts/:id/repost", "AUTH", "posts"],
  ["POST", "/api/posts/:id/react", "AUTH", "posts"],
  ["GET", "/api/posts/:id/reactions", "AUTH", "posts"],
  ["POST", "/api/posts/:id/comments", "AUTH", "posts"],
  ["GET", "/api/posts/:id/comments", "AUTH", "posts"],
  ["DELETE", "/api/posts/comments/:commentId", "AUTH", "posts"],
  // Reports + Disputes
  ["POST", "/api/reports", "AUTH", "reports"],
  ["GET", "/api/reports/my", "AUTH", "reports"],
  ["POST", "/api/disputes", "AUTH", "disputes"],
  ["GET", "/api/disputes/my", "AUTH", "disputes"],
  ["GET", "/api/disputes/:bookingId", "AUTH", "disputes"],
  // Settings
  ["GET", "/api/settings/profile", "AUTH", "settings"],
  ["PATCH", "/api/settings/profile", "AUTH", "settings"],
  ["POST", "/api/settings/avatar", "AUTH", "settings"],
  ["PATCH", "/api/settings/worker-profile", "AUTH", "settings"],
  ["PATCH", "/api/settings/hirer-profile", "AUTH", "settings"],
  ["PATCH", "/api/settings/password", "AUTH", "settings"],
  ["GET", "/api/settings/security", "AUTH", "settings"],
  ["GET", "/api/settings/notifications", "AUTH", "settings"],
  ["PATCH", "/api/settings/notifications", "AUTH", "settings"],
  ["GET", "/api/settings/privacy", "AUTH", "settings"],
  ["PATCH", "/api/settings/privacy", "AUTH", "settings"],
  ["GET", "/api/settings/payment-methods", "AUTH", "settings"],
  ["GET", "/api/settings/activity", "AUTH", "settings"],
  ["DELETE", "/api/settings/account", "AUTH", "settings"],
  // Video calls
  ["POST", "/api/video-calls/:bookingId/initiate", "AUTH", "videocalls"],
  ["PATCH", "/api/video-calls/:bookingId/accept", "AUTH", "videocalls"],
  ["PATCH", "/api/video-calls/:bookingId/decline", "AUTH", "videocalls"],
  ["PATCH", "/api/video-calls/:bookingId/end", "AUTH", "videocalls"],
  ["GET", "/api/video-calls/:bookingId", "AUTH", "videocalls"],
  // AI + Translate
  ["POST", "/api/ai/assist", "AUTH", "ai"],
  ["POST", "/api/translate", "AUTH", "ai"],
  // Admin
  ["GET", "/api/admin/dashboard", "ADMIN", "admin"],
  ["GET", "/api/admin/stats", "ADMIN", "admin"],
  ["GET", "/api/admin/analytics/users", "ADMIN", "admin"],
  ["GET", "/api/admin/analytics/revenue", "ADMIN", "admin"],
  ["GET", "/api/admin/users", "ADMIN", "admin"],
  ["GET", "/api/admin/users/:userId", "ADMIN", "admin"],
  ["PATCH", "/api/admin/users/:userId/ban", "ADMIN", "admin"],
  ["PATCH", "/api/admin/users/:userId/unban", "ADMIN", "admin"],
  ["DELETE", "/api/admin/users/:userId", "ADMIN", "admin"],
  ["PATCH", "/api/admin/users/:userId/role", "ADMIN", "admin"],
  ["PATCH", "/api/admin/users/:userId/verify", "ADMIN", "admin"],
  ["GET", "/api/admin/verifications/pending", "ADMIN", "admin"],
  ["GET", "/api/admin/verifications/stats", "ADMIN", "admin"],
  ["GET", "/api/admin/bookings", "ADMIN", "admin"],
  ["GET", "/api/admin/bookings/:bookingId", "ADMIN", "admin"],
  ["PATCH", "/api/admin/bookings/:bookingId/status", "ADMIN", "admin"],
  ["GET", "/api/admin/disputes", "ADMIN", "admin"],
  ["PATCH", "/api/admin/disputes/:bookingId/resolve", "ADMIN", "admin"],
  ["GET", "/api/admin/payments", "ADMIN", "admin"],
  ["GET", "/api/admin/payments/:paymentId", "ADMIN", "admin"],
  ["POST", "/api/admin/payments/:bookingId/release", "ADMIN", "admin"],
  ["POST", "/api/admin/payments/:bookingId/refund", "ADMIN", "admin"],
  ["PATCH", "/api/admin/payments/:bookingId/verify", "ADMIN", "admin"],
  ["PATCH", "/api/admin/payments/:bookingId/reject-manual", "ADMIN", "admin"],
  ["GET", "/api/admin/withdrawals", "ADMIN", "admin"],
  ["PATCH", "/api/admin/withdrawals/:withdrawalId/approve", "ADMIN", "admin"],
  ["PATCH", "/api/admin/withdrawals/:withdrawalId/reject", "ADMIN", "admin"],
  ["POST", "/api/admin/withdrawals/:withdrawalId/payout", "ADMIN", "admin"],
  ["GET", "/api/admin/categories", "ADMIN", "admin"],
  ["POST", "/api/admin/categories", "ADMIN", "admin"],
  ["PATCH", "/api/admin/categories/:categoryId", "ADMIN", "admin"],
  ["DELETE", "/api/admin/categories/:categoryId", "ADMIN", "admin"],
  ["GET", "/api/admin/reviews", "ADMIN", "admin"],
  ["DELETE", "/api/admin/reviews/:reviewId", "ADMIN", "admin"],
  ["GET", "/api/admin/jobs", "ADMIN", "admin"],
  ["GET", "/api/admin/subscriptions", "ADMIN", "admin"],
  ["GET", "/api/admin/featured", "ADMIN", "admin"],
  ["GET", "/api/admin/posts", "ADMIN", "admin"],
  ["GET", "/api/admin/conversations", "ADMIN", "admin"],
  ["POST", "/api/admin/broadcast", "ADMIN", "admin"],
  ["GET", "/api/admin/video-calls", "ADMIN", "admin"],
  ["GET", "/api/subscriptions/admin/promo-codes", "ADMIN", "admin"],
  ["POST", "/api/subscriptions/admin/promo-codes", "ADMIN", "admin"],
  ["PATCH", "/api/subscriptions/admin/promo-codes/:id", "ADMIN", "admin"],
  [
    "PATCH",
    "/api/subscriptions/admin/promo-codes/:id/toggle",
    "ADMIN",
    "admin",
  ],
  ["DELETE", "/api/subscriptions/admin/promo-codes/:id", "ADMIN", "admin"],
  ["GET", "/api/referral/admin", "ADMIN", "admin"],
  ["GET", "/api/referral/admin/stats", "ADMIN", "admin"],
  ["PATCH", "/api/referral/admin/:id/flag", "ADMIN", "admin"],
  ["PATCH", "/api/referral/admin/:id/expire", "ADMIN", "admin"],
  ["POST", "/api/referral/admin/:id/reward", "ADMIN", "admin"],
  ["PATCH", "/api/referral/admin/:id/wallet", "ADMIN", "admin"],
  ["GET", "/api/campaign/admin/stats", "ADMIN", "admin"],
  ["GET", "/api/campaign/admin/submissions", "ADMIN", "admin"],
  ["PATCH", "/api/campaign/admin/submissions/:id/review", "ADMIN", "admin"],
  ["GET", "/api/campaign/admin/withdrawals", "ADMIN", "admin"],
  ["PATCH", "/api/campaign/admin/withdrawals/:id/approve", "ADMIN", "admin"],
  ["PATCH", "/api/campaign/admin/withdrawals/:id/reject", "ADMIN", "admin"],
  // Audit
  ["GET", "/api/audit", "ADMIN", "audit"],
  ["GET", "/api/audit/stats", "ADMIN", "audit"],
  ["GET", "/api/audit/me", "ADMIN", "audit"],
  ["GET", "/api/audit/:id", "ADMIN", "audit"],
  // Health
  ["GET", "/health", "PUBLIC", "health"],
];

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — verify we are in a frontend project
// ─────────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(SRC)) {
  console.error(
    `\n  ❌  src/ directory not found. Run from the frontend project root.\n`,
  );
  process.exit(1);
}

const allFiles = walk(SRC);
const jsxFiles = allFiles.filter((f) => /\.(jsx?|tsx?)$/.test(f));
const cssFiles = allFiles.filter((f) => f.endsWith(".css"));
const storeFiles = jsxFiles.filter(
  (f) => f.includes("store") || f.includes("Store"),
);
const pageFiles = jsxFiles.filter((f) => f.includes("/pages/"));
const compFiles = jsxFiles.filter((f) => f.includes("/components/"));
const hookFiles = jsxFiles.filter(
  (f) => f.includes("/hooks/") || /use[A-Z]/.test(path.basename(f)),
);
const libFiles = jsxFiles.filter(
  (f) =>
    f.includes("/lib/") || f.includes("/services/") || f.includes("/utils/"),
);

out(`\n${LINE}`);
out(`  SkilledProz Frontend Audit`);
out(`  ${new Date().toLocaleString()}`);
out(LINE);

// ─────────────────────────────────────────────────────────────────────────────
// § 1  FILE INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 1  FILE INVENTORY`);
out(`${"═".repeat(80)}\n`);

function listFiles(label, files) {
  out(`  ┌─ ${label}  (${files.length} files)`);
  files.forEach((f) => out(`  │   ${rel(f)}`));
  out(`  └${"─".repeat(60)}`);
}

listFiles("Pages", pageFiles);
listFiles("Components", compFiles);
listFiles("Hooks", hookFiles);
listFiles("Stores", storeFiles);
listFiles("Lib/Utils", libFiles);
listFiles("CSS Modules", cssFiles);
out(`\n  Total JS/JSX : ${jsxFiles.length} files`);
out(`  Total CSS    : ${cssFiles.length} files`);

// ─────────────────────────────────────────────────────────────────────────────
// § 2  API CALL INVENTORY
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 2  API CALL INVENTORY`);
out(`${"═".repeat(80)}\n`);

// Extract api.METHOD(url) calls — handles template literals + string literals
const API_CALL_RE =
  /api\.(get|post|put|patch|delete)\(\s*[`'"](\/[^`'")\s]+)/gi;
const FETCH_RE = /fetch\([`'"](https?:\/\/[^`'"]+\/api\/[^`'"]+)/gi;
const AXIOS_RE = /axios\.(get|post|put|patch|delete)\([`'"](\/[^`'")\s]+)/gi;

const apiCalls = []; // { method, path, file, line }

for (const file of jsxFiles) {
  const content = read(file);
  const fileRel = rel(file);
  const contentLines = content.split("\n");

  for (let i = 0; i < contentLines.length; i++) {
    const ln = contentLines[i];

    // api.method( calls
    let m;
    const re1 = /api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"\s)]+)/gi;
    while ((m = re1.exec(ln)) !== null) {
      apiCalls.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: fileRel,
        line: i + 1,
      });
    }
    // axios direct
    const re2 = /axios\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"\s)]+)/gi;
    while ((m = re2.exec(ln)) !== null) {
      apiCalls.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: fileRel,
        line: i + 1,
      });
    }
    // fetch() with /api/
    const re3 = /fetch\(\s*[`'"](\/api\/[^`'"\s)]+)/gi;
    while ((m = re3.exec(ln)) !== null) {
      apiCalls.push({ method: "GET", path: m[1], file: fileRel, line: i + 1 });
    }
  }
}

// Group by path
const callsByPath = {};
for (const c of apiCalls) {
  const key = `${c.method} ${c.path}`;
  if (!callsByPath[key]) callsByPath[key] = [];
  callsByPath[key].push(`${c.file}:${c.line}`);
}

out(`  Total API calls found: ${apiCalls.length}`);
out(`  Unique endpoints called: ${Object.keys(callsByPath).length}\n`);

// Print grouped
for (const [key, locs] of Object.entries(callsByPath).sort()) {
  out(`  ${key}`);
  locs.forEach((l) => out(`      ← ${l}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// § 3  BACKEND COVERAGE (which backend routes are NOT called from frontend)
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 3  BACKEND ROUTE COVERAGE`);
out(`${"═".repeat(80)}\n`);

// Normalise a path for comparison — strip dynamic segments to :param
function normPath(p) {
  return p
    .replace(/\/\d+/g, "/:id") // /123 → /:id
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "/:id") // UUID → /:id
    .replace(/\?.*$/, ""); // strip query string
}

const frontendPaths = new Set(
  Object.keys(callsByPath).map((k) => {
    const [m, p] = k.split(" ");
    return `${m} ${normPath(p)}`;
  }),
);

function routeMatches(method, backendPath) {
  const norm = normPath(backendPath);
  const key = `${method} ${norm}`;
  if (frontendPaths.has(key)) return true;

  // Fuzzy: check if any frontend call starts with the same prefix after /api/
  for (const fp of frontendPaths) {
    const [fm, fp2] = fp.split(" ");
    if (fm !== method) continue;
    // normalise both: replace any /:xxx segment
    const n1 = norm.replace(/:\w+/g, ":x");
    const n2 = normPath(fp2).replace(/:\w+/g, ":x");
    if (n1 === n2) return true;
  }
  return false;
}

const covered = [];
const uncovered = [];

for (const [method, bPath, auth, area] of BACKEND_ROUTES) {
  if (routeMatches(method, bPath)) {
    covered.push([method, bPath, auth, area]);
  } else {
    uncovered.push([method, bPath, auth, area]);
  }
}

out(`  Covered    : ${covered.length} / ${BACKEND_ROUTES.length}`);
out(`  Uncovered  : ${uncovered.length} / ${BACKEND_ROUTES.length}\n`);

// Group uncovered by area
const uncoveredByArea = {};
for (const r of uncovered) {
  const area = r[3];
  if (!uncoveredByArea[area]) uncoveredByArea[area] = [];
  uncoveredByArea[area].push(r);
}

for (const [area, routes] of Object.entries(uncoveredByArea).sort()) {
  out(`  ┌─ ${area.toUpperCase()}  (${routes.length} uncovered)`);
  for (const [m, p, auth] of routes) {
    const flag =
      auth === "ADMIN" ? "🔐ADMIN" : auth === "PUBLIC" ? "🌐PUB" : "🔑AUTH";
    out(`  │   ${flag}  ${m.padEnd(7)} ${p}`);
  }
  out(`  └${"─".repeat(60)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// § 4  ORPHAN API CALLS (frontend calls that don't match any backend route)
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 4  ORPHAN FRONTEND API CALLS (no matching backend route)`);
out(`${"═".repeat(80)}\n`);

const backendNorms = new Set(
  BACKEND_ROUTES.map(([m, p]) => `${m} ${normPath(p).replace(/:\w+/g, ":x")}`),
);

const orphans = [];
for (const [key, locs] of Object.entries(callsByPath)) {
  const [m, p] = key.split(" ");
  const norm = normPath(p).replace(/:\w+/g, ":x");
  if (!backendNorms.has(`${m} ${norm}`)) {
    orphans.push({ key, locs });
  }
}

if (orphans.length === 0) {
  out(`  ✅  All frontend API calls match known backend routes.`);
} else {
  out(`  ⚠️  ${orphans.length} call(s) with no matching backend route:\n`);
  for (const { key, locs } of orphans) {
    out(`  ❓  ${key}`);
    locs.forEach((l) => out(`      ← ${l}`));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// § 5  CSS MODULE AUDIT
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 5  CSS MODULE AUDIT`);
out(`${"═".repeat(80)}\n`);

let totalUndefined = 0;
let totalUnused = 0;

for (const cssFile of cssFiles) {
  const cssRel = rel(cssFile);
  const cssContent = read(cssFile);

  // Extract defined classes
  const defined = new Set();
  for (const m of cssContent.matchAll(/\.([\w-]+)\s*[{,:]/g)) {
    defined.add(m[1]);
  }

  // Find the matching JS file(s) that import this CSS module
  const baseName = path.basename(cssFile, ".css");
  const parentDir = path.dirname(cssFile);
  const usedClasses = new Set();
  const usedIn = [];

  for (const jsFile of jsxFiles) {
    const jsContent = read(jsFile);
    // Check if this JS file imports this CSS module
    if (!jsContent.includes(path.basename(cssFile))) continue;
    usedIn.push(rel(jsFile));

    // Extract used class names: styles.foo  or  s.foo  or  styles['foo']
    for (const m of jsContent.matchAll(/(?:styles|s|css)\.([\w]+)/g)) {
      usedClasses.add(m[1]);
    }
    for (const m of jsContent.matchAll(
      /(?:styles|s|css)\[['"`]([\w-]+)['"`]\]/g,
    )) {
      usedClasses.add(m[1]);
    }
    // Template literal: styles[`foo`]
    for (const m of jsContent.matchAll(/(?:styles|s|css)\[`([\w-]+)`\]/g)) {
      usedClasses.add(m[1]);
    }
  }

  if (usedIn.length === 0) continue; // not imported anywhere — skip

  const undefined_ = [...usedClasses].filter((c) => !defined.has(c));
  const unused_ = [...defined].filter(
    (c) =>
      !usedClasses.has(c) &&
      !c.startsWith("@") &&
      // Ignore pseudo-class-style helpers like fadeUp, spin, pulse
      !["fadeUp", "fadeIn", "spin", "pulse", "slideIn", "slideDown"].includes(
        c,
      ),
  );

  if (undefined_.length > 0 || unused_.length > 0) {
    out(`  ┌─ ${cssRel}`);
    if (undefined_.length > 0) {
      out(
        `  │   ❌ USED but NOT DEFINED (${undefined_.length}): ${undefined_.slice(0, 10).join(", ")}${undefined_.length > 10 ? "…" : ""}`,
      );
      totalUndefined += undefined_.length;
    }
    if (unused_.length > 0) {
      out(
        `  │   ⚠️  DEFINED but UNUSED (${unused_.length}): ${unused_.slice(0, 8).join(", ")}${unused_.length > 8 ? "…" : ""}`,
      );
      totalUnused += unused_.length;
    }
    out(`  └${"─".repeat(60)}`);
  }
}

if (totalUndefined === 0 && totalUnused === 0) {
  out(`  ✅  No CSS issues found.`);
} else {
  out(`\n  Total undefined class usages : ${totalUndefined}`);
  out(`  Total unused class definitions: ${totalUnused}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// § 6  IMPORT AUDIT  (broken imports)
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 6  IMPORT AUDIT`);
out(`${"═".repeat(80)}\n`);

const brokenImports = [];

for (const file of jsxFiles) {
  const content = read(file);
  const dir = path.dirname(file);

  for (const m of content.matchAll(/import\s+.*?from\s+['"](\.[^'"]+)['"]/g)) {
    const raw = m[1];
    // Try resolving with known extensions
    const candidates = [
      path.resolve(dir, raw),
      path.resolve(dir, raw + ".js"),
      path.resolve(dir, raw + ".jsx"),
      path.resolve(dir, raw + ".ts"),
      path.resolve(dir, raw + ".tsx"),
      path.resolve(dir, raw + "/index.js"),
      path.resolve(dir, raw + "/index.jsx"),
    ];
    const exists = candidates.some((c) => fs.existsSync(c));
    if (!exists) {
      brokenImports.push(`${rel(file)} → "${raw}"`);
    }
  }
}

if (brokenImports.length === 0) {
  out(`  ✅  All relative imports resolve.`);
} else {
  out(`  ❌  ${brokenImports.length} broken relative import(s):\n`);
  brokenImports.forEach((b) => out(`  ✗  ${b}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// § 7  STORE AUDIT
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 7  STORE AUDIT`);
out(`${"═".repeat(80)}\n`);

for (const sf of storeFiles) {
  const content = read(sf);
  const storeRel = rel(sf);

  // Extract exported/defined actions (functions assigned in zustand create)
  const actions = [];
  for (const m of content.matchAll(
    /(?:export\s+const\s+|^\s+)(\w+)\s*[:=]\s*(?:async\s*)?\(/gm,
  )) {
    if (!["set", "get", "setState"].includes(m[1])) actions.push(m[1]);
  }
  // Also catch plain object keys like  login: async (...)
  for (const m of content.matchAll(/^\s{2,4}(\w+)\s*:\s*(?:async\s*)?\(/gm)) {
    if (!["set", "get"].includes(m[1]) && !actions.includes(m[1]))
      actions.push(m[1]);
  }

  if (actions.length === 0) continue;

  // Find which components use each action
  const usageMap = {};
  for (const action of actions) {
    usageMap[action] = [];
    const re = new RegExp(`\\b${action}\\b`, "g");
    for (const jf of jsxFiles) {
      if (jf === sf) continue;
      const jc = read(jf);
      if (re.test(jc)) usageMap[action].push(rel(jf));
    }
  }

  out(`  ┌─ ${storeRel}`);
  for (const [action, users] of Object.entries(usageMap)) {
    if (users.length === 0) {
      out(`  │   ⚠️  ${action}  ← unused`);
    } else {
      out(`  │   ✅  ${action}  ← ${users.length} component(s)`);
    }
  }
  out(`  └${"─".repeat(60)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// § 8  REACT ROUTER AUDIT
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 8  REACT ROUTER AUDIT`);
out(`${"═".repeat(80)}\n`);

// Find declared routes
const declaredRoutes = new Set();
const navigatePaths = new Set();
const linkPaths = new Set();

for (const file of jsxFiles) {
  const content = read(file);

  // <Route path="..." or <Route path={...}
  for (const m of content.matchAll(/<Route[^>]+path=["'`]([^"'`\s]+)["'`]/g)) {
    declaredRoutes.add(m[1]);
  }
  // navigate("/path")
  for (const m of content.matchAll(/navigate\(\s*["'`]([^"'`\s)]+)["'`]/g)) {
    navigatePaths.add(m[1]);
  }
  // <Link to="/path"
  for (const m of content.matchAll(/<Link[^>]+to=["'`]([^"'`\s{]+)["'`]/g)) {
    linkPaths.add(m[1]);
  }
}

out(`  Declared routes  : ${declaredRoutes.size}`);
[...declaredRoutes].sort().forEach((r) => out(`    ${r}`));

// Navigate calls that have no declared route
const allNavigations = new Set([...navigatePaths, ...linkPaths]);
const orphanNavs = [...allNavigations].filter((p) => {
  // Exact match or prefix match (dynamic segments)
  if (p.startsWith("http") || p.startsWith("#") || p === "/") return false;
  const base = p.split("?")[0].split("#")[0];
  return ![...declaredRoutes].some((r) => {
    const norm = r.replace(/:[^/]+/g, ":x");
    const nb = base.replace(/\/[a-f0-9-]{36}/g, "/:x").replace(/\/\d+/g, "/:x");
    return norm === nb || nb.startsWith(norm.replace("*", ""));
  });
});

if (orphanNavs.length > 0) {
  out(
    `\n  ⚠️  Navigate/Link targets with no declared Route (${orphanNavs.length}):`,
  );
  orphanNavs.sort().forEach((p) => out(`    ? ${p}`));
} else {
  out(`\n  ✅  All navigate() / Link paths have matching Route declarations.`);
}

// ─────────────────────────────────────────────────────────────────────────────
// § 9  AUTH GUARD AUDIT (pages that call APIs but might lack auth checks)
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  § 9  AUTH GUARD AUDIT`);
out(`${"═".repeat(80)}\n`);

const authPatterns = [
  /useAuthStore/,
  /ProtectedRoute/,
  /RequireAuth/,
  /isAuthenticated/,
  /useRequireAuth/,
  /getToken\(\)/,
];

const missingGuards = [];
for (const pf of pageFiles) {
  const content = read(pf);
  const hasApi = /api\.(get|post|put|patch|delete)\(/.test(content);
  const hasAuth = authPatterns.some((re) => re.test(content));
  const isPublicPage = /login|register|forgot|reset|verify/i.test(pf);
  if (hasApi && !hasAuth && !isPublicPage) {
    missingGuards.push(rel(pf));
  }
}

if (missingGuards.length === 0) {
  out(`  ✅  All data-fetching pages appear to have auth guards.`);
} else {
  out(
    `  ⚠️  ${missingGuards.length} page(s) fetch data but may lack auth checks:\n`,
  );
  missingGuards.forEach((p) => out(`  ?  ${p}`));
}

// ─────────────────────────────────────────────────────────────────────────────
// §10  SUMMARY
// ─────────────────────────────────────────────────────────────────────────────
out(`\n${"═".repeat(80)}`);
out(`  §10  SUMMARY & PRIORITY ACTION LIST`);
out(`${"═".repeat(80)}\n`);

const backendCoveragePct = Math.round(
  (covered.length / BACKEND_ROUTES.length) * 100,
);

out(
  `  Backend route coverage : ${covered.length}/${BACKEND_ROUTES.length} (${backendCoveragePct}%)`,
);
out(`  Total API calls        : ${apiCalls.length}`);
out(`  Orphan API calls       : ${orphans.length}`);
out(`  Broken imports         : ${brokenImports.length}`);
out(`  CSS undefined classes  : ${totalUndefined}`);
out(`  CSS unused classes     : ${totalUnused}`);
out(`  Unguarded pages        : ${missingGuards.length}`);
out(`  Orphan nav targets     : ${orphanNavs.length}`);

out(`\n  CRITICAL — needs immediate attention:`);
if (brokenImports.length > 0)
  out(
    `  🔴  ${brokenImports.length} broken import(s) — will cause runtime crashes`,
  );
if (totalUndefined > 0)
  out(
    `  🔴  ${totalUndefined} CSS class(es) used but not defined — invisible in UI`,
  );
if (orphans.length > 0)
  out(`  🔴  ${orphans.length} API call(s) with no matching backend route`);
if (brokenImports.length === 0 && totalUndefined === 0 && orphans.length === 0)
  out(`  ✅  No critical issues.`);

out(`\n  HIGH — missing backend coverage by area:`);
const highPriorityAreas = [
  "bookings",
  "payments",
  "messages",
  "notifications",
  "settings",
  "verification",
];
for (const area of highPriorityAreas) {
  const missing = uncovered.filter((r) => r[3] === area && r[2] !== "ADMIN");
  if (missing.length > 0)
    out(
      `  🟠  ${area}: ${missing.length} endpoint(s) not yet called from frontend`,
    );
}

out(`\n  MEDIUM — admin area coverage:`);
const adminMissing = uncovered.filter((r) => r[2] === "ADMIN");
out(
  `  🟡  ${adminMissing.length} admin endpoint(s) not yet called from frontend`,
);

out(`\n  RECOMMENDED — add frontend for these high-value uncovered endpoints:`);
const recommended = uncovered
  .filter((r) => r[2] !== "ADMIN")
  .filter((r) => !["health", "audit"].includes(r[3]))
  .slice(0, 12);
for (const [m, p] of recommended) {
  out(`  💡  ${m.padEnd(7)} ${p}`);
}

out(`\n${LINE}`);
out(` Audit complete — ${new Date().toLocaleString()}`);
if (OUTPUT_FILE) {
  out(` Report: ${OUTPUT_FILE}`);
}
out(LINE + "\n");

// ─────────────────────────────────────────────────────────────────────────────
// SAVE TO FILE
// ─────────────────────────────────────────────────────────────────────────────
if (OUTPUT_FILE) {
  fs.writeFileSync(OUTPUT_FILE, lines.join("\n"), "utf8");
}
