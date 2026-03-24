import styles from "./AuthLayout.module.css";

export default function AuthLayout({ children }) {
  return (
    <div className={styles.shell}>
      {/* ── Left brand panel ── */}
      <aside className={styles.brand}>
        <div className={styles.noise} />
        <div className={styles.grid} />

        <div className={styles.brandInner}>
          {/* Logo */}
          <div className={styles.logo}>
            <span className={styles.logoMark}>SP</span>
            <span className={styles.logoName}>SkilledProz</span>
          </div>

          {/* Taglines */}
          <div className={styles.taglines}>
            <p className={styles.tagline}>Find skilled professionals.</p>
            <p className={styles.tagline}>Book with confidence.</p>
            <p className={styles.taglineAccent}>Get the job done.</p>
          </div>

          {/* Stats */}
          <div className={styles.stats}>
            {[
              { num: "12k+", label: "Skilled Workers" },
              { num: "90", label: "Categories" },
              { num: "98%", label: "Satisfaction" },
            ].map(({ num, label }) => (
              <div key={label} className={styles.stat}>
                <span className={styles.statNum}>{num}</span>
                <span className={styles.statLabel}>{label}</span>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className={styles.testimonial}>
            <p className={styles.testimonialText}>
              "Found an amazing electrician within 2 hours. Absolutely
              seamless."
            </p>
            <div className={styles.testimonialAuthor}>
              <div className={styles.testimonialAvatar}>AO</div>
              <div>
                <p className={styles.testimonialName}>Adaeze Okonkwo</p>
                <p className={styles.testimonialRole}>Hirer · Lagos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className={styles.circle1} />
        <div className={styles.circle2} />
      </aside>

      {/* ── Right form panel ── */}
      <main className={styles.formPanel}>{children}</main>
    </div>
  );
}
