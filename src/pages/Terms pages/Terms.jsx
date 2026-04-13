import { Link } from "react-router-dom";
import styles from "./Legal.module.css";

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: `By creating an account or using SkilledProz, you agree to these Terms of Service. If you do not agree, do not use the platform. These terms apply to all users — hirers, workers, and visitors — across all countries where SkilledProz operates.`,
  },
  {
    title: "2. Platform Description",
    content: `SkilledProz is a two-sided marketplace connecting hirers with skilled workers across hundreds of categories globally. We Provide the technology platform, payment infrastructure, and trust systems — but we are not the employer of any worker, and we are not a party to agreements between hirers and workers.`,
  },
  {
    title: "3. Account Registration",
    content: `You must be at least 18 years old to register. You agree to provide accurate, current information and to update it as needed. You are responsible for maintaining the security of your account credentials. Sharing accounts is not permitted.`,
  },
  {
    title: "4. Worker Obligations",
    content: `Workers must accurately represent their skills, qualifications, and experience. You must honour confirmed bookings unless you have a legitimate reason to cancel. You agree to behave professionally with all hirers. Misrepresentation, fraud, or harassment will result in immediate account suspension.`,
  },
  {
    title: "5. Hirer Obligations",
    content: `Hirers must provide accurate job descriptions and locations. You agree to pay the agreed rate upon job completion. You must treat workers with respect and dignity. Attempting to circumvent the platform to avoid fees is prohibited and may result in account termination.`,
  },
  {
    title: "6. Bookings & Cancellations",
    content: `Once a booking is accepted, both parties are bound by the agreed terms. Cancellations with less than 24 hours notice may incur a fee. No-shows by either party will be reviewed and may affect account standing. Disputed bookings can be raised through our Dispute Resolution Centre.`,
  },
  {
    title: "7. Payments & Escrow",
    content: `SkilledPro uses an escrow system — hirers pay upfront, funds are held securely, and released to the worker upon job completion. Platform fees range from 10–20% of the transaction value. All fees are disclosed before booking confirmation. Refunds are subject to our refund policy.`,
  },
  {
    title: "8. Multi-Currency & Regional Compliance",
    content: `Payments are processed in local currencies through regional partners (Paystack, Stripe, Flutterwave, etc.). Users are responsible for understanding their local tax obligations. SkilledPro will provide transaction records for tax purposes where required.`,
  },
  {
    title: "9. Prohibited Conduct",
    content: `You may not: impersonate another person, post false reviews, engage in price manipulation, use the platform for illegal activities, scrape or reverse-engineer our systems, or attempt to circumvent our safety measures. Violations may result in permanent account removal and legal action.`,
  },
  {
    title: "10. Intellectual Property",
    content: `All platform content, trademarks, and technology are owned by SkilledPro. Workers retain ownership of their portfolio content but grant SkilledPro a licence to display it on the platform. You may not reproduce or distribute our content without written permission.`,
  },
  {
    title: "11. Limitation of Liability",
    content: `SkilledPro is a marketplace and is not liable for the quality of work performed, disputes between users, or losses arising from platform downtime. Our total liability to any user shall not exceed the fees paid to SkilledPro in the 3 months preceding the claim.`,
  },
  {
    title: "12. Termination",
    content: `We may suspend or terminate your account for violation of these terms, fraudulent activity, or at our discretion with notice. You may delete your account at any time. Termination does not affect obligations from completed bookings.`,
  },
  {
    title: "13. Governing Law",
    content: `These terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved through binding arbitration where possible. Users in other jurisdictions may also have rights under local law that we respect.`,
  },
  {
    title: "14. Changes to Terms",
    content: `We may update these terms with 30 days notice via email or in-app notification. Continued use after the effective date constitutes acceptance. If you disagree with updated terms, you may close your account before they take effect.`,
  },
];

export default function Terms() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          Skilled<span>Proz</span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/login" className={styles.navCta}>
            Sign in
          </Link>
        </div>
      </nav>

      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTitle}>Contents</div>
          {sections.map((s, i) => (
            <a key={i} href={`#section-${i}`} className={styles.tocItem}>
              {s.title}
            </a>
          ))}
        </aside>

        <main className={styles.main}>
          <div className={styles.badge}>Legal</div>
          <h1 className={styles.title}>Terms of Service</h1>
          <p className={styles.meta}>
            Last updated: <strong>March 2026</strong> &nbsp;·&nbsp; Effective:{" "}
            <strong>March 2026</strong>
          </p>
          <p className={styles.intro}>
            These Terms of Service govern your use of SkilledProz — the global
            marketplace connecting hirers and skilled workers. Please read these
            carefully. By using the platform, you agree to be bound by these
            terms.
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
