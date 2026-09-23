#!/usr/bin/env node
// scripts/audit-admin-match.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Cross-references the backend and frontend audits, groups findings by domain,
// and produces a per-domain migration plan.
//
// Reads:
//   admin-audit-backend.txt
//   admin-audit-frontend.txt
//
// Writes:
//   admin-audit-migration.txt
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BACKEND = path.join(ROOT, "admin-audit-backend.txt");
const FRONTEND = path.join(ROOT, "admin-audit-frontend.txt");
const OUT = path.join(ROOT, "admin-audit-migration.txt");

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN MAP
// Ordered so longer (plural) prefixes match before shorter (singular) ones.
// Both singular and plural of each domain map to the SAME target, so URLs
// like /api/subscriptions/admin/promo-codes and /api/subscription/admin/...
// both rewrite to /api/admin/subscriptions/...
// ─────────────────────────────────────────────────────────────────────────────
const DOMAIN_MAP = {
  // ── Plurals first ──────────────────────────────────────────────────────────
  "/api/referrals": "/api/admin/referrals",
  "/api/subscriptions": "/api/admin/subscriptions",
  "/api/disputes": "/api/admin/disputes",
  "/api/verifications": "/api/admin/verifications",
  "/api/categories": "/api/admin/categories",
  "/api/reviews": "/api/admin/reviews",
  "/api/messages": "/api/admin/messages",
  "/api/bookings": "/api/admin/bookings",
  "/api/reports": "/api/admin/reports",
  "/api/surveys": "/api/admin/surveys",
  "/api/refunds": "/api/admin/refunds",
  "/api/wallets": "/api/admin/wallets",

  // ── Singulars ──────────────────────────────────────────────────────────────
  "/api/referral": "/api/admin/referrals",
  "/api/campaign": "/api/admin/campaigns",
  "/api/campaigns": "/api/admin/campaigns",
  "/api/payments": "/api/admin/payments",
  "/api/payment": "/api/admin/payments",
  "/api/wallet": "/api/admin/wallets",
  "/api/hirerWallet": "/api/admin/wallets",
  "/api/dispute": "/api/admin/disputes",
  "/api/subscription": "/api/admin/subscriptions",
  "/api/job": "/api/admin/jobs",
  "/api/jobs": "/api/admin/jobs",
  "/api/jobPost": "/api/admin/jobs",
  "/api/adminJob": "/api/admin/jobs",
  "/api/review": "/api/admin/reviews",
  "/api/message": "/api/admin/messages",
  "/api/category": "/api/admin/categories",
  "/api/verification": "/api/admin/verifications",
  "/api/booking": "/api/admin/bookings",
  "/api/user": "/api/admin/users",
  "/api/users": "/api/admin/users",

  // ── Additional domains ─────────────────────────────────────────────────────
  "/api/feedback": "/api/admin/feedback",
  "/api/audit": "/api/admin/audit",
  "/api/refund": "/api/admin/refunds",
  "/api/report": "/api/admin/reports",
  "/api/survey": "/api/admin/surveys",
  "/api/waitlist": "/api/admin/waitlist",

  // ── Already-admin paths (leave as-is; keep last so nothing else matches) ──
  "/api/admin": "/api/admin",
};

