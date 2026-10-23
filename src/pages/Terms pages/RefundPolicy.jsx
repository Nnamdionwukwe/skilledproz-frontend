import { Link } from "react-router-dom";
import styles from "./Legal.module.css";

const sections = [
  {
    title: "1. Overview",
    content: `This Refund Policy explains when and how refunds are issued for bookings made through SkilledProz. Because payments are held in escrow until you confirm job completion, refunds are handled separately from ordinary payment transactions. By making a booking, you agree to this policy in addition to our Terms of Service.`,
  },
  {
    title: "2. When You're Eligible for a Refund",
    content: `You may be eligible for a refund if: (a) the worker cancels the booking before accepting it; (b) the worker fails to show up; (c) the worker delivers work materially different from the agreed description; (d) you and the worker mutually agree to cancel; (e) you cancel before the worker accepts the booking; or (f) a dispute is resolved in your favour by our Dispute Resolution Centre.`,
  },
  {
    title: "3. Full Refunds",
    content: `You are eligible for a full refund of the job amount if: the booking is still PENDING (worker has not yet accepted); the worker cancels before starting work; the worker fails to show up without notice; or the booking is cancelled by mutual written agreement before any escrow funds are released. In these cases, the full job amount is returned to your original payment method or your SkilledProz wallet, per your preference.`,
  },
  {
    title: "4. Partial Refunds",
    content: `If part of the work has been completed, or if escrow has been partially released to the worker, only the remaining unreleased balance is refundable. For example: if a booking is worth 10,000 and 4,000 has already been released to the worker, the maximum refundable amount is 6,000 (minus any platform service fee already incurred — see Section 7). Partial refunds are also used in dispute settlements where the outcome is not fully in either party's favour.`,
  },
  {
    title: "5. Non-Refundable Charges",
    content: `The following are non-refundable: the SkilledProz platform service fee (2% for NGN bookings, 5% for bookings in other currencies), because this fee covers payment processing and escrow custody that have already been incurred. Wallet top-up amounts are refundable only in cases of unauthorized transactions or platform error. Payment provider fees charged by Paystack or Flutterwave are handled per their own policies.`,
  },
  {
    title: "6. How to Request a Refund",
    content: `To request a refund: go to the booking detail page, scroll to the Payment section, and click "Request Refund". You must explain your reason and (optionally) upload supporting evidence. Refund requests are only accepted within 48 hours of job completion. For bookings still in escrow (before completion), you can request a refund at any time during the active escrow period.`,
  },
  {
    title: "7. Review & Processing Time",
    content: `All refund requests are reviewed by our team within 24–48 hours. If your refund is approved, it will be processed within 3–5 business days for NGN transactions and 5–10 business days for foreign currency transactions (the timing depends on your payment provider). You will receive a notification when your refund is initiated and when it is completed.`,
  },
  {
    title: "8. Refund Method",
    content: `Refunds are returned to the original payment method whenever possible. If the original payment method is no longer available, the refund will be issued to your SkilledProz wallet in the same currency. Cash-equivalent refunds are not available. For crypto payments, refunds are issued in the same cryptocurrency at the equivalent fiat value at the time of the original payment.`,
  },
  {
    title: "9. Disputes",
    content: `If a refund is not agreed between you and the worker, either party may raise a dispute through our Dispute Resolution Centre. Our team will review the booking details, chat history, uploaded evidence, and GPS check-in records, and issue a final decision. Dispute outcomes may include full refund, partial refund, or release of escrow to the worker. Final decisions are binding under these terms.`,
  },
  {
    title: "10. Chargebacks",
    content: `If you initiate a chargeback through your card issuer instead of using our refund process, your SkilledProz account may be suspended pending investigation. Chargebacks that are found to be fraudulent or that duplicate an already-processed refund may result in permanent account termination. Please use our refund process first — it is faster, more transparent, and preserves your account standing.`,
  },
  {
    title: "11. Changes to This Policy",
    content: `We may update this Refund Policy from time to time. Material changes will be communicated via email or in-app notification at least 30 days before they take effect. Continued use of the platform after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    title: "12. Contact",
    content: `For refund-related questions, contact support@skilledproz.com or raise a dispute from the relevant booking page. We aim to respond to all refund enquiries within 24 hours.`,
  },
];

export default function RefundPolicy() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
          Skilled<span>Proz</span>
        </Link>
        <div className={styles.navLinks}>
          <Link to="/terms">Terms</Link>
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
          <h1 className={styles.title}>Refund Policy</h1>
          <p className={styles.meta}>
            Last updated: <strong>October 2026</strong> &nbsp;·&nbsp; Effective:{" "}
            <strong>October 2026</strong>
          </p>
          <p className={styles.intro}>
            This Refund Policy explains how refunds work on SkilledProz. Because
            all payments are held in escrow until job completion, refunds follow
            a distinct process from ordinary transactions. Please read this
            carefully before making or accepting a booking.
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
          © {new Date().getFullYear()} SkilledProz Marketplace Ltd. All rights
          reserved.
        </span>
        <div className={styles.footerLinks}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/refund-policy">Refunds</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
