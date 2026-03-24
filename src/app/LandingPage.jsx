import Link from "next/link";
import styles from "./LandingPage.module.css";

// ─── Data ────────────────────────────────────────────────────────
const categories = [
  { icon: "🔧", name: "Plumbing", count: "1,240 workers" },
  { icon: "⚡", name: "Electrical", count: "980 workers" },
  { icon: "🏗️", name: "Construction", count: "2,100 workers" },
  { icon: "🎨", name: "Painting", count: "760 workers" },
  { icon: "❄️", name: "AC Repair", count: "540 workers" },
  { icon: "🪛", name: "Appliances", count: "890 workers" },
  { icon: "🌿", name: "Landscaping", count: "430 workers" },
  { icon: "🧹", name: "Cleaning", count: "1,580 workers" },
  { icon: "🪚", name: "Carpentry", count: "670 workers" },
  { icon: "🔒", name: "Security", count: "310 workers" },
  { icon: "📱", name: "Tech Support", count: "720 workers" },
  { icon: "🚛", name: "Moving", count: "490 workers" },
];

const workers = [
  {
    initials: "AO",
    avatarBg: "#e85d2f",
    name: "Adebayo Okafor",
    trade: "Master Electrician",
    rating: "4.9",
    reviews: 128,
    tags: ["Rewiring", "Solar Install", "Panels"],
    rate: "₦8,500",
    available: true,
  },
  {
    initials: "FK",
    avatarBg: "#1a7a42",
    name: "Fatima Khalil",
    trade: "Plumber & Pipefitter",
    rating: "4.8",
    reviews: 96,
    tags: ["Leaks", "Boreholes", "Drainage"],
    rate: "₦7,000",
    available: true,
  },
  {
    initials: "CI",
    avatarBg: "#7c3aed",
    name: "Chukwuemeka Ibe",
    trade: "AC Technician",
    rating: "4.9",
    reviews: 214,
    tags: ["Installation", "Gas Refill", "Repairs"],
    rate: "₦9,200",
    available: false,
  },
  {
    initials: "MA",
    avatarBg: "#0369a1",
    name: "Musa Abdullahi",
    trade: "Construction Foreman",
    rating: "4.7",
    reviews: 73,
    tags: ["Renovation", "Roofing", "Floors"],
    rate: "₦12,000",
    available: true,
  },
];

const testimonials = [
  {
    quote:
      "Found a reliable electrician in under 10 minutes. The escrow payment made me feel safe — money only released when the job was done perfectly.",
    name: "Ngozi Adeyemi",
    role: "Homeowner, Lagos",
    initials: "NA",
    bg: "#e85d2f",
  },
  {
    quote:
      "As a plumber, SkilledProz tripled my monthly income. I get quality clients, get paid on time, and my rating keeps growing. Best thing that happened to my career.",
    name: "Emeka Nwosu",
    role: "Plumber, Abuja",
    initials: "EN",
    bg: "#1a7a42",
  },
  {
    quote:
      "The GPS check-in feature is brilliant. I always know when my worker arrives, and the real-time chat keeps everything transparent. Absolutely love it.",
    name: "Aisha Bello",
    role: "Property Manager, Kano",
    initials: "AB",
    bg: "#7c3aed",
  },
];

