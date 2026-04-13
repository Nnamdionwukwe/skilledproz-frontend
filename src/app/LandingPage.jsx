import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// ── All platform currencies ───────────────────────────────────────
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
  { value: "50+", label: "Countries Supported" },
  { value: "29", label: "Currencies Accepted" },
  { value: "500+", label: "Trade Categories" },
  { value: "100%", label: "Escrow Protected" },
];

// ── Ticker component ──────────────────────────────────────────────
function Ticker({ items, speed = 40 }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div
        style={{
          display: "flex",
          gap: "0px",
          animation: `tickerScroll ${speed}s linear infinite`,
          width: "max-content",
        }}
      >
        {doubled.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0 1.5rem",
              borderRight: "1px solid rgba(255,255,255,0.08)",
              whiteSpace: "nowrap",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "rgba(255,255,255,0.5)",
              fontFamily: "inherit",
            }}
          >
            <span style={{ fontSize: "1rem" }}>{item.flag}</span>
            <span style={{ color: "#F59E0B" }}>{item.symbol}</span>
            <span>{item.code}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [categories, setCategories] = useState([]);
  const [catSearch, setCatSearch] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);
  const [customCatName, setCustomCatName] = useState("");
  const [addingCat, setAddingCat] = useState(false);
  const [addedCat, setAddedCat] = useState(null);
  const [activeTab, setActiveTab] = useState("hirer");
  const catRef = useRef(null);

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

  async function handleAddCustomCategory() {
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

  return (
    <div
      style={{
        fontFamily: "'Instrument Sans', 'Helvetica Neue', sans-serif",
        background: "#09090B",
        color: "#F5F0EB",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=DM+Serif+Display:ital@0;1&display=swap');
        @keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-8px); } }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        a { text-decoration: none; color: inherit; }
        ::selection { background: #F59E0B; color: #09090B; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #09090B; } ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>

      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 5%",
          height: 64,
          background: "rgba(9,9,11,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        <Link
          to="/"
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: "1.4rem",
            fontWeight: 400,
            letterSpacing: "-0.02em",
            color: "#F5F0EB",
          }}
        >
          Skilled<span style={{ color: "#F59E0B" }}>Proz</span>
        </Link>
        <div
          style={{
            display: "flex",
            gap: "2rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "rgba(245,240,235,0.6)",
          }}
        >
          {[
            ["Find Workers", "/search"],
            ["Browse Jobs", "/jobs"],
            ["Become a Worker", "/register/worker"],
            ["How it Works", "#how-it-works"],
          ].map(([label, href]) => (
            <Link
              key={label}
              to={href}
              style={{ transition: "color 0.2s" }}
              onMouseEnter={(e) => (e.target.style.color = "#F59E0B")}
              onMouseLeave={(e) =>
                (e.target.style.color = "rgba(245,240,235,0.6)")
              }
            >
              {label}
            </Link>
          ))}
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Link
            to="/login"
            style={{
              padding: "0.5rem 1.25rem",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#F5F0EB",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "#F59E0B")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)")
            }
          >
            Sign in
          </Link>
          <Link
            to="/register"
            style={{
              padding: "0.5rem 1.25rem",
              background: "#F59E0B",
              borderRadius: 6,
              fontSize: "0.875rem",
              fontWeight: 700,
              color: "#09090B",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#D97706")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#F59E0B")}
          >
            Get Started Free
          </Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section
        style={{
          minHeight: "100vh",
          paddingTop: 120,
          paddingBottom: 80,
          padding: "120px 5% 80px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "4rem",
          alignItems: "center",
          position: "relative",
        }}
      >
        {/* BG mesh */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 60% 60% at 60% 40%, rgba(245,158,11,0.06) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 10% 80%, rgba(59,130,246,0.04) 0%, transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 100,
            right: "5%",
            width: 1,
            height: "70%",
            background:
              "linear-gradient(to bottom, transparent, rgba(245,158,11,0.2), transparent)",
          }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 2,
            animation: "fadeUp 0.6s ease both",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.375rem 1rem",
              background: "rgba(245,158,11,0.1)",
              border: "1px solid rgba(245,158,11,0.25)",
              borderRadius: 999,
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "#F59E0B",
              marginBottom: "1.75rem",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                background: "#F59E0B",
                borderRadius: "50%",
                animation: "pulse 2s ease infinite",
              }}
            />
            Live in 50+ countries · 29 currencies · 500+ trades
          </div>

          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(2.8rem,5.5vw,4.5rem)",
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: "#F5F0EB",
              marginBottom: "1.5rem",
            }}
          >
            The global platform
            <br />
            for{" "}
            <em style={{ color: "#F59E0B", fontStyle: "italic" }}>
              skilled work
            </em>
          </h1>

          <p
            style={{
              fontSize: "1.125rem",
              lineHeight: 1.75,
              color: "rgba(245,240,235,0.6)",
              maxWidth: 480,
              marginBottom: "2.5rem",
            }}
          >
            SkilledProz connects hirers with verified tradespeople across every
            profession, every country, every currency — with escrow protection,
            GPS tracking, video calls, and dispute resolution built in.
          </p>

          <div
            style={{
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "3rem",
            }}
          >
            <Link
              to="/register/hirer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.875rem 2rem",
                background: "#F59E0B",
                borderRadius: 8,
                fontSize: "1rem",
                fontWeight: 700,
                color: "#09090B",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#D97706";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "#F59E0B";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Hire a Worker →
            </Link>
            <Link
              to="/register/worker"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.875rem 2rem",
                background: "transparent",
                border: "1.5px solid rgba(255,255,255,0.2)",
                borderRadius: 8,
                fontSize: "1rem",
                fontWeight: 600,
                color: "#F5F0EB",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#F59E0B";
                e.currentTarget.style.color = "#F59E0B";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)";
                e.currentTarget.style.color = "#F5F0EB";
              }}
            >
              Start Earning
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: "1rem",
            }}
          >
            {STATS.map((s) => (
              <div
                key={s.label}
                style={{
                  textAlign: "center",
                  padding: "1rem",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                }}
              >
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: "1.75rem",
                    color: "#F59E0B",
                    lineHeight: 1,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(245,240,235,0.45)",
                    marginTop: "0.25rem",
                    fontWeight: 500,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero panel */}
        <div
          style={{
            position: "relative",
            zIndex: 2,
            animation: "fadeUp 0.8s ease both",
          }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 20,
              padding: "2rem",
              backdropFilter: "blur(8px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "rgba(245,240,235,0.4)",
                }}
              >
                Live Platform Activity
              </span>
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  fontSize: "0.75rem",
                  color: "#22c55e",
                  fontWeight: 600,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    background: "#22c55e",
                    borderRadius: "50%",
                    animation: "pulse 1.5s ease infinite",
                  }}
                />
                Active
              </span>
            </div>

            {[
              {
                icon: "🔐",
                label: "Escrow Released",
                val: "NGN 240,000",
                sub: "Plumbing job · Lagos",
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
                sub: "USD 800 budget · New York",
                color: "#F59E0B",
              },
              {
                icon: "✅",
                label: "Worker Verified",
                val: "Background Cleared",
                sub: "AC Technician · Nairobi",
                color: "#a78bfa",
              },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: 10,
                  marginBottom: "0.625rem",
                  border: "1px solid rgba(255,255,255,0.06)",
                  animation: `fadeUp 0.5s ease ${i * 0.1}s both`,
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "0.75rem",
                      color: "rgba(245,240,235,0.45)",
                      fontWeight: 500,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: "0.9rem",
                      fontWeight: 700,
                      color: "#F5F0EB",
                    }}
                  >
                    {item.val}
                  </div>
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(245,240,235,0.35)",
                    textAlign: "right",
                  }}
                >
                  {item.sub}
                </div>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    background: item.color,
                    borderRadius: "50%",
                    flexShrink: 0,
                  }}
                />
              </div>
            ))}

            <div
              style={{
                marginTop: "1.25rem",
                padding: "1rem",
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                borderRadius: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "#F59E0B",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Platform Protection
                </div>
                <div
                  style={{
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "#F5F0EB",
                    marginTop: 2,
                  }}
                >
                  Every booking is escrow-protected
                </div>
              </div>
              <span style={{ fontSize: "1.75rem" }}>🛡️</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── CURRENCY TICKER ── */}
      <div
        style={{
          background: "#111113",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          padding: "0.875rem 0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            paddingLeft: "2rem",
            marginBottom: "0.625rem",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#F59E0B",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            29 Currencies
          </span>
          <Ticker items={CURRENCIES} speed={60} />
        </div>
      </div>

      {/* ── FEATURES GRID ── */}
      <section style={{ padding: "6rem 5%", background: "#09090B" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ marginBottom: "3.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#F59E0B",
                display: "block",
                marginBottom: "0.75rem",
              }}
            >
              Everything Built In
            </span>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(2rem,3.5vw,2.75rem)",
                fontWeight: 400,
                color: "#F5F0EB",
                letterSpacing: "-0.03em",
                maxWidth: 560,
                marginBottom: "0.75rem",
              }}
            >
              Not just a marketplace. A complete work platform.
            </h2>
            <p
              style={{
                color: "rgba(245,240,235,0.5)",
                fontSize: "1.0625rem",
                maxWidth: 480,
              }}
            >
              Every feature you need to hire safely, work confidently, and get
              paid — all in one place.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "1px",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                style={{
                  padding: "1.75rem",
                  background: "#09090B",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(245,158,11,0.05)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#09090B")
                }
              >
                <span
                  style={{
                    fontSize: "1.75rem",
                    display: "block",
                    marginBottom: "0.875rem",
                  }}
                >
                  {f.icon}
                </span>
                <h3
                  style={{
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: "#F5F0EB",
                    marginBottom: "0.5rem",
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "rgba(245,240,235,0.45)",
                    lineHeight: 1.65,
                  }}
                >
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section
        id="how-it-works"
        style={{ padding: "6rem 5%", background: "#F5F0EB" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#D97706",
              display: "block",
              marginBottom: "0.75rem",
            }}
          >
            How It Works
          </span>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(2rem,3.5vw,2.75rem)",
              fontWeight: 400,
              color: "#0A0A0B",
              letterSpacing: "-0.03em",
              marginBottom: "0.75rem",
            }}
          >
            Two sides. One platform.
          </h2>

          {/* Tab toggle */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "3rem",
              background: "#E5DDD5",
              padding: "0.375rem",
              borderRadius: 10,
              width: "fit-content",
            }}
          >
            {[
              ["hirer", "I want to hire"],
              ["worker", "I want to earn"],
            ].map(([tab, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "0.625rem 1.5rem",
                  borderRadius: 7,
                  border: "none",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: activeTab === tab ? "#0A0A0B" : "transparent",
                  color: activeTab === tab ? "#F5F0EB" : "#666",
                  transition: "all 0.2s",
                  fontFamily: "inherit",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "hirer" ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: "1.5rem",
              }}
            >
              {[
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
              ].map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    padding: "1.75rem",
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: "2rem",
                      color: "#F59E0B",
                      marginBottom: "1rem",
                      opacity: 0.6,
                    }}
                  >
                    {step.num}
                  </div>
                  <h3
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "#0A0A0B",
                      marginBottom: "0.625rem",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#666",
                      lineHeight: 1.65,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4,1fr)",
                gap: "1.5rem",
              }}
            >
              {[
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
              ].map((step, i) => (
                <div
                  key={step.num}
                  style={{
                    padding: "1.75rem",
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid rgba(0,0,0,0.07)",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: "2rem",
                      color: "#F59E0B",
                      marginBottom: "1rem",
                      opacity: 0.6,
                    }}
                  >
                    {step.num}
                  </div>
                  <h3
                    style={{
                      fontSize: "0.9375rem",
                      fontWeight: 700,
                      color: "#0A0A0B",
                      marginBottom: "0.625rem",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#666",
                      lineHeight: 1.65,
                    }}
                  >
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CATEGORIES (LIVE FROM API) ── */}
      <section
        style={{ padding: "6rem 5%", background: "#111113" }}
        ref={catRef}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              marginBottom: "2.5rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                  color: "#F59E0B",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Every Profession, Every Country
              </span>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "clamp(2rem,3vw,2.5rem)",
                  fontWeight: 400,
                  color: "#F5F0EB",
                  letterSpacing: "-0.03em",
                }}
              >
                {categories.length > 0
                  ? `${categories.length}+ categories`
                  : "500+ categories"}{" "}
                — and growing
              </h2>
            </div>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              <input
                style={{
                  padding: "0.625rem 1rem",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  color: "#F5F0EB",
                  fontSize: "0.875rem",
                  outline: "none",
                  width: 220,
                  fontFamily: "inherit",
                }}
                placeholder="🔍 Search categories..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Category grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: "0.75rem",
              maxHeight: catSearch ? "none" : 480,
              overflow: catSearch ? "visible" : "hidden",
              position: "relative",
            }}
          >
            {(catSearch ? filteredCats : filteredCats.slice(0, 48)).map(
              (cat) => (
                <Link
                  key={cat.id}
                  to={`/search?category=${cat.slug}`}
                  style={{
                    padding: "1.125rem 1rem",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 10,
                    textAlign: "center",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    display: "block",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.07)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <span
                    style={{
                      fontSize: "1.5rem",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {cat.icon || "🔧"}
                  </span>
                  <span
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#F5F0EB",
                      display: "block",
                      lineHeight: 1.3,
                    }}
                  >
                    {cat.name}
                  </span>
                  {cat._count?.workers > 0 && (
                    <span
                      style={{
                        fontSize: "0.65rem",
                        color: "rgba(245,240,235,0.35)",
                        display: "block",
                        marginTop: 3,
                      }}
                    >
                      {cat._count.workers} workers
                    </span>
                  )}
                </Link>
              ),
            )}
          </div>

          {!catSearch && filteredCats.length > 48 && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <Link
                to="/search"
                style={{
                  padding: "0.75rem 2rem",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#F5F0EB",
                  display: "inline-block",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#F59E0B";
                  e.currentTarget.style.color = "#F59E0B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
                  e.currentTarget.style.color = "#F5F0EB";
                }}
              >
                Browse all {filteredCats.length} categories →
              </Link>
            </div>
          )}

          {/* Custom category add */}
          <div
            style={{
              marginTop: "2.5rem",
              padding: "1.75rem",
              background: "rgba(245,158,11,0.05)",
              border: "1.5px dashed rgba(245,158,11,0.3)",
              borderRadius: 14,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 260 }}>
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#F5F0EB",
                    marginBottom: "0.25rem",
                  }}
                >
                  Can't find your profession? Add it.
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "rgba(245,240,235,0.45)",
                  }}
                >
                  SkilledProz is global. If your trade or profession isn't
                  listed, add it instantly — it goes live for the whole
                  platform.
                </div>
              </div>
              {!showCustomCat ? (
                <button
                  onClick={() => setShowCustomCat(true)}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#F59E0B",
                    borderRadius: 8,
                    border: "none",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    color: "#09090B",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    whiteSpace: "nowrap",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#D97706")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#F59E0B")
                  }
                >
                  + Add your profession
                </button>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "0.625rem",
                    flex: 1,
                    minWidth: 320,
                  }}
                >
                  <input
                    autoFocus
                    value={customCatName}
                    onChange={(e) => setCustomCatName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAddCustomCategory()
                    }
                    placeholder="e.g. Drone Operator, Solar Engineer..."
                    style={{
                      flex: 1,
                      padding: "0.75rem 1rem",
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      color: "#F5F0EB",
                      fontSize: "0.875rem",
                      outline: "none",
                      fontFamily: "inherit",
                    }}
                  />
                  <button
                    onClick={handleAddCustomCategory}
                    disabled={addingCat || !customCatName.trim()}
                    style={{
                      padding: "0.75rem 1.25rem",
                      background: "#F59E0B",
                      borderRadius: 8,
                      border: "none",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      color: "#09090B",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      opacity: addingCat ? 0.6 : 1,
                    }}
                  >
                    {addingCat ? "Adding..." : "Add"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCustomCat(false);
                      setCustomCatName("");
                    }}
                    style={{
                      padding: "0.75rem 1rem",
                      background: "transparent",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 8,
                      color: "rgba(245,240,235,0.5)",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
            {addedCat && (
              <div
                style={{
                  marginTop: "1rem",
                  padding: "0.75rem 1rem",
                  background: "rgba(34,197,94,0.1)",
                  border: "1px solid rgba(34,197,94,0.25)",
                  borderRadius: 8,
                  fontSize: "0.875rem",
                  color: "#22c55e",
                  fontWeight: 600,
                }}
              >
                ✅ "{addedCat.name}" is now live on SkilledProz!
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CURRENCIES SHOWCASE ── */}
      <section style={{ padding: "6rem 5%", background: "#09090B" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#F59E0B",
              display: "block",
              marginBottom: "0.75rem",
            }}
          >
            Global Payments
          </span>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: "clamp(2rem,3.5vw,2.75rem)",
              fontWeight: 400,
              color: "#F5F0EB",
              letterSpacing: "-0.03em",
              marginBottom: "0.875rem",
            }}
          >
            Pay and earn in your currency
          </h2>
          <p
            style={{
              color: "rgba(245,240,235,0.5)",
              maxWidth: 520,
              marginBottom: "3rem",
              lineHeight: 1.7,
            }}
          >
            From Naira to Yen, Pound to Dirham — and crypto (USDC, USDT).
            Workers set their profile currency, hirers pay in theirs. Three
            independent currency settings per account: dashboard display,
            payment, and profile rate.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))",
              gap: "0.625rem",
            }}
          >
            {CURRENCIES.map((c) => (
              <div
                key={c.code}
                style={{
                  padding: "0.875rem",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 10,
                  textAlign: "center",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(245,158,11,0.08)";
                  e.currentTarget.style.borderColor = "rgba(245,158,11,0.25)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                }}
              >
                <span
                  style={{
                    fontSize: "1.25rem",
                    display: "block",
                    marginBottom: "0.375rem",
                  }}
                >
                  {c.flag}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: "#F59E0B",
                  }}
                >
                  {c.symbol}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#F5F0EB",
                    marginTop: 2,
                  }}
                >
                  {c.code}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.6rem",
                    color: "rgba(245,240,235,0.3)",
                    marginTop: 1,
                  }}
                >
                  {c.name}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: "2rem",
              display: "flex",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            {[
              "Bank Transfer",
              "Card Payments",
              "Escrow Release",
              "Crypto (USDC/USDT)",
              "Instant Withdrawal",
            ].map((m) => (
              <span
                key={m}
                style={{
                  padding: "0.5rem 1rem",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 999,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "rgba(245,240,235,0.6)",
                }}
              >
                ✓ {m}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── DUAL CTA — WORKER vs HIRER ── */}
      <section style={{ padding: "6rem 5%", background: "#F5F0EB" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
            <span
              style={{
                fontSize: "0.75rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                color: "#D97706",
                display: "block",
                marginBottom: "0.75rem",
              }}
            >
              Join SkilledProz
            </span>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "clamp(2rem,3.5vw,2.75rem)",
                fontWeight: 400,
                color: "#0A0A0B",
                letterSpacing: "-0.03em",
              }}
            >
              Choose your path. Start today.
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.5rem",
            }}
          >
            {/* Hirer card */}
            <div
              style={{
                background: "#0A0A0B",
                borderRadius: 20,
                padding: "2.5rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: "50%",
                  height: "100%",
                  background:
                    "radial-gradient(ellipse at top right, rgba(245,158,11,0.08), transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              <span
                style={{
                  fontSize: "2.5rem",
                  display: "block",
                  marginBottom: "1.25rem",
                }}
              >
                🏗️
              </span>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "1.75rem",
                  fontWeight: 400,
                  color: "#F5F0EB",
                  marginBottom: "0.75rem",
                }}
              >
                Hire a Worker
              </h3>
              <p
                style={{
                  color: "rgba(245,240,235,0.5)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  marginBottom: "1.75rem",
                }}
              >
                Post jobs, browse verified workers, book with escrow protection.
                GPS tracking, video calls, insurance, disputes — all covered.
              </p>
              <ul
                style={{
                  marginBottom: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                }}
              >
                {[
                  "Free to post jobs",
                  "Pay only when satisfied",
                  "500+ trade categories",
                  "29 currencies accepted",
                  "Dispute resolution included",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      fontSize: "0.875rem",
                      color: "rgba(245,240,235,0.7)",
                      listStyle: "none",
                    }}
                  >
                    <span style={{ color: "#F59E0B", fontWeight: 700 }}>✓</span>{" "}
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register/hirer"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.9rem 2rem",
                  background: "#F59E0B",
                  borderRadius: 10,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#09090B",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#D97706")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#F59E0B")
                }
              >
                Create Hirer Account →
              </Link>
            </div>

            {/* Worker card */}
            <div
              style={{
                background: "#0A0A0B",
                borderRadius: 20,
                padding: "2.5rem",
                position: "relative",
                overflow: "hidden",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "50%",
                  height: "100%",
                  background:
                    "radial-gradient(ellipse at top left, rgba(59,130,246,0.06), transparent 70%)",
                  pointerEvents: "none",
                }}
              />
              <span
                style={{
                  fontSize: "2.5rem",
                  display: "block",
                  marginBottom: "1.25rem",
                }}
              >
                ⚡
              </span>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: "1.75rem",
                  fontWeight: 400,
                  color: "#F5F0EB",
                  marginBottom: "0.75rem",
                }}
              >
                Start Earning
              </h3>
              <p
                style={{
                  color: "rgba(245,240,235,0.5)",
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  marginBottom: "1.75rem",
                }}
              >
                Set your rates (hourly, daily, weekly, monthly, custom), get
                verified, receive bookings, and get paid to your local currency.
              </p>
              <ul
                style={{
                  marginBottom: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                }}
              >
                {[
                  "Multi-rate pricing (hourly to monthly)",
                  "Get paid in your currency",
                  "Portfolio & certifications",
                  "Featured listing boosts",
                  "SOS safety system included",
                ].map((item) => (
                  <li
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.625rem",
                      fontSize: "0.875rem",
                      color: "rgba(245,240,235,0.7)",
                      listStyle: "none",
                    }}
                  >
                    <span style={{ color: "#F59E0B", fontWeight: 700 }}>✓</span>{" "}
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                to="/register/worker"
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.9rem 2rem",
                  background: "rgba(245,158,11,0.1)",
                  border: "1.5px solid rgba(245,158,11,0.4)",
                  borderRadius: 10,
                  fontSize: "1rem",
                  fontWeight: 700,
                  color: "#F59E0B",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "#F59E0B";
                  e.currentTarget.style.color = "#09090B";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(245,158,11,0.1)";
                  e.currentTarget.style.color = "#F59E0B";
                }}
              >
                Create Worker Account →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── SAFETY STRIP ── */}
      <div
        style={{
          background: "#111113",
          padding: "2rem 5%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "3rem",
          flexWrap: "wrap",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {[
          ["🔐", "Escrow on every booking"],
          ["📍", "GPS verification"],
          ["🛡️", "Optional job insurance"],
          ["🚨", "SOS emergency alerts"],
          ["⚖️", "48hr dispute resolution"],
          ["✅", "ID & background checks"],
        ].map(([icon, label]) => (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "rgba(245,240,235,0.5)",
            }}
          >
            <span>{icon}</span> {label}
          </div>
        ))}
      </div>

      {/* ── FOOTER ── */}
      <footer
        style={{
          background: "#0A0A0B",
          padding: "4rem 5% 2rem",
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
            gap: "3rem",
            marginBottom: "3rem",
          }}
        >
          <div>
            <Link
              to="/"
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: "1.5rem",
                fontWeight: 400,
                color: "#F5F0EB",
                display: "inline-block",
                marginBottom: "1rem",
              }}
            >
              Skilled<span style={{ color: "#F59E0B" }}>Proz</span>
            </Link>
            <p
              style={{
                fontSize: "0.875rem",
                color: "rgba(245,240,235,0.35)",
                lineHeight: 1.75,
                maxWidth: 260,
                marginBottom: "1.5rem",
              }}
            >
              The global marketplace for skilled trades. Any profession, any
              country, any currency.
            </p>
            <div style={{ display: "flex", gap: "0.625rem" }}>
              {["𝕏", "in", "▶", "f"].map((s) => (
                <a
                  key={s}
                  href="#"
                  style={{
                    width: 34,
                    height: 34,
                    background: "rgba(255,255,255,0.06)",
                    borderRadius: 7,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.875rem",
                    color: "rgba(245,240,235,0.4)",
                    textDecoration: "none",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "#F59E0B";
                    e.currentTarget.style.color = "#09090B";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                    e.currentTarget.style.color = "rgba(245,240,235,0.4)";
                  }}
                >
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
                "How it Works",
              ],
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
              <p
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "#F5F0EB",
                  marginBottom: "1.25rem",
                }}
              >
                {col.title}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                }}
              >
                {col.links.map((l) => (
                  <li key={l}>
                    <Link
                      to="#"
                      style={{
                        fontSize: "0.875rem",
                        color: "rgba(245,240,235,0.4)",
                        textDecoration: "none",
                        transition: "color 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.color = "#F59E0B")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.color = "rgba(245,240,235,0.4)")
                      }
                    >
                      {l}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.07)",
            paddingTop: "1.75rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <span style={{ fontSize: "0.8rem", color: "rgba(245,240,235,0.25)" }}>
            © {new Date().getFullYear()} SkilledProz Technologies Ltd. All
            rights reserved.
          </span>
          <span style={{ fontSize: "0.8rem", color: "rgba(245,240,235,0.25)" }}>
            50+ countries · 29 currencies · 500+ trades
          </span>
        </div>
      </footer>
    </div>
  );
}
