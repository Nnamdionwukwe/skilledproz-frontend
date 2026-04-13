import { Link } from "react-router-dom";
import styles from "./Legal.module.css";

const sections = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly: name, email, phone number, location, payment details, government ID for verification, and portfolio uploads. We also collect usage data automatically — pages visited, search queries, device type, IP address, and booking history.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use your information to match hirers with skilled workers, process payments, verify identity, send booking notifications, improve our matching algorithm, prevent fraud, and comply with legal obligations. We do not sell your personal data to third parties.`,
  },
  {
    title: "3. Data Sharing",
    content: `We share your information with: payment processors (Paystack, Stripe) to handle transactions; identity verification providers; cloud storage providers for file hosting; and analytics providers. We may share data with law enforcement when required by law.`,
  },
  {
    title: "4. Multi-Currency & Payment Data",
    content: `SkilledPro operates across multiple currencies and regions. Payment data is processed by regional payment partners. We do not store full card numbers or bank credentials. All payment data is encrypted in transit and at rest.`,
  },
  {
    title: "5. Location Data",
    content: `Location data (GPS or postcode) is used to match you with nearby workers or hirers. You can control location permissions in your device settings. We do not share precise location data with other users — only city/region level.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your data for as long as your account is active. On account deletion, personal data is anonymised within 30 days. Booking records may be retained for 7 years for legal and tax compliance purposes.`,
  },
  {
    title: "7. Your Rights",
    content: `Depending on your region, you may have the right to: access your personal data, correct inaccurate data, request deletion, withdraw consent, export your data, and object to processing. Contact privacy@skilledpro.com to exercise these rights.`,
  },
  {
    title: "8. Cookies",
    content: `We use essential cookies for authentication, preference cookies to remember your settings, and analytics cookies to understand how our platform is used. You can manage cookie preferences in your browser settings.`,
  },
  {
    title: "9. Children's Privacy",
    content: `SkilledPro is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If we discover we have collected data from a minor, we will delete it immediately.`,
  },
  {
    title: "10. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify you via email or in-app notification before any material changes take effect. Continued use of the platform after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: "11. Contact",
    content: `For privacy-related queries, contact our Data Protection Officer at privacy@skilledpro.com or write to: SkilledPro, Lagos, Nigeria.`,
  },
];

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          Skilled<span>Proz</span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login" className={styles.navCta}>
            Sign in
          </Link>
        </div>
      </nav>

      <div className={styles.layout}>
        {/* Sidebar TOC */}
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Contents</div>
          {sections.map((s, i) => (
            <a key={i} href={`#section-${i}`} className={styles.tocItem}>
              {s.title}
            </a>
          ))}
        </aside>

        {/* Content */}
        <main className={styles.main}>
          <div className={styles.badge}>Legal</div>
          <h1 className={styles.title}>Privacy Policy</h1>
          <p className={styles.meta}>
            Last updated: <strong>March 2026</strong> &nbsp;·&nbsp; Effective:{" "}
            <strong>March 2026</strong>
          </p>
          <p className={styles.intro}>
            SkilledProz ("we", "our", "us") is committed to protecting your
            privacy. This policy explains how we collect, use, and protect your
            personal information when you use our platform — whether you are a
            hirer or a skilled worker, anywhere in the world.
          </p>

          {sections.map((s, i) => (
            <section key={i} id={`section-${i}`} className={styles.section}>
              <h2 className={styles.sectionTitle}>{s.title}</h2>
              <p className={styles.sectionContent}>{s.content}</p>
            </section>
          ))}
        </main>
      </div>

      <footer className={styles.footer}>
        <span>
          © {new Date().getFullYear()} SkilledProz. All rights reserved.
        </span>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
