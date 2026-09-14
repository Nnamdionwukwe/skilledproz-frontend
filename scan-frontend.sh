#!/usr/bin/env bash
cd "$(dirname "$0")"
OUT="frontend-inventory-$(date +%F-%H%M).txt"

{
  echo "════════════════════════════════════════════════════════════════════"
  echo "  SkilledProz FRONTEND — Full Inventory"
  echo "  Generated: $(date)"
  echo "  Directory: $(pwd)"
  echo "════════════════════════════════════════════════════════════════════"
  echo ""

  echo "── 1. FRAMEWORK & STACK ──────────────────────────────────────────"
  if [ -f package.json ]; then
    echo "Name:      $(grep -m1 '"name"' package.json | sed 's/.*: *"//;s/".*//')"
    echo "Version:   $(grep -m1 '"version"' package.json | sed 's/.*: *"//;s/".*//')"
    echo ""
    echo "Scripts:"
    grep -A 20 '"scripts"' package.json | sed 's/^/  /'
    echo ""
    echo "Key dependencies:"
    grep -A 80 '"dependencies"' package.json | grep -E '"(react|next|vue|svelte|vite|typescript|tailwind|axios|react-router|redux|zustand|@tanstack|socket.io|react-query|formik|react-hook-form)' | sed 's/^/  /'
  fi
  echo ""

  echo "── 2. ROOT STRUCTURE ─────────────────────────────────────────────"
  ls -la | grep -v node_modules
  echo ""

  echo "── 3. SRC/ TREE (2 levels) ───────────────────────────────────────"
  find src -maxdepth 2 -type d 2>/dev/null | sort
  echo ""

  echo "── 4. PAGES / SCREENS ────────────────────────────────────────────"
  if [ -d src/pages ]; then
    find src/pages -type f \( -name "*.jsx" -o -name "*.tsx" -o -name "*.vue" -o -name "*.js" -o -name "*.ts" \) 2>/dev/null | sort
  elif [ -d src/app ]; then
    find src/app -type f \( -name "*.jsx" -o -name "*.tsx" -o -name "page.*" \) 2>/dev/null | sort
  elif [ -d src/screens ]; then
    find src/screens -type f \( -name "*.jsx" -o -name "*.tsx" \) 2>/dev/null | sort
  fi
  echo ""

  echo "── 5. COMPONENTS ─────────────────────────────────────────────────"
  find src/components -type f \( -name "*.jsx" -o -name "*.tsx" -o -name "*.vue" \) 2>/dev/null | sort | head -60
  echo ""

  echo "── 6. ROUTES / ROUTER FILES ──────────────────────────────────────"
  find src -type f \( -name "*out*.jsx" -o -name "*out*.tsx" -o -name "*out*.js" -o -name "App.jsx" -o -name "App.tsx" -o -name "main.jsx" -o -name "main.tsx" \) 2>/dev/null | sort
  echo ""

  echo "── 7. API / AXIOS / FETCH ────────────────────────────────────────"
  find src -type f \( -name "*api*" -o -name "*axios*" -o -name "*fetch*" -o -name "*http*" -o -name "*client*" \) 2>/dev/null | grep -v node_modules | sort
  echo ""

  echo "── 8. AUTH-RELATED FILES ─────────────────────────────────────────"
  find src -type f \( -name "*auth*" -o -name "*Auth*" -o -name "*login*" -o -name "*Login*" -o -name "*session*" -o -name "*token*" \) 2>/dev/null | grep -v node_modules | sort
  echo ""

  echo "── 9. STATE MANAGEMENT ───────────────────────────────────────────"
  find src -type f \( -name "*store*" -o -name "*context*" -o -name "*slice*" -o -name "*reducer*" \) 2>/dev/null | grep -v node_modules | sort
  echo ""

  echo "── 10. ENV FILES ─────────────────────────────────────────────────"
  ls -la .env* 2>/dev/null || echo "  (none)"
  echo ""
  echo "  ENV keys (values hidden):"
  for f in .env .env.local .env.production .env.development; do
    if [ -f "$f" ]; then
      echo "  ── $f ──"
      grep -E '^[A-Z_]+=' "$f" 2>/dev/null | sed 's/=.*/=<hidden>/' | sed 's/^/    /'
    fi
  done
  echo ""

  echo "── 11. HTTP CLIENT SETUP ─────────────────────────────────────────"
  grep -rn "baseURL\|VITE_API\|NEXT_PUBLIC\|axios.create\|API_URL" src 2>/dev/null | grep -v node_modules | head -20
  echo ""

  echo "── 12. EXISTING GOOGLE REFERENCES ────────────────────────────────"
  grep -rn "google\|Google\|GOOGLE" src 2>/dev/null | grep -v node_modules | head -20 || echo "  (none found)"
  echo ""

  echo "── 13. FILE COUNTS ───────────────────────────────────────────────"
  echo "  Pages/Screens:  $(find src -type f \( -name '*.jsx' -o -name '*.tsx' -o -name '*.vue' \) 2>/dev/null | wc -l | tr -d ' ')"
  echo "  Components:     $(find src/components -type f \( -name '*.jsx' -o -name '*.tsx' \) 2>/dev/null | wc -l | tr -d ' ')"
  echo "  Total src/:     $(find src -type f 2>/dev/null | wc -l | tr -d ' ')"
  echo ""

  echo "════════════════════════════════════════════════════════════════════"
  echo "  END OF INVENTORY"
  echo "════════════════════════════════════════════════════════════════════"
} > "$OUT" 2>&1

echo "DONE - Written to: $OUT"
