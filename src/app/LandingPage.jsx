import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import styles from "./LandingPage.module.css";

const CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar", flag: "🇺🇸" },
  { code: "EUR", symbol: "€", name: "Euro", flag: "🇪🇺" },
  { code: "GBP", symbol: "£", name: "British Pound", flag: "🇬🇧" },
  { code: "NGN", symbol: "₦", name: "Nigerian Naira", flag: "🇳🇬" },
  { code: "GHS", symbol: "₵", name: "Ghanaian Cedi", flag: "🇬🇭" },
  { code: "KES", symbol: "KSh", name: "Kenyan Shilling", flag: "🇰🇪" },
  { code: "ZAR", symbol: "R", name: "South African Rand", flag: "🇿🇦" },
  { code: "INR", symbol: "₹", name: "Indian Rupee", flag: "🇮🇳" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", flag: "🇨🇦" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar", flag: "🇦🇺" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen", flag: "🇯🇵" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan", flag: "🇨🇳" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real", flag: "🇧🇷" },
  { code: "AED", symbol: "د.إ", name: "UAE Dirham", flag: "🇦🇪" },
  { code: "SAR", symbol: "﷼", name: "Saudi Riyal", flag: "🇸🇦" },
  { code: "EGP", symbol: "£", name: "Egyptian Pound", flag: "🇪🇬" },
  { code: "MYR", symbol: "RM", name: "Malaysian Ringgit", flag: "🇲🇾" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar", flag: "🇸🇬" },
  { code: "PHP", symbol: "₱", name: "Philippine Peso", flag: "🇵🇭" },
  { code: "IDR", symbol: "Rp", name: "Indonesian Rupiah", flag: "🇮🇩" },
  { code: "THB", symbol: "฿", name: "Thai Baht", flag: "🇹🇭" },
  { code: "PKR", symbol: "₨", name: "Pakistani Rupee", flag: "🇵🇰" },
  { code: "BDT", symbol: "৳", name: "Bangladeshi Taka", flag: "🇧🇩" },
  { code: "VND", symbol: "₫", name: "Vietnamese Dong", flag: "🇻🇳" },
  { code: "MAD", symbol: "د.م.", name: "Moroccan Dirham", flag: "🇲🇦" },
  { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling", flag: "🇹🇿" },
  { code: "UGX", symbol: "USh", name: "Ugandan Shilling", flag: "🇺🇬" },
  { code: "USDC", symbol: "USDC", name: "USD Coin", flag: "₿" },
  { code: "USDT", symbol: "USDT", name: "Tether", flag: "₮" },
];

const FEATURES = [
  {
    icon: "🔐",
    title: "Escrow Payments",
    desc: "Funds held securely. Released only when you confirm the job is complete. Zero risk for both parties.",
  },
  {
    icon: "📍",
    title: "GPS Check-In/Out",
    desc: "Worker location verified on arrival and departure. Coordinates logged with timestamp.",
  },
  {
    icon: "📹",
    title: "In-App Video Calls",
    desc: "Discuss the job before it starts. No need for third-party apps — built right in.",
  },
  {
    icon: "💬",
    title: "Real-Time Messaging",
    desc: "End-to-end messaging between hirers and workers. Every conversation stored securely.",
  },
  {
    icon: "🚨",
    title: "SOS Emergency Alert",
    desc: "Workers can trigger a safety alert that instantly notifies the hirer and our team with their GPS location.",
  },
  {
    icon: "🛡️",
    title: "Job Insurance",
    desc: "Optional insurance add-on at checkout. Covers damages and liability for both parties.",
  },
  {
    icon: "⚖️",
    title: "Dispute Resolution",
    desc: "Dedicated team reviews every dispute. Fair outcome guaranteed within 48 hours.",
  },
  {
    icon: "✅",
    title: "Worker Verification",
    desc: "ID checks, background screening, and certification verification. Every badge is earned, not given.",
  },
  {
    icon: "⭐",
    title: "Multi-Rate Pricing",
    desc: "Workers set hourly, daily, weekly, monthly, or custom rates. Hirers lock the rate at booking.",
  },
  {
    icon: "📋",
    title: "Public Job Board",
    desc: "Post jobs publicly. Workers apply. You pick the best match. Full application management.",
  },
  {
    icon: "🗓️",
    title: "Availability Scheduling",
    desc: "Workers set their weekly availability. Hirers see real-time openings.",
  },
  {
    icon: "🏆",
    title: "Subscriptions & Featured Listings",
    desc: "Workers boost visibility. Hirers unlock premium tools. Transparent tier pricing.",
  },
];

const STATS = [
  { value: "50+", label: "Countries" },
  { value: "29", label: "Currencies" },
  { value: "500+", label: "Categories" },
  { value: "100%", label: "Escrow Safe" },
];

const HIRER_STEPS = [
  {
    num: "01",
    title: "Post a job or search workers",
    desc: "Describe what you need or browse 500+ categories. Filter by location, rating, rate, and availability.",
  },
  {
    num: "02",
    title: "Book & lock the rate",
    desc: "Send a booking request. The worker's rate is locked in — no surprises. Fund escrow with your preferred currency.",
  },
  {
    num: "03",
    title: "Track in real time",
    desc: "GPS check-in when the worker arrives. Chat, video call, monitor progress. SOS alerts if anything goes wrong.",
  },
  {
    num: "04",
    title: "Confirm & release payment",
    desc: "Satisfied? Release payment with one tap. Escrow protects you until you're happy with the work.",
  },
];

const WORKER_STEPS = [
  {
    num: "01",
    title: "Create your worker profile",
    desc: "Set up your trade categories, bio, portfolio, certifications, availability, and multi-rate pricing in minutes.",
  },
  {
    num: "02",
    title: "Get verified",
    desc: "Submit ID and certifications. Background check available. Verified badge boosts your bookings significantly.",
  },
  {
    num: "03",
    title: "Accept bookings & jobs",
    desc: "Get notified of booking requests or apply to posted jobs. Chat with hirers before accepting.",
  },
  {
    num: "04",
    title: "Complete & get paid",
    desc: "Check in with GPS, complete the job, check out. Payment releases to your chosen currency automatically.",
  },
];

const PANEL_ITEMS = [
  {
    icon: "🔐",
    label: "Escrow Released",
    val: "NGN 240,000",
    sub: "Plumbing · Lagos",
    color: "#22c55e",
  },
  {
    icon: "📍",
    label: "GPS Check-In",
    val: "Worker Arrived",
    sub: "Electrician · Dubai",
    color: "#3B82F6",
  },
  {
    icon: "📋",
    label: "New Job Posted",
    val: "Carpentry Work",
    sub: "USD 800 · New York",
    color: "#f97316",
  },
  {
    icon: "✅",
    label: "Worker Verified",
    val: "Background Cleared",
    sub: "AC Tech · Nairobi",
    color: "#a78bfa",
  },
];

export default function LandingPage() {
  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addedCat, setAddedCat] = useState(null);
  const [activeTab, setActiveTab] = useState("hirer");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    fetch(
      `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/categories?limit=500`,
    )
      .then((r) => r.json())
      .then((data) => {
        const cats = data.data?.categories || data.data || [];
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setCategories([]));
  }, []);

  const filteredCats = categories.filter(
    (c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  async function handleAddCategory() {
    if (!customCatName.trim()) return;
    setAddingCat(true);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/categories/suggest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customCatName.trim() }),
        },
      );
      const data = await res.json();
      const cat = data.data?.category;
      if (cat) {
        setCategories((prev) =>
          prev.find((c) => c.id === cat.id) ? prev : [...prev, cat],
        );
        setAddedCat(cat);
        setCustomCatName("");
        setShowCustomCat(false);
        setTimeout(() => setAddedCat(null), 4000);
      }
    } catch {}
    setAddingCat(false);
  }

  const doubled = [...CURRENCIES, ...CURRENCIES];

  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <Link to="/" className={styles.navLogo}>
          Skilled<span>Proz</span>
        </Link>

        <ul className={styles.navLinks}>
          {[
            ["Find Workers", "/search"],
            ["Browse Jobs", "/jobs"],
            ["Become a Worker", "/register/worker"],
          ].map(([label, href]) => (
            <li key={label}>
              <Link to={href}>{label}</Link>
            </li>
          ))}
        </ul>

        <div className={styles.navCta}>
          <Link to="/login" className={styles.btnOutline}>
            Sign in
          </Link>
          <Link to="/register" className={styles.btnPrimary}>
            Get Started
          </Link>
        </div>

        <button
          className={styles.menuToggle}
          onClick={() => setMobileOpen((v) => !v)}
          aria-label="Menu"
        >
          <span />
          <span />
          <span />
        </button>
      </nav>

      {/* Mobile nav */}
      <div className={`${styles.mobileNav} ${mobileOpen ? styles.open : ""}`}>
        {[
          ["Find Workers", "/search"],
          ["Browse Jobs", "/jobs"],
          ["Become a Worker", "/register/worker"],
          ["Sign in", "/login"],
          ["Get Started Free", "/register"],
        ].map(([label, href]) => (
          <Link key={label} to={href} onClick={() => setMobileOpen(false)}>
            {label}
          </Link>
        ))}
      </div>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Live in 50+ countries · 29 currencies · 500+ trades
          </div>

          <h1 className={styles.heroTitle}>
            The global platform
            <br />
            for <em>skilled and office proz</em>
          </h1>

          <p className={styles.heroSub}>
            SkilledProz connects hirers with verified tradespeople across every
            profession, every country, every currency — with escrow protection,
            GPS tracking, video calls, and dispute resolution built in.
          </p>

          <div className={styles.heroActions}>
            <Link to="/register/hirer" className={styles.btnHeroPrimary}>
              Hire a Worker →
            </Link>
            <Link to="/register/worker" className={styles.btnHeroSecondary}>
              Start Earning
            </Link>
          </div>

          <div className={styles.heroStats}>
            {STATS.map((s) => (
              <div key={s.label} className={styles.statCard}>
                <span className={styles.statValue}>{s.value}</span>
                <span className={styles.statLabel}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero panel — hidden on mobile via CSS */}
        <div className={styles.heroPanel}>
          <div className={styles.heroPanelInner}>
            <div className={styles.panelHeader}>
              <span className={styles.panelHeaderLabel}>
                Live Platform Activity
              </span>
              <span className={styles.panelLive}>
                <span className={styles.panelLiveDot} /> Active
              </span>
            </div>
            {PANEL_ITEMS.map((item, i) => (
              <div key={item.label} className={styles.panelItem}>
                <span className={styles.panelItemIcon}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div className={styles.panelItemLabel}>{item.label}</div>
                  <div className={styles.panelItemVal}>{item.val}</div>
                </div>
                <div className={styles.panelItemSub}>{item.sub}</div>
                <span
                  className={styles.panelItemDot}
                  style={{ background: item.color }}
                />
              </div>
            ))}
            <div className={styles.panelFooter}>
              <div>
                <div className={styles.panelFooterTitle}>
                  Platform Protection
                </div>
                <div className={styles.panelFooterVal}>
                  Every booking is escrow-protected
                </div>
              </div>
              <span style={{ fontSize: "1.75rem" }}>🛡️</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Currency Ticker ── */}
      <div className={styles.ticker}>
        <div className={styles.tickerInner}>
          <span className={styles.tickerLabel}>29 Currencies</span>
          <div className={styles.tickerTrack}>
            <div className={styles.tickerScroll}>
              {doubled.map((c, i) => (
                <div key={i} className={styles.tickerItem}>
                  <span>{c.flag}</span>
                  <span className={styles.tickerItemSymbol}>{c.symbol}</span>
                  <span>{c.code}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section className={`${styles.section} ${styles.featuresSection}`}>
        <div className={styles.sectionInner}>
          <span className={styles.sectionEyebrow}>Everything Built In</span>
          <h2 className={styles.sectionTitle}>
            Not just a marketplace. A complete work platform.
          </h2>
          <p className={styles.sectionSub}>
            Every feature you need to hire safely, work confidently, and get
            paid — all in one place.
          </p>

          <div className={styles.featuresGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section
        id="how-it-works"
        className={`${styles.section} ${styles.howSection}`}
      >
        <div className={styles.sectionInner}>
          <span className={styles.sectionEyebrow}>How It Works</span>
          <h2 className={styles.sectionTitle}>Two sides. One platform.</h2>

          <div className={styles.tabToggle}>
            <button
              className={`${styles.tabBtn} ${activeTab === "hirer" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("hirer")}
            >
              I want to hire
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === "worker" ? styles.tabBtnActive : ""}`}
              onClick={() => setActiveTab("worker")}
            >
              I want to earn
            </button>
          </div>

          <div className={styles.stepsGrid}>
            {(activeTab === "hirer" ? HIRER_STEPS : WORKER_STEPS).map((s) => (
              <div key={s.num} className={styles.stepCard}>
                <div className={styles.stepNum}>{s.num}</div>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      <section className={`${styles.section} ${styles.categoriesSection}`}>
        <div className={styles.sectionInner}>
          <div className={styles.catHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                Every Profession, Every Country
              </span>
              <h2 className={styles.sectionTitle}>
                {categories.length > 0 ? `${categories.length}+` : "500+"}{" "}
                categories — and growing
              </h2>
            </div>
            <input
              className={styles.catSearchInput}
              placeholder="🔍 Search categories..."
              value={catSearch}
              onChange={(e) => setCatSearch(e.target.value)}
            />
          </div>

          <div className={styles.catGrid}>
            {(catSearch ? filteredCats : filteredCats.slice(0, 48)).map(
              (cat) => (
                <Link
                  key={cat.id}
                  to={`/search?category=${cat.slug}`}
                  className={styles.catCard}
                >
                  <span className={styles.catIcon}>{cat.icon || "🔧"}</span>
                  <span className={styles.catName}>{cat.name}</span>
                  {cat._count?.workers > 0 && (
                    <span className={styles.catCount}>
                      {cat._count.workers} workers
                    </span>
                  )}
                </Link>
              ),
            )}
          </div>

          {!catSearch && filteredCats.length > 48 && (
            <div className={styles.catViewAll}>
              <Link to="/search" className={styles.btnViewAll}>
                Browse all {filteredCats.length} categories →
              </Link>
            </div>
          )}

          <div className={styles.catCustomBox}>
            <div className={styles.catCustomInner}>
              <div className={styles.catCustomText}>
                <p className={styles.catCustomTitle}>
                  Can't find your profession? Add it.
                </p>
                <p className={styles.catCustomSub}>
                  SkilledProz is global. If your trade isn't listed, add it
                  instantly — it goes live for the whole platform.
                </p>
              </div>
              {!showCustomCat ? (
                <button
                  className={styles.catAddBtn}
                  onClick={() => setShowCustomCat(true)}
                >
                  + Add your profession
                </button>
              ) : (
                <div className={styles.catAddForm}>
                  <input
                    autoFocus
                    className={styles.catAddInput}
                    value={customCatName}
                    onChange={(e) => setCustomCatName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    placeholder="e.g. Drone Operator, Solar Engineer..."
                  />
                  <button
                    className={styles.catSubmitBtn}
                    onClick={handleAddCategory}
                    disabled={addingCat || !customCatName.trim()}
                  >
                    {addingCat ? "Adding..." : "Add"}
                  </button>
                  <button
                    className={styles.catCancelBtn}
                    onClick={() => {
                      setShowCustomCat(false);
                      setCustomCatName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {addedCat && (
              <div className={styles.catAddedMsg}>
                ✅ "{addedCat.name}" is now live on SkilledProz!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Currencies ── */}
      <section className={`${styles.section} ${styles.currenciesSection}`}>
        <div className={styles.sectionInner}>
          <span className={styles.sectionEyebrow}>Global Payments</span>
          <h2 className={styles.sectionTitle}>Pay and earn in your currency</h2>
          <p className={styles.sectionSub}>
            From Naira to Yen, Pound to Dirham — and crypto (USDC, USDT, BTC,
            ETH). Three independent currency settings per account: dashboard
            display, payment, and profile rate.
          </p>

          <div className={styles.currenciesGrid}>
            {CURRENCIES.map((c) => (
              <div key={c.code} className={styles.currencyCard}>
                <span className={styles.currencyFlag}>{c.flag}</span>
                <span className={styles.currencySymbol}>{c.symbol}</span>
                <span className={styles.currencyCode}>{c.code}</span>
                <span className={styles.currencyName}>{c.name}</span>
              </div>
            ))}
          </div>

          <div className={styles.currencyMethods}>
            {[
              "Bank Transfer",
              "Card Payments",
              "Escrow Release",
              "Crypto (USDC/USDT)",
              "Instant Withdrawal",
            ].map((m) => (
              <span key={m} className={styles.currencyMethod}>
                ✓ {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={`${styles.section} ${styles.ctaSection}`}>
        <div className={styles.sectionInner}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <span className={styles.sectionEyebrow}>Join SkilledProz</span>
            <h2
              className={styles.sectionTitle}
              style={{ maxWidth: "none", textAlign: "center" }}
            >
              Choose your path. Start today.
            </h2>
          </div>
          <div className={styles.ctaGrid}>
            <div className={styles.ctaCard}>
              <span className={styles.ctaCardEmoji}>🏗️</span>
              <h3 className={styles.ctaCardTitle}>Hire a Worker</h3>
              <p className={styles.ctaCardDesc}>
                Post jobs, browse verified workers, book with escrow protection.
                GPS tracking, video calls, insurance, disputes — all covered.
              </p>
              <ul className={styles.ctaList}>
                {[
                  "Free to post jobs",
                  "Pay only when satisfied",
                  "500+ trade categories",
                  "29 currencies accepted",
                  "Dispute resolution included",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/register/hirer" className={styles.ctaBtn}>
                Create Hirer Account →
              </Link>
            </div>

            <div className={`${styles.ctaCard} ${styles.ctaCardAccent}`}>
              <span className={styles.ctaCardEmoji}>⚡</span>
              <h3 className={styles.ctaCardTitle}>Start Earning</h3>
              <p className={styles.ctaCardDesc}>
                Set your rates (hourly, daily, weekly, monthly, custom), get
                verified, receive bookings, and get paid to your local currency.
              </p>
              <ul className={styles.ctaList}>
                {[
                  "Multi-rate pricing (hourly to monthly)",
                  "Get paid in your currency",
                  "Portfolio & certifications",
                  "Featured listing boosts",
                  "SOS safety system included",
                ].map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link to="/register/worker" className={styles.ctaBtnOutline}>
                Create Worker Account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Safety strip ── */}
      <div className={styles.safetyStrip}>
        {[
          ["🔐", "Escrow on every booking"],
          ["📍", "GPS verification"],
          ["🛡️", "Optional job insurance"],
          ["🚨", "SOS emergency alerts"],
          ["⚖️", "48hr dispute resolution"],
          ["✅", "ID & background checks"],
        ].map(([icon, label]) => (
          <div key={label} className={styles.safetyItem}>
            <span>{icon}</span>
            {label}
          </div>
        ))}
      </div>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div>
            <Link to="/" className={styles.navLogo}>
              Skilled<span>Proz</span>
            </Link>
            <p className={styles.footerBrandDesc}>
              The global marketplace for skilled trades. Any profession, any
              country, any currency.
            </p>
            <div className={styles.footerSocials}>
              {["𝕏", "in", "▶", "f"].map((s) => (
                <a key={s} href="#" className={styles.socialLink}>
                  {s}
                </a>
              ))}
            </div>
          </div>
          {[
            {
              title: "Platform",
              links: [
                "Find Workers",
                "Post a Job",
                "Browse Jobs",
                "All Categories",
              ],
              href: ["/search", "/post-job", "/jobs", "/categories"],
            },
            {
              title: "Workers",
              links: [
                "Register as Worker",
                "Earnings",
                "Verification",
                "Featured Listings",
                "Subscriptions",
              ],
            },
            {
              title: "Company",
              links: [
                "About Us",
                "Careers",
                "Press",
                "Privacy Policy",
                "Terms of Service",
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className={styles.footerColTitle}>{col.title}</p>
              <ul className={styles.footerLinks}>
                {col.links.map((l, href) => (
                  <li key={l}>
                    <Link to={href}>{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className={styles.footerBottom}>
          <span className={styles.footerCopy}>
            © {new Date().getFullYear()} SkilledProz Technologies Ltd. All
            rights reserved.
          </span>
          <div className={styles.footerLegal}>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
