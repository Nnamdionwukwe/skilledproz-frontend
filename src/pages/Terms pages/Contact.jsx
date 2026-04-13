import { useState } from "react";
import { Link } from "react-router-dom";
import styles from "./Contact.module.css";

const contactMethods = [
  {
    icon: "📧",
    label: "Email",
    value: "support@skilledpro.com",
    href: "mailto:support@skilledpro.com",
  },
  { icon: "💬", label: "Live Chat", value: "Available in-app", href: null },
  {
    icon: "🐦",
    label: "Twitter / X",
    value: "@SkilledPro",
    href: "https://twitter.com/skilledpro",
  },
  { icon: "📍", label: "Headquarters", value: "Lagos, Nigeria 🇳🇬", href: null },
];

export default function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.message) {
      setError("Please fill in all required fields.");
      return;
    }
    setLoading(true);
    // Simulate submission
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          Skilled<span>Proz</span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/about">About</Link>
          <Link to="/login" className={styles.navCta}>
            Login
          </Link>
        </div>
      </nav>

      <div className={styles.layout}>
        {/* Left */}
        <div className={styles.left}>
          <div className={styles.badge}>Get in Touch</div>
          <h1 className={styles.title}>
            We'd love to
            <br />
            <span className={styles.accent}>hear from you.</span>
          </h1>
          <p className={styles.sub}>
            Have a question, a partnership idea, or need support? Our team is
            ready to help — usually within 24 hours.
          </p>

          <div className={styles.methods}>
            {contactMethods.map((m, i) => (
              <div className={styles.method} key={i}>
                <span className={styles.methodIcon}>{m.icon}</span>
                <div>
                  <div className={styles.methodLabel}>{m.label}</div>
                  {m.href ? (
                    <a href={m.href} className={styles.methodValue}>
                      {m.value}
                    </a>
                  ) : (
                    <span className={styles.methodValue}>{m.value}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Form */}
        <div className={styles.right}>
          {submitted ? (
            <div className={styles.success}>
              <span className={styles.successIcon}>✅</span>
              <h3>Message sent!</h3>
              <p>
                We'll get back to you at <strong>{form.email}</strong> within 24
                hours.
              </p>
              <button
                className={styles.resetBtn}
                onClick={() => {
                  setSubmitted(false);
                  setForm({ name: "", email: "", subject: "", message: "" });
                }}
              >
                Send another message
              </button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <h2 className={styles.formTitle}>Send us a message</h2>

              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Full Name *</label>
                  <input
                    className={styles.input}
                    name="name"
                    placeholder="John Doe"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email *</label>
                  <input
                    className={styles.input}
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Subject</label>
                <select
                  className={styles.input}
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                >
                  <option value="">Select a topic</option>
                  <option value="support">Account Support</option>
                  <option value="billing">Billing & Payments</option>
                  <option value="partnership">Partnership</option>
                  <option value="verification">Verification Issues</option>
                  <option value="dispute">Dispute Resolution</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Message *</label>
                <textarea
                  className={styles.textarea}
                  name="message"
                  placeholder="Tell us how we can help..."
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                />
              </div>

              {error && <div className={styles.error}>{error}</div>}

              <button
                className={styles.submit}
                type="submit"
                disabled={loading}
              >
                {loading ? <span className={styles.spinner} /> : null}
                {loading ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}
        </div>
      </div>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} SkilledProz. All rights reserved.
        </span>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/about">About</Link>
        </div>
      </footer>
    </div>
  );
}
