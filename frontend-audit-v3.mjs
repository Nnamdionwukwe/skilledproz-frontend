#!/usr/bin/env node
// frontend-audit-v3.mjs — deep frontend audit
// Run from FRONTEND project root:
//   node frontend-audit-v3.mjs
//   node frontend-audit-v3.mjs --output report.txt

import fs from "fs";
import path from "path";

const SRC = path.resolve("src");
const ARGS = process.argv.slice(2);
const OUT_FILE = ARGS.includes("--output")
  ? ARGS[ARGS.indexOf("--output") + 1]
  : null;

const LINE = "=".repeat(80);
const THIN = "-".repeat(80);
const lines = [];

function out(s = "") {
  lines.push(s);
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
  return f
    .replace(SRC + path.sep, "src/")
    .split(path.sep)
    .join("/");
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
    } else if (exts.some((x) => e.name.endsWith(x))) {
      r.push(full);
    }
  }
  return r;
}
function lineCount(t) {
  return t ? t.split("\n").length : 0;
}

// ── Header ────────────────────────────────────────────────────────────────
out(LINE);
out("  SKILLEDPROZ - FRONTEND AUDIT v3");
out("  " + new Date().toLocaleString());
out("  Root: " + process.cwd());
out(LINE);

if (!fs.existsSync(SRC)) {
  console.error("src/ not found - run from frontend project root");
  process.exit(1);
}