// ─── Page ────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className={styles.page}>
      {/* ── Navbar ── */}
      <nav className={styles.navbar}>
        <Link href="/" className={styles.navLogo}>
          Skilled<span>Proz</span>
        </Link>

        <ul className={styles.navLinks}>
          <li>
            <Link href="/search">Find Workers</Link>
          </li>
          <li>
            <Link href="/categories">Categories</Link>
          </li>
          <li>
            <Link href="/register/worker">Become a Worker</Link>
          </li>
          <li>
            <Link href="#how-it-works">How it Works</Link>
          </li>
        </ul>

        <div className={styles.navCta}>
          <Link href="/login" className={styles.btnOutline}>
            Log in
          </Link>
          <Link href="/register" className={styles.btnPrimary}>
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroBg} />

        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <span className={styles.heroBadgeDot} />
            Now available in 24 Nigerian cities
          </div>

          <h1 className={styles.heroTitle}>
            Hire <em>skilled workers</em>,<br />
            get paid faster.
          </h1>

          <p className={styles.heroSub}>
            SkilledProz connects you with verified tradespeople near you —
            plumbers, electricians, builders & 90 more trades. Escrow payments.
            GPS tracking. Real-time chat.
          </p>

          <div className={styles.heroActions}>
            <Link href="/search" className={styles.btnHeroPrimary}>
              Find a Worker →
            </Link>
            <Link href="/register/worker" className={styles.btnHeroSecondary}>
              Earn as a Worker
            </Link>
          </div>

          <div className={styles.heroTrust}>
            <div className={styles.heroAvatars}>
              {["AO", "FK", "CI", "MA"].map((init) => (
                <div key={init} className={styles.heroAvatar}>
                  {init}
                </div>
              ))}
            </div>
            <p className={styles.heroTrustText}>
              <strong>12,000+</strong> verified workers ready to help you
            </p>
          </div>
        </div>

        {/* Hero UI card */}
        <div className={styles.heroVisual}>
          <div style={{ position: "relative" }}>
            <div className={styles.heroCard}>
              <div className={styles.heroCardHeader}>
                <div className={styles.heroCardAvatar}>AO</div>
                <div>
                  <p className={styles.heroCardName}>Adebayo Okafor</p>
                  <p className={styles.heroCardTrade}>
                    Master Electrician • 3.2km away
                  </p>
                  <div className={styles.heroCardStars}>
                    {"★★★★★".split("").map((s, i) => (
                      <span key={i} className={styles.star}>
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={styles.heroCardBadge}>Available</span>
              </div>

              <div className={styles.heroCardStats}>
                <div className={styles.heroCardStat}>
                  <span className={styles.heroCardStatValue}>4.9</span>
                  <span className={styles.heroCardStatLabel}>Rating</span>
                </div>
                <div className={styles.heroCardStat}>
                  <span className={styles.heroCardStatValue}>128</span>
                  <span className={styles.heroCardStatLabel}>Jobs done</span>
                </div>
                <div className={styles.heroCardStat}>
                  <span className={styles.heroCardStatValue}>₦8.5k</span>
                  <span className={styles.heroCardStatLabel}>Per day</span>
                </div>
              </div>

              <button className={styles.heroCardBtn}>
                Book Now · Escrow Protected
              </button>
            </div>

            <div className={`${styles.floatingTag} ${styles.floatingTag1}`}>
              ✅ Payment secured
            </div>
            <div className={`${styles.floatingTag} ${styles.floatingTag2}`}>
              📍 GPS check-in enabled
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className={styles.statsBar}>
        {[
          { value: "12,000", accent: "+", label: "Verified Workers" },
          { value: "90", accent: "", label: "Skilled Trades" },
          { value: "₦4.2B", accent: "", label: "Paid Out to Workers" },
          { value: "98", accent: "%", label: "Job Completion Rate" },
        ].map(({ value, accent, label }) => (
          <div key={label} className={styles.statItem}>
            <span className={styles.statValue}>
              {value}
              <span>{accent}</span>
            </span>
            <span className={styles.statLabel}>{label}</span>
          </div>
        ))}
      </div>

      {/* ── How it Works ── */}
      <section className={styles.section} id="how-it-works">
        <span className={styles.sectionLabel}>How it works</span>
        <h2 className={styles.sectionTitle}>
          From search to job done — in three steps
        </h2>
        <p className={styles.sectionSub}>
          No more WhatsApp groups, unreliable referrals, or holding cash at the
          door. SkilledProz makes hiring skilled workers transparent and safe.
        </p>

        <div className={styles.stepsGrid}>
          {[
            {
              num: "01",
              title: "Search & Match",
              desc: "Enter your location and trade. Browse verified workers on a live map — filter by distance, rating, price, and availability.",
            },
            {
              num: "02",
              title: "Book & Pay into Escrow",
              desc: "Send a booking request. Funds are held securely in escrow — the worker only gets paid when you confirm the job is complete.",
            },
            {
              num: "03",
              title: "Track & Release",
              desc: "Watch GPS check-in when the worker arrives. Chat live. Release payment with one tap when you're satisfied.",
            },
          ].map((step) => (
            <div key={step.num} className={styles.stepCard}>
              <div className={styles.stepNumber}>{step.num}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className={styles.categoriesSection}>
        <span className={styles.sectionLabel}>90 Skilled Trades</span>
        <h2 className={styles.sectionTitle}>
          Whatever the job, we have an expert
        </h2>
        <p className={styles.sectionSub}>
          From emergency plumbing at midnight to a full home renovation — our
          workers cover every skilled trade imaginable.
        </p>

        <div className={styles.categoriesGrid}>
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/categories/${cat.name.toLowerCase().replace(/ /g, "-")}`}
              className={styles.categoryCard}
            >
              <span className={styles.categoryIcon}>{cat.icon}</span>
              <span className={styles.categoryName}>{cat.name}</span>
              <span className={styles.categoryCount}>{cat.count}</span>
            </Link>
          ))}
        </div>

        <div className={styles.categoriesFooter}>
          <Link href="/categories" className={styles.btnViewAll}>
            Browse all 90 categories →
          </Link>
        </div>
      </section>

      {/* ── Featured Workers ── */}
      <section className={styles.workersSection}>
        <div className={styles.workersHeader}>
          <div>
            <span className={styles.sectionLabel}>Top Rated Near You</span>
            <h2 className={styles.sectionTitle} style={{ marginBottom: 0 }}>
              Meet our verified workers
            </h2>
          </div>
          <Link href="/search" className={styles.btnOutline}>
            See all workers →
          </Link>
        </div>

        <div className={styles.workersGrid}>
          {workers.map((w) => (
            <Link
              key={w.name}
              href={`/workers/${w.name.toLowerCase().replace(/ /g, "-")}`}
              className={styles.workerCard}
            >
              <div className={styles.workerCardTop}>
                <div
                  className={styles.workerAvatar}
                  style={{ background: w.avatarBg }}
                >
                  {w.initials}
                </div>
                <div>
                  <p className={styles.workerName}>{w.name}</p>
                  <p className={styles.workerTrade}>{w.trade}</p>
                  <div className={styles.workerRating}>
                    <span style={{ color: "#f5a623" }}>★</span>
                    {w.rating}
                    <span style={{ color: "#aaa", fontWeight: 400 }}>
                      &nbsp;({w.reviews} reviews)
                    </span>
                  </div>
                </div>
              </div>

              <div className={styles.workerTags}>
                {w.tags.map((t) => (
                  <span key={t} className={styles.workerTag}>
                    {t}
                  </span>
                ))}
              </div>

              <div className={styles.workerFooter}>
                <div className={styles.workerRate}>
                  {w.rate} <span>/ day</span>
                </div>
                <span
                  className={styles.workerAvailBadge}
                  style={
                    !w.available
                      ? { background: "#fff3e0", color: "#b45309" }
                      : {}
                  }
                >
                  {w.available ? "● Available" : "● Busy Today"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className={styles.testimonialsSection}>
        <span className={styles.sectionLabel}>Real stories</span>
        <h2 className={styles.sectionTitle}>
          Trusted by hirers and workers alike
        </h2>
        <p className={styles.sectionSub}>
          Don't take our word for it — hear from people whose lives and
          livelihoods SkilledProz has changed.
        </p>

        <div className={styles.testimonialsGrid}>
          {testimonials.map((t) => (
            <div key={t.name} className={styles.testimonialCard}>
              <div style={{ marginBottom: "1rem" }}>
                {"★★★★★".split("").map((s, i) => (
                  <span
                    key={i}
                    style={{ color: "#f5a623", fontSize: "0.875rem" }}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <p className={styles.testimonialQuote}>"{t.quote}"</p>
              <div className={styles.testimonialAuthor}>
                <div
                  className={styles.testimonialAvatar}
                  style={{ background: t.bg }}
                >
                  {t.initials}
                </div>
                <div>
                  <p className={styles.testimonialName}>{t.name}</p>
                  <p className={styles.testimonialRole}>{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaContent}>
          <span className={styles.sectionLabel} style={{ color: "#f5a27a" }}>
            Join SkilledProz
          </span>
          <h2 className={styles.sectionTitle}>Ready to get started?</h2>
          <p className={styles.sectionSub}>
            Whether you need a job done or you're looking to earn — SkilledProz
            is the fastest way to connect, book, and pay safely.
          </p>
          <div className={styles.ctaButtons}>
            <Link href="/register/hirer" className={styles.btnCtaLight}>
              Hire a Worker
            </Link>
            <Link href="/register/worker" className={styles.btnCtaOutline}>
              Start Earning
            </Link>
          </div>
        </div>

        <div className={styles.ctaVisual}>
          {[
            {
              icon: "🛡️",
              title: "Escrow Protection",
              desc: "Funds held safely. Paid only when you're satisfied with the work.",
              span: true,
            },
            {
              icon: "📍",
              title: "GPS Tracking",
              desc: "Real-time check-in when your worker arrives on site.",
            },
            {
              icon: "💬",
              title: "Live Chat",
              desc: "Communicate directly with your hired worker anytime.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className={styles.ctaFeatureCard}
              style={f.span ? { gridColumn: "span 2" } : {}}
            >
              <span className={styles.ctaFeatureIcon}>{f.icon}</span>
              <p className={styles.ctaFeatureTitle}>{f.title}</p>
              <p className={styles.ctaFeatureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <Link href="/" className={styles.navLogo}>
              Skilled<span>Proz</span>
            </Link>
            <p className={styles.footerBrandDesc}>
              Africa's trusted marketplace for skilled trades. Hire with
              confidence, earn with freedom.
            </p>
            <div className={styles.footerSocials}>
              {["tw", "ig", "fb", "li"].map((s) => (
                <a key={s} href="#" className={styles.socialLink}>
                  {s[0].toUpperCase()}
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
                "How it Works",
                "Pricing",
                "Safety",
              ],
            },
            {
              title: "Workers",
              links: [
                "Become a Worker",
                "Earnings",
                "Verification",
                "Worker App",
                "Success Stories",
              ],
            },
            {
              title: "Company",
              links: ["About Us", "Careers", "Press", "Blog", "Contact"],
            },
          ].map((col) => (
            <div key={col.title}>
              <p className={styles.footerColTitle}>{col.title}</p>
              <ul className={styles.footerLinks}>
                {col.links.map((l) => (
                  <li key={l}>
                    <Link href="#">{l}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.footerBottom}>
          <span className={styles.footerCopy}>
            © 2025 SkilledProz Technologies Ltd. All rights reserved.
          </span>
          <div className={styles.footerLegal}>
            <Link href="#">Privacy Policy</Link>
            <Link href="#">Terms of Service</Link>
            <Link href="#">Cookies</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
