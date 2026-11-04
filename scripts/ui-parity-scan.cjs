#!/usr/bin/env node
/**
 * scripts/ui-parity-scan.js
 *
 * Scans a React website (JSX + CSS) and a React Native app (JSX + StyleSheet)
 * side by side and reports every UI/UX drift:
 *
 *   • Font families, weights, sizes, line-heights, letter-spacings
 *   • Colour tokens (CSS variables vs theme.js)
 *   • Spacing (padding/margin/gap) in px vs rem-scaled
 *   • Border radii
 *   • Component names present in one side but not the other
 *
 * Usage:
 *   node scripts/ui-parity-scan.js --web ../website --app ../app
 *
 * Outputs:
 *   • Console summary
 *   • ui-parity-report.json  (full machine-readable diff)
 *   • ui-parity-report.md    (human-readable findings)
 */

const fs = require("fs");
const path = require("path");

// ─── CLI args ──────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { web: null, app: null, outDir: "." };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--web") out.web = argv[++i];
    else if (a === "--app") out.app = argv[++i];
    else if (a === "--out") out.outDir = argv[++i];
    else if (a === "--help" || a === "-h") {
      console.log(
        "Usage: node ui-parity-scan.js --web <path> --app <path> [--out <dir>]",
      );
      process.exit(0);
    }
  }
  if (!out.web || !out.app) {
    console.error("Both --web and --app are required.");
    process.exit(1);
  }
  return out;
}

const args = parseArgs(process.argv);
const WEB_ROOT = path.resolve(args.web);
const APP_ROOT = path.resolve(args.app);
const OUT_DIR = path.resolve(args.outDir);

// ─── File walking ──────────────────────────────────────────────────────────
const IGNORE = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".expo",
  ".next",
  "coverage",
  "ios",
  "android",
]);

function walk(dir, exts, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, exts, files);
    else if (exts.some((e) => entry.name.endsWith(e))) files.push(full);
  }
  return files;
}

// ─── Regex helpers ─────────────────────────────────────────────────────────
const RE = {
  // CSS declarations: `prop: value;`
  cssDecl: (prop) =>
    new RegExp(`(?:^|[^-\\w])${prop}\\s*:\\s*([^;\\n}]+)`, "g"),

  // JSX style objects: `prop: value,` or `"prop": value,`
  jsStyle: (prop) => new RegExp(`["']?${prop}["']?\\s*:\\s*([^,\\n}]+)`, "g"),

  // Colour literals
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgba: /rgba?\([^)]+\)/g,

  // CSS custom property declarations
  cssVar: /--([\w-]+)\s*:\s*([^;]+);/g,

  // JS object literal keys for colours (theme.js)
  jsColorKey: /(\w+)\s*:\s*["']((?:#|rgba?\()[^"']+)["']/g,
};

// ─── Extractors ────────────────────────────────────────────────────────────

/** Parse a CSS file for every declaration we care about. */
function extractCss(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const result = {
    file: filePath,
    cssVars: {}, // --orange → "#f97316"
    fontFamilies: new Set(),
    fontWeights: new Set(),
    fontSizes: new Set(),
    lineHeights: new Set(),
    letterSpacings: new Set(),
    paddings: new Set(),
    margins: new Set(),
    gaps: new Set(),
    radii: new Set(),
    colors: new Set(),
  };

  // CSS vars
  let m;
  const varRe = new RegExp(RE.cssVar.source, "g");
  while ((m = varRe.exec(src))) result.cssVars[m[1]] = m[2].trim();

  // Declarations
  for (const [key, set] of [
    ["font-family", result.fontFamilies],
    ["font-weight", result.fontWeights],
    ["font-size", result.fontSizes],
    ["line-height", result.lineHeights],
    ["letter-spacing", result.letterSpacings],
    ["padding", result.paddings],
    ["padding-top", result.paddings],
    ["padding-bottom", result.paddings],
    ["padding-left", result.paddings],
    ["padding-right", result.paddings],
    ["margin", result.margins],
    ["margin-top", result.margins],
    ["margin-bottom", result.margins],
    ["margin-left", result.margins],
    ["margin-right", result.margins],
    ["gap", result.gaps],
    ["border-radius", result.radii],
  ]) {
    const re = new RegExp(RE.cssDecl(key).source, "g");
    while ((m = re.exec(src))) set.add(m[1].trim());
  }

  // Colour literals
  for (const re of [RE.hex, RE.rgba]) {
    const g = new RegExp(re.source, "g");
    while ((m = g.exec(src))) result.colors.add(m[0]);
  }

  return result;
}

