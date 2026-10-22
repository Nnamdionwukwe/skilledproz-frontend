// src/pages/Terms pages/Contact.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FiMail,
  FiMessageCircle,
  FiInstagram,
  FiMapPin,
  FiCheckCircle,
  FiArrowRight,
} from "react-icons/fi";
import api from "../../lib/api";
import styles from "./Contact.module.css";

const contactMethods = [
  {
    icon: <FiMail size={20} />,
    label: "Email",
    value: "support@skilledproz.com",
    href: "mailto:support@skilledproz.com",
  },
  {
    icon: <FiMessageCircle size={20} />,
    label: "Live Chat",
    value: "Available in-app",
    href: null,
  },
  {
    icon: <FiInstagram size={20} />,
    label: "Instagram",
    value: "@skilledproz",
    href: "https://www.instagram.com/skilledproz?exln=MWltanU2ZmY4Ym51ag%3D%3D&utm_source=qr",
  },
  {
    icon: <FiMapPin size={20} />,
    label: "Headquarters",
    value: "Abuja, Nigeria 🇳🇬",
    href: null,
  },
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
    try {
      // API Endpoint defined in earlier steps
      await api.post("/contact", form);
      setSubmitted(true);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to send message. Please try again.",
      );
    } finally {
      setLoading(false);
    }
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
            Sign in
          </Link>
        </div>
      </nav>

      <div className={styles.layout}>
        {/* Left Side */}
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
                    <a
                      href={m.href}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.methodValue}
                    >
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

        {/* Right Side — Form */}
        <div className={styles.right}>
          {submitted ? (
            <div className={styles.success}>
              <span className={styles.successIcon}>
                <FiCheckCircle />
              </span>
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
                Send another message <FiArrowRight size={14} />
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
          © {new Date().getFullYear()} SkilledProz Marketplace Ltd. All rights
          reserved.
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
