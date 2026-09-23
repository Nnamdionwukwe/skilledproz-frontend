#!/usr/bin/env node
// scripts/audit-admin-frontend.mjs
// ─────────────────────────────────────────────────────────────────────────────
// Frontend audit: scans src/pages/admin/** and reports every API call.
// Flags calls that don't target /admin/* so we know which frontend components
// need URL updates when we consolidate backend admin routes.
//
// Output:
//   • Terminal summary
//   • admin-audit-frontend.txt (full detail)
// ─────────────────────────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const ADMIN_PAGES_DIR = path.join(ROOT, "src", "pages", "admin");
const API_FILE = path.join(ROOT, "src", "lib", "api.js");
const OUT_FILE = path.join(ROOT, "admin-audit-frontend.txt");

// ── Extract baseURL from src/lib/api.js ─────────────────────────────────────
function getBaseURL() {
  if (!fs.existsSync(API_FILE)) return "http://localhost:5000/api";
  const src = fs.readFileSync(API_FILE, "utf8");
  const m = src.match(
    /baseURL\s*:\s*import\.meta\.env\.VITE_API_URL\s*\|\|\s*[`"']([^`"']+)[`"']/,
  );
  if (m) return m[1];
  const m2 = src.match(/baseURL\s*:\s*[`"']([^`"']+)[`"']/);
  if (m2) return m2[1];
  return "http://localhost:5000/api";
}

// ── Walk a directory ─────────────────────────────────────────────────────────
function walk(dir, filter) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(full, filter));
    } else if (entry.isFile() && filter(full)) {
      out.push(full);
    }
  }
  return out;
}

// ── Extract every api.<method>(...) call from a file ────────────────────────
// Handles:
//   api.get("/path")
//   api.get(`/path/${id}`)
//   api.get("/path", { params })
//   api({ method: "get", url: "/path" })
function extractApiCalls(source) {
  const calls = [];

  // Pattern 1: api.<method>("<url>" | `<url>`)
  const re1 =
    /api\.(get|post|patch|put|delete)\s*\(\s*([`"'])((?:\\.|(?!\2).)*)\2/g;
  let m;
  while ((m = re1.exec(source))) {
    calls.push({
      method: m[1].toUpperCase(),
      url: m[3],
      kind: "method-call",
      raw: m[0].slice(0, 120),
    });
  }

  // Pattern 2: api({ method: "...", url: "..." })
  const re2 =
    /api\s*\(\s*\{[\s\S]*?method\s*:\s*[`"']([^`"']+)[`"'][\s\S]*?url\s*:\s*([`"'])((?:\\.|(?!\2).)*)\2[\s\S]*?\}/g;
  while ((m = re2.exec(source))) {
    calls.push({
      method: m[1].toUpperCase(),
      url: m[3],
      kind: "config-object",
      raw: m[0].slice(0, 120),
    });
  }

  // Normalize template literals: ${...} → :param
  const normalized = calls.map((c) => ({
    ...c,
    normalizedUrl: c.url.replace(/\$\{[^}]+\}/g, ":param"),
  }));

  return normalized;
}

// ── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const out = [];
  const log = (s = "") => {
    console.log(s);
    out.push(s);
  };

  const BASE = getBaseURL();

  log("═══════════════════════════════════════════════════════════════");
  log("ADMIN FRONTEND AUDIT");
  log("═══════════════════════════════════════════════════════════════");
  log("");
  log(`Base URL detected: ${BASE}`);
  log(`Admin pages dir:   ${path.relative(ROOT, ADMIN_PAGES_DIR)}`);
  log("");

  const files = walk(ADMIN_PAGES_DIR, (f) => /\.(jsx?|tsx?)$/.test(f));

  log(`Admin component files found: ${files.length}`);
  log("");

  const fileResults = [];
  const domainCounts = {}; // "/referral/admin" → count
  let cleanFiles = 0;
  let dirtyFiles = 0;
  let totalCalls = 0;
  let totalViolations = 0;

  for (const file of files) {
    const rel = path.relative(ROOT, file);
    const source = fs.readFileSync(file, "utf8");
    const calls = extractApiCalls(source);

    if (calls.length === 0) continue;

    const violations = calls.filter((c) => {
      const u = c.normalizedUrl;
      // Admin routes start with /admin (relative to baseURL)
      // Allow /auth/*, /uploads/* as non-admin supporting calls
      if (u.startsWith("/admin")) return false;
      if (u.startsWith("/auth")) return false;
      if (u.startsWith("/uploads")) return false;
      if (u.startsWith("/notifications")) return false; // shared user route
      return true;
    });

    totalCalls += calls.length;
    totalViolations += violations.length;

    if (violations.length === 0) {
      cleanFiles++;
      continue;
    }
    dirtyFiles++;

    // Domain grouping
    for (const v of violations) {
      const seg = v.normalizedUrl.split("/").slice(0, 3).join("/");
      domainCounts[seg] = (domainCounts[seg] || 0) + 1;
    }

    fileResults.push({ rel, calls, violations });
  }

  // ── Per-file detail ───────────────────────────────────────────────────────
  log("─────────────────────────────────────────────────────────────");
  log("PER-FILE API CALLS");
  log("─────────────────────────────────────────────────────────────");
  log("");

  for (const r of fileResults) {
    log(r.rel);
    for (const c of r.calls) {
      const isViolation = r.violations.includes(c);
      const tag = isViolation ? "❌ NOT ADMIN" : "✅ admin";
      log(`  ${c.method.padEnd(6)} ${c.normalizedUrl.padEnd(40)} ${tag}`);
    }
    log("");
  }

  // ── Grouped by source domain ──────────────────────────────────────────────
  log("─────────────────────────────────────────────────────────────");
  log("NON-ADMIN CALLS GROUPED BY SOURCE DOMAIN");
  log("─────────────────────────────────────────────────────────────");
  log("");

  const sortedDomains = Object.entries(domainCounts).sort(
    (a, b) => b[1] - a[1],
  );
  for (const [domain, count] of sortedDomains) {
    log(`  ${domain.padEnd(40)} ${count} call${count === 1 ? "" : "s"}`);
  }
  if (sortedDomains.length === 0) {
    log("  (none)");
  }
  log("");

  // ── Summary ───────────────────────────────────────────────────────────────
  log("═══════════════════════════════════════════════════════════════");
  log("SUMMARY");
  log("═══════════════════════════════════════════════════════════════");
  log(`Admin files scanned:       ${files.length}`);
  log(
    `Files with API calls:      ${totalCalls > 0 ? cleanFiles + dirtyFiles : 0}`,
  );
  log(`Files fully on /admin:     ${cleanFiles}`);
  log(`Files with non-admin URLs: ${dirtyFiles}`);
  log(`Total API calls:           ${totalCalls}`);
  log(`Non-admin calls to migrate: ${totalViolations}`);
  log("");

  // ── Write file ────────────────────────────────────────────────────────────
  fs.writeFileSync(OUT_FILE, out.join("\n"));
  console.log(`\n📄 Full report written to: ${path.relative(ROOT, OUT_FILE)}`);
}

main();