// ── §1 INVENTORY ──────────────────────────────────────────────────────────
const allFiles = walk(SRC);
const jsxFiles = allFiles.filter((f) => /\.(jsx?|tsx?)$/.test(f));
const cssFiles = allFiles.filter((f) => f.endsWith(".css"));
const pageFiles = jsxFiles.filter((f) => f.includes("/pages/"));
const componentFiles = jsxFiles.filter((f) => f.includes("/components/"));
const storeFiles = jsxFiles.filter((f) => /\/store\//.test(f));
const hookFiles = jsxFiles.filter(
  (f) =>
    f.includes("/hooks/") || /use[A-Z].*\.(js|ts)x?$/.test(path.basename(f)),
);
const contextFiles = jsxFiles.filter((f) => f.includes("/context/"));
const apiFiles = jsxFiles.filter((f) => /\/(lib|api|services)\//.test(f));

out("\n" + THIN);
out("  §1  PROJECT INVENTORY");
out(THIN);
out("  Pages       : " + pageFiles.length);
out("  Components  : " + componentFiles.length);
out("  Stores      : " + storeFiles.length);
out("  Hooks       : " + hookFiles.length);
out("  Contexts    : " + contextFiles.length);
out("  API/lib     : " + apiFiles.length);
out("  CSS modules : " + cssFiles.length);
out("  Total JS    : " + jsxFiles.length);

let totalLines = 0;
for (const f of jsxFiles) totalLines += lineCount(read(f));
out("  Total lines : " + totalLines);

out("\n  Largest files:");
const sized = jsxFiles
  .map((f) => ({ f, n: lineCount(read(f)) }))
  .sort((a, b) => b.n - a.n);
for (const { f, n } of sized.slice(0, 15)) {
  out("    " + String(n).padStart(6) + "  " + rel(f));
}

// ── §2 IMPORT RESOLUTION ──────────────────────────────────────────────────
out("\n" + THIN);
out("  §2  BROKEN RELATIVE IMPORTS");
out(THIN);

const brokenImports = [];
for (const f of jsxFiles) {
  const content = read(f);
  const dir = path.dirname(f);
  for (const m of content.matchAll(
    /import\s+[^'"]*from\s+['"](\.[^'"]+)['"]/g,
  )) {
    const raw = m[1];
    const candidates = [
      path.resolve(dir, raw),
      path.resolve(dir, raw + ".js"),
      path.resolve(dir, raw + ".jsx"),
      path.resolve(dir, raw + ".ts"),
      path.resolve(dir, raw + ".tsx"),
      path.resolve(dir, raw + "/index.js"),
      path.resolve(dir, raw + "/index.jsx"),
      path.resolve(dir, raw + "/index.ts"),
      path.resolve(dir, raw + "/index.tsx"),
    ];
    if (!candidates.some((c) => fs.existsSync(c))) {
      brokenImports.push({ file: rel(f), import: raw });
    }
  }
}
if (brokenImports.length === 0) {
  out("  OK  All relative imports resolve");
} else {
  out("  " + brokenImports.length + " broken import(s):");
  for (const b of brokenImports.slice(0, 30)) {
    out("    X " + b.file + " -> " + b.import);
  }
  if (brokenImports.length > 30)
    out("    ... and " + (brokenImports.length - 30) + " more");
}

// ── §3 ROUTES vs LINKS ────────────────────────────────────────────────────
out("\n" + THIN);
out("  §3  ROUTES vs NAVIGATION TARGETS");
out(THIN);

const declaredRoutes = new Set();
const navigateTargets = new Set();
const linkTargets = new Set();

for (const f of jsxFiles) {
  const content = read(f);
  for (const m of content.matchAll(
    /<Route[^>]*\bpath=["'\u0060]([^"'\u0060{]+)["'\u0060]/g,
  ))
    declaredRoutes.add(m[1]);
  for (const m of content.matchAll(
    /navigate\(\s*["'\u0060]([^"'\u0060)]+)["'\u0060]/g,
  ))
    navigateTargets.add(m[1]);
  for (const m of content.matchAll(
    /<Link[^>]*\bto=["'\u0060]([^"'\u0060{]+)["'\u0060]/g,
  ))
    linkTargets.add(m[1]);
}

out("  Declared routes    : " + declaredRoutes.size);
out("  navigate() targets : " + navigateTargets.size);
out("  <Link> targets     : " + linkTargets.size);

function normalizeRoute(p) {
  return p
    .split("?")[0]
    .split("#")[0]
    .replace(/\/:[^/]+/g, "/:x")
    .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27}/gi, "/:x")
    .replace(/\/\d+/g, "/:x");
}

const allTargets = new Set([...navigateTargets, ...linkTargets]);
const orphanTargets = [];
for (const t of allTargets) {
  if (t.startsWith("http") || t.startsWith("#") || t === "/") continue;
  const norm = normalizeRoute(t);
  const matched = [...declaredRoutes].some((r) => normalizeRoute(r) === norm);
  if (!matched) orphanTargets.push(t);
}

if (orphanTargets.length === 0) {
  out("  OK  All navigate/Link targets match a declared Route");
} else {
  out("  " + orphanTargets.length + " orphan navigation target(s):");
  for (const t of orphanTargets.sort().slice(0, 30)) out("    ? " + t);
  if (orphanTargets.length > 30)
    out("    ... and " + (orphanTargets.length - 30) + " more");
}

// ── §4 API CALLS ──────────────────────────────────────────────────────────
out("\n" + THIN);
out("  §4  API CALL INVENTORY");
out(THIN);

const apiCalls = [];
for (const f of jsxFiles) {
  const content = read(f);
  const rf = rel(f);
  const lns = content.split("\n");
  for (let i = 0; i < lns.length; i++) {
    const ln = lns[i];
    // api.METHOD("...")
    let m;
    const re1 = /api\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"\s)]+)/gi;
    while ((m = re1.exec(ln)) !== null) {
      apiCalls.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: rf,
        line: i + 1,
      });
    }
    // axios.METHOD("...")
    const re2 = /axios\.(get|post|put|patch|delete)\(\s*[`'"]([^`'"\s)]+)/gi;
    while ((m = re2.exec(ln)) !== null) {
      apiCalls.push({
        method: m[1].toUpperCase(),
        path: m[2],
        file: rf,
        line: i + 1,
      });
    }
    // fetch("/api/...")
    const re3 = /fetch\(\s*[`'"](\/api\/[^`'"\s)]+)/gi;
    while ((m = re3.exec(ln)) !== null) {
      apiCalls.push({ method: "GET", path: m[1], file: rf, line: i + 1 });
    }
  }
}

const callsByPath = {};
for (const c of apiCalls) {
  const key = c.method + " " + c.path;
  if (!callsByPath[key]) callsByPath[key] = [];
  callsByPath[key].push(c.file + ":" + c.line);
}

out("  Total API calls        : " + apiCalls.length);
out("  Unique endpoints called: " + Object.keys(callsByPath).length);

// Detect obviously wrong calls (bad prefixes)
const suspicious = [];
for (const key of Object.keys(callsByPath)) {
  const [, p] = key.split(" ");
  if (p.includes("${") || p.includes("undefined")) {
    suspicious.push(key);
  }
}
if (suspicious.length > 0) {
  out("\n  " + suspicious.length + " call(s) with unresolved template vars:");
  for (const s of suspicious.slice(0, 20)) out("    ! " + s);
}

// ── §5 CSS MODULE AUDIT (static, false-positive safe) ─────────────────────
out("\n" + THIN);
out("  §5  CSS MODULE AUDIT (static-only)");
out(THIN);

let totalUndefined = 0;
let totalUnused = 0;
let filesWithIssues = 0;

for (const cssFile of cssFiles) {
  const cssRel = rel(cssFile);
  const cssContent = read(cssFile);

  // Defined classes (only top-level and pseudo — the regex requires a real class name)
  const defined = new Set();
  for (const m of cssContent.matchAll(/\.([a-zA-Z_][\w-]*)\s*(?=[{,:])/g)) {
    defined.add(m[1]);
  }

  if (defined.size === 0) continue;

  // Find JS files importing this CSS module
  const baseName = path.basename(cssFile);
  const usedClasses = new Set();
  let imported = false;

  for (const jsFile of jsxFiles) {
    const jsContent = read(jsFile);
    if (!jsContent.includes(baseName)) continue;
    imported = true;

    // Only static string member access: styles.foo or styles["foo"] or styles['foo']
    for (const m of jsContent.matchAll(
      /\b(?:styles|s|css|classes|styles2)\.([a-zA-Z_][\w-]*)/g,
    )) {
      usedClasses.add(m[1]);
    }
    for (const m of jsContent.matchAll(
      /\b(?:styles|s|css|classes|styles2)\[\s*["']([a-zA-Z_][\w-]*)["']\s*\]/g,
    )) {
      usedClasses.add(m[1]);
    }
  }

  if (!imported) continue;

  // Undefined = used but not in the CSS file
  const undef = [...usedClasses].filter((c) => !defined.has(c));
  // Unused = defined in CSS but never referenced statically
  const unused = [...defined].filter((c) => !usedClasses.has(c));

  if (undef.length > 0 || unused.length > 5) {
    filesWithIssues++;
    out("  " + cssRel);
    if (undef.length > 0) {
      out(
        "    UNDEFINED (" +
          undef.length +
          "): " +
          undef.slice(0, 10).join(", ") +
          (undef.length > 10 ? " ..." : ""),
      );
      totalUndefined += undef.length;
    }
    if (unused.length > 5) {
      out(
        "    UNUSED    (" +
          unused.length +
          "): " +
          unused.slice(0, 8).join(", ") +
          (unused.length > 8 ? " ..." : ""),
      );
      totalUnused += unused.length;
    }
  }
}

if (filesWithIssues === 0) {
  out("  OK  No static CSS issues");
} else {
  out("\n  Files with issues         : " + filesWithIssues);
  out("  Total undefined references: " + totalUndefined);
  out("  Total unused definitions  : " + totalUnused);
}

// ── §6 STORE AUDIT ────────────────────────────────────────────────────────
out("\n" + THIN);
out("  §6  STORE AUDIT");
out(THIN);

if (storeFiles.length === 0) {
  out("  No store files found");
} else {
  for (const sf of storeFiles) {
    const content = read(sf);
    const storeRel = rel(sf);
    const actions = new Set();

    // Match object-style: `foo: async (...) =>` inside create(...)
    for (const m of content.matchAll(/^\s{2,6}(\w+)\s*:\s*(?:async\s*)?\(/gm)) {
      if (!["set", "get"].includes(m[1])) actions.add(m[1]);
    }
    // Match `const foo = ...` top-level exports
    for (const m of content.matchAll(
      /export\s+(?:async\s+)?(?:const|function)\s+(\w+)/g,
    )) {
      actions.add(m[1]);
    }

    if (actions.size === 0) continue;

    out("  " + storeRel);
    let unusedCount = 0;
    for (const action of [...actions].sort()) {
      let used = 0;
      const re = new RegExp("\\b" + action + "\\b", "g");
      for (const jf of jsxFiles) {
        if (jf === sf) continue;
        if (re.test(read(jf))) used++;
      }
      if (used === 0) {
        out("    UNUSED    " + action);
        unusedCount++;
      }
    }
    if (unusedCount === 0) out("    OK  every action is referenced somewhere");
  }
}

// ── §7 UNUSED COMPONENTS (never imported anywhere) ────────────────────────
out("\n" + THIN);
out("  §7  UNUSED COMPONENT FILES");
out(THIN);

const unusedComponents = [];
for (const cf of componentFiles) {
  const base = path.basename(cf).replace(/\.(jsx?|tsx?)$/, "");
  if (base === "index") continue;
  let found = false;
  for (const jf of jsxFiles) {
    if (jf === cf) continue;
    const c = read(jf);
    if (c.includes("/" + base) || c.includes('"' + base + '"')) {
      found = true;
      break;
    }
  }
  if (!found) unusedComponents.push(rel(cf));
}

if (unusedComponents.length === 0) {
  out("  OK  All component files are imported somewhere");
} else {
  out("  " + unusedComponents.length + " component file(s) never imported:");
  for (const f of unusedComponents.slice(0, 30)) out("    ? " + f);
  if (unusedComponents.length > 30)
    out("    ... and " + (unusedComponents.length - 30) + " more");
}

// ── §8 ENV VARS ───────────────────────────────────────────────────────────
out("\n" + THIN);
out("  §8  FRONTEND ENV VARS");
out(THIN);

const envUsed = new Set();
for (const f of jsxFiles) {
  const c = read(f);
  for (const m of c.matchAll(/import\.meta\.env\.(\w+)/g)) envUsed.add(m[1]);
  for (const m of c.matchAll(/process\.env\.(VITE_\w+)/g)) envUsed.add(m[1]);
}

const envExamplePath = path.resolve(".env.example");
const envExample = fs.existsSync(envExamplePath) ? read(envExamplePath) : "";
const envDeclared = new Set(
  (envExample.match(/^(VITE_\w+)\s*=/gm) || []).map((s) =>
    s.replace("=", "").trim(),
  ),
);

out("  Used in code       : " + envUsed.size);
out("  Declared in example: " + envDeclared.size);

const envMissing = [...envUsed].filter(
  (v) => !envDeclared.has(v) && v !== "MODE" && v !== "DEV" && v !== "PROD",
);
if (envMissing.length === 0) {
  out("  OK  All used VITE_ vars appear in .env.example");
} else {
  out("  " + envMissing.length + " var(s) used but missing from .env.example:");
  for (const v of envMissing.sort()) out("    " + v);
}

// ── §9 DEPENDENCY SANITY ──────────────────────────────────────────────────
out("\n" + THIN);
out("  §9  PACKAGE & DEPENDENCIES");
out(THIN);

const pkgPath = path.resolve("package.json");
if (fs.existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(read(pkgPath));
    out("  Name    : " + pkg.name);
    out("  Version : " + pkg.version);
    out("  Deps    : " + Object.keys(pkg.dependencies || {}).length);
    out("  DevDeps : " + Object.keys(pkg.devDependencies || {}).length);
    out("\n  Scripts:");
    for (const [k, v] of Object.entries(pkg.scripts || {})) {
      out("    " + k.padEnd(20) + " -> " + v);
    }
  } catch (e) {
    out("  INVALID package.json: " + e.message);
  }
} else {
  out("  MISSING package.json");
}

// ── §10 TSC / BUILD WARNINGS ──────────────────────────────────────────────
out("\n" + THIN);
out("  §10  SUMMARY");
out(THIN);

out("  Files analysed       : " + jsxFiles.length);
out("  Broken imports       : " + brokenImports.length);
out("  Orphan navigation    : " + orphanTargets.length);
out("  Total API calls      : " + apiCalls.length);
out("  Unique endpoints     : " + Object.keys(callsByPath).length);
out("  Suspicious API calls : " + suspicious.length);
out("  CSS undefined refs   : " + totalUndefined);
out("  CSS unused defs      : " + totalUnused);
out("  Unused components    : " + unusedComponents.length);
out("  Env vars missing     : " + envMissing.length);

out("\n" + LINE);
out(" Audit complete");
out(LINE + "\n");

if (OUT_FILE) {
  fs.writeFileSync(OUT_FILE, lines.join("\n"), "utf8");
  console.log("Report saved to " + OUT_FILE);
}