/** Parse a JSX/TSX file for StyleSheet.create() values + inline style props. */
function extractJsx(filePath) {
  const src = fs.readFileSync(filePath, "utf8");
  const result = {
    file: filePath,
    fontFamilies: new Set(),
    fontWeights: new Set(),
    fontSizes: new Set(),
    lineHeights: new Set(),
    letterSpacings: new Set(),
    paddings: new Set(),
    margins: new Set(),
    gaps: new Set(),
    radii: new Set(),
    colors: new Set(),
    // Detected component names (exported defaults)
    components: new Set(),
  };

  for (const [key, set] of [
    ["fontFamily", result.fontFamilies],
    ["fontWeight", result.fontWeights],
    ["fontSize", result.fontSizes],
    ["lineHeight", result.lineHeights],
    ["letterSpacing", result.letterSpacings],
    ["padding", result.paddings],
    ["paddingTop", result.paddings],
    ["paddingBottom", result.paddings],
    ["paddingHorizontal", result.paddings],
    ["paddingVertical", result.paddings],
    ["paddingLeft", result.paddings],
    ["paddingRight", result.paddings],
    ["margin", result.margins],
    ["marginTop", result.margins],
    ["marginBottom", result.margins],
    ["marginLeft", result.margins],
    ["marginRight", result.margins],
    ["gap", result.gaps],
    ["borderRadius", result.radii],
  ]) {
    const re = new RegExp(RE.jsStyle(key).source, "g");
    let m;
    while ((m = re.exec(src))) set.add(m[1].trim().replace(/["']/g, ""));
  }

  // Colours — both literal strings and hex/rgba
  for (const re of [RE.hex, RE.rgba]) {
    const g = new RegExp(re.source, "g");
    while ((m = g.exec(src))) result.colors.add(m[0]);
  }

  // Theme colour keys (theme.js)
  const keyRe = new RegExp(RE.jsColorKey.source, "g");
  while ((m = keyRe.exec(src))) result.colors.add(`${m[1]}=${m[2]}`);

  // Component names — export default function X / const X = ...
  const compRe =
    /export\s+(?:default\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/g;
  while ((m = compRe.exec(src))) result.components.add(m[1]);

  return result;
}

// ─── Project aggregation ───────────────────────────────────────────────────

function scanProject(root, kind /* "web" | "app" */) {
  const cssFiles = walk(root, [".css", ".scss", ".module.css"]);
  const jsFiles = walk(root, [".jsx", ".tsx", ".js", ".ts"]);

  const cssData = cssFiles.map(extractCss);
  const jsData = jsFiles.map(extractJsx);

  const merge = (arr, key) =>
    arr.reduce((acc, d) => {
      for (const v of d[key] || []) acc.add(v);
      return acc;
    }, new Set());

  const mergeAll = (key) => {
    const merged = new Set();
    for (const d of [...cssData, ...jsData]) {
      for (const v of d[key] || []) merged.add(v);
    }
    return merged;
  };

  // Merge CSS vars across all CSS files
  const cssVars = {};
  for (const d of cssData) Object.assign(cssVars, d.cssVars);

  const components = merge(jsData, "components");

  return {
    kind,
    root,
    files: { css: cssFiles.length, js: jsFiles.length },
    cssVars,
    fontFamilies: mergeAll("fontFamilies"),
    fontWeights: mergeAll("fontWeights"),
    fontSizes: mergeAll("fontSizes"),
    lineHeights: mergeAll("lineHeights"),
    letterSpacings: mergeAll("letterSpacings"),
    paddings: mergeAll("paddings"),
    margins: mergeAll("margins"),
    gaps: mergeAll("gaps"),
    radii: mergeAll("radii"),
    colors: mergeAll("colors"),
    components,
  };
}

// ─── Normalisation (compare rem vs scaled-px apples to apples) ─────────────

/**
 * Website px = px × (14/16) at ≤480px because html { font-size: 14px }.
 * App px should equal website px × (14/16) at phone widths (i.e. a 1rem
 * value on the website = 14px on the app; a 1.5rem value = 21px on the app).
 *
 * To compare fairly we normalise both sides to "app-phone px" (which is what
 * `rem()` in theme.js returns).
 */
const WEB_ROOT_AT_PHONE = 14;
const WEB_ROOT_AT_DESKTOP = 16;

function webRemToPhonePx(value) {
  const m = /^([\d.]+)rem$/.exec(value.trim());
  if (!m) return null;
  return parseFloat(m[1]) * WEB_ROOT_AT_PHONE;
}

function webPxAsPhonePx(value) {
  const m = /^([\d.]+)px$/.exec(value.trim());
  if (!m) return null;
  // A hardcoded px in CSS does NOT scale with html font-size — so a
  // `border-radius: 8px` on the website stays 8px on every viewport.
  // In the app, border-radius is set as an absolute RN px, so it should
  // ALSO stay 8. This helper just returns the literal.
  return parseFloat(m[1]);
}

function appPxToFloat(value) {
  const m = /^(-?\d+(?:\.\d+)?)$/.exec(value.trim());
  if (m) return parseFloat(m[1]);
  const rm = /^(-?\d+(?:\.\d+)?)\s*\*\s*[\d.]+$/.exec(value.trim());
  if (rm) return parseFloat(rm[1]);
  return null;
}

// ─── Diff ──────────────────────────────────────────────────────────────────

function setDiff(webSet, appSet, normalise) {
  const norm = (s) =>
    normalise ? new Set([...s].map(normalise).filter((v) => v != null)) : s;

  const webN = norm(webSet);
  const appN = norm(appSet);

  const onlyWeb = [...webN].filter((v) => !appN.has(v));
  const onlyApp = [...appN].filter((v) => !webN.has(v));
  const both = [...webN].filter((v) => appN.has(v));

  return { onlyWeb, onlyApp, both };
}

function numericDiff(webSet, appSet) {
  const webN = [...webSet]
    .map((v) => webRemToPhonePx(v) ?? webPxAsPhonePx(v))
    .filter((v) => v != null)
    .sort((a, b) => a - b);

  const appN = [...appSet]
    .map(appPxToFloat)
    .filter((v) => v != null)
    .sort((a, b) => a - b);

  // Values present on web but missing in app (allow 0.5px tolerance)
  const onlyWeb = webN.filter((w) => !appN.some((a) => Math.abs(a - w) <= 0.5));
  const onlyApp = appN.filter((a) => !webN.some((w) => Math.abs(a - w) <= 0.5));

  return { onlyWeb, onlyApp, web: webN, app: appN };
}

function buildReport(web, app) {
  const diff = {};

  // Fonts
  diff.fontFamilies = setDiff(web.fontFamilies, app.fontFamilies);
  diff.fontWeights = setDiff(web.fontWeights, app.fontWeights);
  diff.fontSizes = numericDiff(web.fontSizes, app.fontSizes);
  diff.lineHeights = numericDiff(web.lineHeights, app.lineHeights);
  diff.letterSpacings = setDiff(web.letterSpacings, app.letterSpacings);

  // Layout
  diff.paddings = numericDiff(web.paddings, app.paddings);
  diff.margins = numericDiff(web.margins, app.margins);
  diff.gaps = numericDiff(web.gaps, app.gaps);
  diff.radii = numericDiff(web.radii, app.radii);

  // Colours
  diff.colors = setDiff(web.colors, app.colors);

  // CSS variables vs theme.js keys
  const webVars = new Set(
    Object.entries(web.cssVars).map(([k, v]) => `--${k}=${v}`),
  );
  diff.cssVars = setDiff(webVars, app.colors);

  // Components (loose — RN uses different names)
  diff.components = {
    webOnly: [...web.components].filter(
      (c) => ![...app.components].some((a) => a.includes(c)),
    ),
    appOnly: [...app.components].filter(
      (c) => ![...web.components].some((w) => c.includes(w)),
    ),
    webCount: web.components.size,
    appCount: app.components.size,
  };

  return diff;
}

// ─── Reporting ─────────────────────────────────────────────────────────────

function fmtNum(arr, max = 40) {
  const shown = arr.slice(0, max).join(", ");
  return arr.length > max ? `${shown} … (${arr.length} total)` : shown;
}

function printSummary(web, app, diff) {
  console.log(
    "\n╔══════════════════════════════════════════════════════════════╗",
  );
  console.log(
    "║           UI/UX PARITY SCAN — WEBSITE vs RN APP             ║",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════╝\n",
  );

  console.log(`  Web root:  ${web.root}`);
  console.log(
    `             ${web.files.css} CSS files · ${web.files.js} JS files`,
  );
  console.log(`  App root:  ${app.root}`);
  console.log(
    `             ${app.files.css} CSS files · ${app.files.js} JS files\n`,
  );

  const pad = (label) => label.padEnd(22);

  console.log(`  ${pad("Font families")}`);
  console.log(`    web:  ${[...web.fontFamilies].join(", ") || "—"}`);
  console.log(`    app:  ${[...app.fontFamilies].join(", ") || "—"}`);
  if (diff.fontFamilies.onlyWeb.length)
    console.log(`    ⚠ only-web: ${diff.fontFamilies.onlyWeb.join(", ")}`);
  if (diff.fontFamilies.onlyApp.length)
    console.log(`    ⚠ only-app: ${diff.fontFamilies.onlyApp.join(", ")}`);

  console.log(`\n  ${pad("Font weights")}`);
  console.log(`    web:  ${[...web.fontWeights].sort().join(", ")}`);
  console.log(`    app:  ${[...app.fontWeights].sort().join(", ")}`);
  if (diff.fontWeights.onlyWeb.length)
    console.log(`    ⚠ only-web: ${diff.fontWeights.onlyWeb.join(", ")}`);

  console.log(`\n  ${pad("Font sizes (phone px)")}`);
  console.log(`    web:  ${fmtNum(diff.fontSizes.web)}`);
  console.log(`    app:  ${fmtNum(diff.fontSizes.app)}`);
  if (diff.fontSizes.onlyWeb.length)
    console.log(`    ⚠ missing in app: ${fmtNum(diff.fontSizes.onlyWeb)}`);
  if (diff.fontSizes.onlyApp.length)
    console.log(`    ⚠ extra in app:   ${fmtNum(diff.fontSizes.onlyApp)}`);

  console.log(`\n  ${pad("Line heights")}`);
  if (diff.lineHeights.onlyWeb.length)
    console.log(`    ⚠ only-web: ${fmtNum(diff.lineHeights.onlyWeb)}`);

  console.log(`\n  ${pad("Letter-spacing")}`);
  console.log(`    web:  ${[...web.letterSpacings].join(", ")}`);
  console.log(`    app:  ${[...app.letterSpacings].join(", ")}`);

  console.log(`\n  ${pad("Paddings (phone px)")}`);
  if (diff.paddings.onlyWeb.length)
    console.log(`    ⚠ missing in app: ${fmtNum(diff.paddings.onlyWeb)}`);
  if (diff.paddings.onlyApp.length)
    console.log(`    ⚠ extra in app:   ${fmtNum(diff.paddings.onlyApp)}`);

  console.log(`\n  ${pad("Margins (phone px)")}`);
  if (diff.margins.onlyWeb.length)
    console.log(`    ⚠ missing in app: ${fmtNum(diff.margins.onlyWeb)}`);

  console.log(`\n  ${pad("Gaps (phone px)")}`);
  if (diff.gaps.onlyWeb.length)
    console.log(`    ⚠ missing in app: ${fmtNum(diff.gaps.onlyWeb)}`);

  console.log(`\n  ${pad("Radii (px)")}`);
  console.log(`    web:  ${fmtNum(diff.radii.web)}`);
  console.log(`    app:  ${fmtNum(diff.radii.app)}`);
  if (diff.radii.onlyWeb.length)
    console.log(`    ⚠ missing in app: ${fmtNum(diff.radii.onlyWeb)}`);

  console.log(`\n  ${pad("Colours — CSS var parity")}`);
  if (diff.cssVars.onlyWeb.length)
    console.log(`    ⚠ CSS vars with no app theme key:`);
  for (const v of diff.cssVars.onlyWeb.slice(0, 30))
    console.log(`        · ${v}`);
  if (diff.cssVars.onlyWeb.length > 30)
    console.log(`        … (${diff.cssVars.onlyWeb.length - 30} more)`);

  console.log(`\n  ${pad("Components")}`);
  console.log(
    `    web:  ${diff.components.webCount} · app: ${diff.components.appCount}`,
  );
  if (diff.components.webOnly.length)
    console.log(
      `    ⚠ web-only (${diff.components.webOnly.length}): ${diff.components.webOnly.slice(0, 10).join(", ")}${diff.components.webOnly.length > 10 ? "…" : ""}`,
    );

  console.log("");
}

function writeMarkdown(web, app, diff, filePath) {
  const L = [];
  const h = (s) => L.push(`\n## ${s}\n`);
  const bullets = (arr) => arr.forEach((x) => L.push(`- \`${x}\``));

  L.push("# UI/UX Parity Report\n");
  L.push(`**Website:** \`${web.root}\``);
  L.push(`**App:** \`${app.root}\``);
  L.push(`**Generated:** ${new Date().toISOString()}`);

  h("Font families");
  L.push("| Side | Values |");
  L.push("|---|---|");
  L.push(`| Web | ${[...web.fontFamilies].join(", ") || "—"} |`);
  L.push(`| App | ${[...app.fontFamilies].join(", ") || "—"} |`);
  if (diff.fontFamilies.onlyWeb.length) {
    L.push("\n**Only on web:**");
    bullets(diff.fontFamilies.onlyWeb);
  }

  h("Font sizes (normalised to phone px)");
  L.push(`- web: \`${diff.fontSizes.web.join(", ")}\``);
  L.push(`- app: \`${diff.fontSizes.app.join(", ")}\``);
  if (diff.fontSizes.onlyWeb.length) {
    L.push("\n**Missing in app:**");
    bullets(diff.fontSizes.onlyWeb);
  }
  if (diff.fontSizes.onlyApp.length) {
    L.push("\n**Extra in app:**");
    bullets(diff.fontSizes.onlyApp);
  }

  h("Line heights (phone px)");
  if (diff.lineHeights.onlyWeb.length) bullets(diff.lineHeights.onlyWeb);

  h("Letter-spacing");
  L.push(`- web: \`${[...web.letterSpacings].join(", ")}\``);
  L.push(`- app: \`${[...app.letterSpacings].join(", ")}\``);

  h("Paddings (phone px)");
  if (diff.paddings.onlyWeb.length) bullets(diff.paddings.onlyWeb);

  h("Margins (phone px)");
  if (diff.margins.onlyWeb.length) bullets(diff.margins.onlyWeb);

  h("Gaps (phone px)");
  if (diff.gaps.onlyWeb.length) bullets(diff.gaps.onlyWeb);

  h("Radii (px)");
  L.push(`- web: \`${diff.radii.web.join(", ")}\``);
  L.push(`- app: \`${diff.radii.app.join(", ")}\``);
  if (diff.radii.onlyWeb.length) {
    L.push("\n**Missing in app:**");
    bullets(diff.radii.onlyWeb);
  }

  h("CSS variables with no app theme key");
  bullets(diff.cssVars.onlyWeb);

  h("Components");
  L.push(`- web: ${diff.components.webCount} files export components`);
  L.push(`- app: ${diff.components.appCount} files export components`);
  if (diff.components.webOnly.length) {
    L.push("\n**Present only on web:**");
    bullets(diff.components.webOnly);
  }

  fs.writeFileSync(filePath, L.join("\n"));
  console.log(`📄 Markdown report → ${filePath}`);
}

// ─── Main ──────────────────────────────────────────────────────────────────

function main() {
  console.log("Scanning website…");
  const web = scanProject(WEB_ROOT, "web");

  console.log("Scanning app…");
  const app = scanProject(APP_ROOT, "app");

  console.log("Diffing…");
  const diff = buildReport(web, app);

  printSummary(web, app, diff);

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const jsonPath = path.join(OUT_DIR, "ui-parity-report.json");
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        web: {
          root: web.root,
          files: web.files,
          cssVars: web.cssVars,
          fontFamilies: [...web.fontFamilies],
          fontWeights: [...web.fontWeights],
          fontSizes: [...web.fontSizes],
          lineHeights: [...web.lineHeights],
          letterSpacings: [...web.letterSpacings],
          paddings: [...web.paddings],
          margins: [...web.margins],
          gaps: [...web.gaps],
          radii: [...web.radii],
          colors: [...web.colors],
          components: [...web.components],
        },
        app: {
          root: app.root,
          files: app.files,
          cssVars: app.cssVars,
          fontFamilies: [...app.fontFamilies],
          fontWeights: [...app.fontWeights],
          fontSizes: [...app.fontSizes],
          lineHeights: [...app.lineHeights],
          letterSpacings: [...app.letterSpacings],
          paddings: [...app.paddings],
          margins: [...app.margins],
          gaps: [...app.gaps],
          radii: [...app.radii],
          colors: [...app.colors],
          components: [...app.components],
        },
        diff,
      },
      null,
      2,
    ),
  );
  console.log(`📄 JSON report → ${jsonPath}`);

  const mdPath = path.join(OUT_DIR, "ui-parity-report.md");
  writeMarkdown(web, app, diff, mdPath);

  // Exit non-zero if there are meaningful drifts so CI can gate on it.
  const meaningful =
    diff.fontFamilies.onlyWeb.length +
    diff.fontSizes.onlyWeb.length +
    diff.paddings.onlyWeb.length +
    diff.margins.onlyWeb.length +
    diff.gaps.onlyWeb.length +
    diff.radii.onlyWeb.length +
    diff.cssVars.onlyWeb.length;

  if (meaningful > 0) {
    console.log(`⚠  ${meaningful} drift(s) detected — see reports.`);
    process.exit(2);
  } else {
    console.log("✅ No meaningful drifts detected.");
  }
}

main();