// ─────────────────────────────────────────────────────────────────────────────
// URL REWRITE
// Strips any embedded /admin segment anywhere in the path (not just the
// leading one), so /api/referral/admin/stats and /api/referral/stats both
// become /api/admin/referrals/stats after prefix matching.
// ─────────────────────────────────────────────────────────────────────────────
function rewriteUrl(oldUrl) {
  // Normalize trailing slash (but keep root /)
  let url = oldUrl.trim();
  if (url.length > 1 && url.endsWith("/")) url = url.slice(0, -1);

  for (const [from, to] of Object.entries(DOMAIN_MAP)) {
    // Exact match (e.g. "/api/payments" → "/api/admin/payments")
    if (url === from) return to;

    // Prefix match with a boundary (slash), so "/api/users" doesn't match
    // "/api/userRoles" or similar
    if (url === from + "" || url.startsWith(from + "/")) {
      let rest = url.slice(from.length); // includes leading "/"
      // Strip ANY /admin segment anywhere in the path
      rest = rest.replace(/\/admin(?=\/|$)/g, "");
      // Collapse any accidental double slashes
      rest = rest.replace(/\/+/g, "/");
      // Strip trailing slash again after cleanup
      if (rest.length > 1 && rest.endsWith("/")) rest = rest.slice(0, -1);
      // If rest is empty or "/", just return the target
      if (!rest || rest === "/") return to;
      return to + rest;
    }
  }
  return url;
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE BACKEND REPORT
// ─────────────────────────────────────────────────────────────────────────────
function parseBackend(text) {
  const handlers = {}; // controller file → [handler names]
  const routes = {}; // routes file → [{method, path, fullPath}]
  const importedHandlers = {}; // source controller → [names]

  const lines = text.split("\n");
  let section = null;
  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith("A. ADMIN HANDLERS")) section = "A";
    else if (line.startsWith("B. ADMIN ROUTES")) section = "B";
    else if (line.startsWith("C. HANDLERS IMPORTED")) section = "C";
    else if (line.startsWith("D. DUPLICATE")) section = "D";

    if (section === "A") {
      if (/^src\/controllers\/.+\.js$/.test(line.trim())) {
        currentFile = line.trim();
        handlers[currentFile] = [];
      } else if (currentFile && /^ {2}[A-Za-z_$]/.test(line)) {
        handlers[currentFile].push(line.trim());
      }
    } else if (section === "B") {
      if (/^src\/routes\/.+\.js/.test(line.trim())) {
        // Line looks like: "src/routes/refund.routes.js  (mounted at /api/refunds)"
        currentFile = line.trim().split(" ")[0];
        routes[currentFile] = [];
      } else if (currentFile && /^ {2}(GET|POST|PATCH|PUT|DELETE)/.test(line)) {
        const m = line.trim().match(/^(\w+)\s+(\S+)\s+→\s+(\S+)/);
        if (m) {
          routes[currentFile].push({
            method: m[1],
            path: m[2],
            fullPath: m[3],
          });
        }
      }
    } else if (section === "C") {
      const m = line.match(/^From (\.\.\/controllers\/[^:]+):/);
      if (m) {
        currentFile = m[1];
        importedHandlers[currentFile] = [];
      } else if (currentFile && /^ {2}- /.test(line)) {
        importedHandlers[currentFile].push(line.replace(/^ {2}- /, "").trim());
      }
    }
  }

  return { handlers, routes, importedHandlers };
}

// ─────────────────────────────────────────────────────────────────────────────
// PARSE FRONTEND REPORT
// ─────────────────────────────────────────────────────────────────────────────
function parseFrontend(text) {
  const files = {}; // file → [{method, url, isViolation}]
  const lines = text.split("\n");
  let inPerFile = false;
  let currentFile = null;

  for (const line of lines) {
    if (line.startsWith("PER-FILE API CALLS")) inPerFile = true;
    else if (line.startsWith("NON-ADMIN CALLS GROUPED")) inPerFile = false;

    if (!inPerFile) continue;

    if (/^src\/pages\/admin\/.+\.jsx?$/.test(line.trim())) {
      currentFile = line.trim();
      files[currentFile] = [];
    } else if (currentFile && /^ {2}(GET|POST|PATCH|PUT|DELETE)/.test(line)) {
      const m = line.trim().match(/^(\w+)\s+(\S+)\s+(\S+)(?:\s+(.+))?$/);
      if (m) {
        files[currentFile].push({
          method: m[1],
          url: m[2],
          isViolation: line.includes("❌"),
        });
      }
    }
  }

  return files;
}

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN NORMALIZATION
// Maps filenames like "admin.dispute", "adminJob", "hirerWallet" to a single
// canonical domain string so they merge in the plan output.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeDomain(raw) {
  let d = raw.toLowerCase();
  // Strip common prefixes/suffixes
  d = d.replace(/^admin\./, "").replace(/^admin/, "");
  d = d.replace(/controller$/, "");
  d = d.replace(/routes$/, "");
  // Known aliases → canonical
  const aliases = {
    dispute: "dispute",
    disputes: "dispute",
    payment: "payment",
    payments: "payment",
    category: "category",
    categories: "category",
    review: "review",
    reviews: "review",
    verification: "verification",
    verifications: "verification",
    referral: "referral",
    referrals: "referral",
    report: "report",
    reports: "report",
    subscription: "subscription",
    subscriptions: "subscription",
    refund: "refund",
    refunds: "refund",
    job: "job",
    jobs: "job",
    jobpost: "job",
    adminjob: "job",
    wallet: "wallet",
    hirerwallet: "wallet",
    campaign: "campaign",
    feedback: "feedback",
    survey: "survey",
    surveys: "survey",
    waitlist: "waitlist",
    audit: "audit",
    adminlogs: "auditlog",
    auditlog: "auditlog",
    message: "message",
    messages: "message",
    booking: "booking",
    bookings: "booking",
    user: "user",
    users: "user",
  };
  return aliases[d] || d || "misc";
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
function main() {
  if (!fs.existsSync(BACKEND)) {
    console.error(
      `❌ Missing ${path.relative(ROOT, BACKEND)} — run npm run audit:admin:backend first`,
    );
    process.exit(1);
  }
  if (!fs.existsSync(FRONTEND)) {
    console.error(
      `❌ Missing ${path.relative(ROOT, FRONTEND)} — run npm run audit:admin:frontend first`,
    );
    process.exit(1);
  }

  const backend = parseBackend(fs.readFileSync(BACKEND, "utf8"));
  const frontend = parseFrontend(fs.readFileSync(FRONTEND, "utf8"));

  const out = [];
  const log = (s = "") => {
    console.log(s);
    out.push(s);
  };

  log("═══════════════════════════════════════════════════════════════");
  log("ADMIN MIGRATION PLAN");
  log("═══════════════════════════════════════════════════════════════");
  log("");

  // ── Domain buckets keyed by CANONICAL domain name ────────────────────────
  const domainBuckets = {};

  function ensureBucket(domain) {
    if (!domainBuckets[domain]) {
      domainBuckets[domain] = { handlers: [], routes: [], frontendFiles: {} };
    }
    return domainBuckets[domain];
  }

  // Domain from a route's fullPath: /api/referral/admin/stats → referral
  function domainOfRoute(fullPath) {
    const m = fullPath.match(/^\/api\/([^/]+)/);
    return m ? normalizeDomain(m[1]) : "misc";
  }

  // Domain from a controller filename: src/controllers/report.controller.js → report
  function domainOfControllerFile(file) {
    const base = path.basename(file).replace(/\.controller\.js$/, "");
    return normalizeDomain(base);
  }

  // Domain from a frontend URL: /referral/admin/stats → referral
  function domainOfFrontendUrl(url) {
    const m = url.match(/^\/([^/]+)/);
    return m ? normalizeDomain(m[1]) : "misc";
  }

  // ── Route buckets ─────────────────────────────────────────────────────────
  for (const [file, routeList] of Object.entries(backend.routes)) {
    for (const r of routeList) {
      const domain = domainOfRoute(r.fullPath);
      ensureBucket(domain).routes.push({ ...r, file });
    }
  }

  // ── Handler buckets ───────────────────────────────────────────────────────
  for (const [file, handlerList] of Object.entries(backend.handlers)) {
    const domain = domainOfControllerFile(file);
    for (const h of handlerList) {
      ensureBucket(domain).handlers.push({ name: h, file });
    }
  }

  // ── Frontend buckets ──────────────────────────────────────────────────────
  for (const [file, calls] of Object.entries(frontend)) {
    for (const c of calls) {
      if (!c.isViolation) continue;
      const domain = domainOfFrontendUrl(c.url);
      const bucket = ensureBucket(domain);
      if (!bucket.frontendFiles[file]) bucket.frontendFiles[file] = [];
      bucket.frontendFiles[file].push(c);
    }
  }

  // ── Emit plan per domain (sorted alphabetically) ──────────────────────────
  const domains = Object.keys(domainBuckets).sort();
  for (const domain of domains) {
    const b = domainBuckets[domain];
    if (
      b.handlers.length === 0 &&
      b.routes.length === 0 &&
      Object.keys(b.frontendFiles).length === 0
    )
      continue;

    log(`═════════════════════════════════════════════════════════════`);
    log(`DOMAIN: ${domain}`);
    log(`═════════════════════════════════════════════════════════════`);
    log("");

    if (b.handlers.length) {
      log("Backend handlers to move → admin.controller.js:");
      // Dedupe by (name + file)
      const seen = new Set();
      for (const h of b.handlers) {
        const key = `${h.name}|${h.file}`;
        if (seen.has(key)) continue;
        seen.add(key);
        log(`  • ${h.name}  (from ${h.file})`);
      }
      log("");
    }

    if (b.routes.length) {
      log("Backend routes to move → admin.routes.js:");
      // Dedupe by (method + fullPath)
      const seen = new Set();
      for (const r of b.routes) {
        const key = `${r.method}|${r.fullPath}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const newUrl = rewriteUrl(r.fullPath);
        const arrow =
          r.fullPath === newUrl ? "  (unchanged)" : `  →  ${newUrl}`;
        log(`  • ${r.method.padEnd(6)} ${r.fullPath}${arrow}`);
      }
      log("");
    }

    const ff = Object.keys(b.frontendFiles);
    if (ff.length) {
      log("Frontend files to update:");
      for (const file of ff) {
        log(`  • ${file}`);
        for (const c of b.frontendFiles[file]) {
          const newUrl = rewriteUrl(c.url);
          const arrow = c.url === newUrl ? "  (unchanged)" : `  →  ${newUrl}`;
          log(`      ${c.method.padEnd(6)} ${c.url}${arrow}`);
        }
      }
      log("");
    }
  }

  // ── Overall summary ───────────────────────────────────────────────────────
  log("═══════════════════════════════════════════════════════════════");
  log("SUMMARY");
  log("═══════════════════════════════════════════════════════════════");

  let totalHandlers = 0;
  let totalRoutes = 0;
  let totalFrontendFiles = 0;
  let totalFrontendCalls = 0;

  for (const b of Object.values(domainBuckets)) {
    const hSeen = new Set();
    const rSeen = new Set();
    for (const h of b.handlers) {
      const k = `${h.name}|${h.file}`;
      if (!hSeen.has(k)) {
        hSeen.add(k);
        totalHandlers++;
      }
    }
    for (const r of b.routes) {
      const k = `${r.method}|${r.fullPath}`;
      if (!rSeen.has(k)) {
        rSeen.add(k);
        totalRoutes++;
      }
    }
    totalFrontendFiles += Object.keys(b.frontendFiles).length;
    for (const calls of Object.values(b.frontendFiles)) {
      totalFrontendCalls += calls.length;
    }
  }

  log(`Handlers to move:      ${totalHandlers}`);
  log(`Routes to move:        ${totalRoutes}`);
  log(`Frontend files to fix: ${totalFrontendFiles}`);
  log(`Frontend calls to fix: ${totalFrontendCalls}`);
  log("");

  log("Suggested migration order (fewest items first):");
  const order = Object.entries(domainBuckets)
    .filter(
      ([, b]) =>
        b.handlers.length +
          b.routes.length +
          Object.keys(b.frontendFiles).length >
        0,
    )
    .map(([d, b]) => {
      // Count unique items
      const hSeen = new Set();
      const rSeen = new Set();
      let hCount = 0;
      let rCount = 0;
      for (const h of b.handlers) {
        const k = `${h.name}|${h.file}`;
        if (!hSeen.has(k)) {
          hSeen.add(k);
          hCount++;
        }
      }
      for (const r of b.routes) {
        const k = `${r.method}|${r.fullPath}`;
        if (!rSeen.has(k)) {
          rSeen.add(k);
          rCount++;
        }
      }
      const fCount = Object.keys(b.frontendFiles).length;
      return {
        domain: d,
        total: hCount + rCount + fCount,
        hCount,
        rCount,
        fCount,
      };
    })
    .sort((a, b) => a.total - b.total);

  for (let i = 0; i < order.length; i++) {
    const o = order[i];
    log(
      `  ${String(i + 1).padStart(2, " ")}. ${o.domain.padEnd(15)} (${o.hCount}h + ${o.rCount}r + ${o.fCount}f)`,
    );
  }
  log("");

  fs.writeFileSync(OUT, out.join("\n"));
  console.log(`\n📄 Full plan written to: ${path.relative(ROOT, OUT)}`);
}

main();
