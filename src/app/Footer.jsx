import { Link } from "react-router-dom";
import {
  FaTwitter,
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaLinkedin,
  FaTelegram,
} from "react-icons/fa";
import styles from "./Footer.module.css";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const companyLinks = [
    ["About Us", "/about"],
    ["Contact", "/contact"],
    ["Privacy Policy", "/privacy"],
    ["Terms of Service", "/terms"],
    ["Sign In", "/login"],
    ["Blog", "/blog"],
  ];

  const socialLinks = [
    {
      name: "Twitter",
      url: "https://x.com/skilledprozz",
      icon: <FaTwitter />,
    },
    {
      name: "YouTube",
      url: "https://youtube.com/@skilledprozmarketplace",
      icon: <FaYoutube />,
    },
    {
      name: "Instagram",
      url: "https://www.instagram.com/skilledproz",
      icon: <FaInstagram />,
    },
    {
      name: "TikTok",
      url: "https://www.tiktok.com/@skilledprozmarketplace",
      icon: <FaTiktok />,
    },
    {
      name: "Facebook",
      url: "https://www.facebook.com/share/19LD9KwbZt/",
      icon: <FaFacebook />,
    },
    {
      name: "Telegram",
      url: "https://t.me/Skilledprozmarketplace",
      icon: <FaTelegram />,
    },
    {
      name: "LinkedIn",
      url: "", // Add your LinkedIn URL here when you create the account
      icon: <FaLinkedin />,
    },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerBrand}>
          <Link to="/" className={styles.footerLogo}>
            Skilled<span>Proz</span>
          </Link>
          <p className={styles.footerBrandDesc}>
            The global marketplace for skilled trades. Any profession, any
            country, any currency.
          </p>
          <div className={styles.footerSocials}>
            {socialLinks.map((social) => (
              <a
                key={social.name}
                href={social.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.socialLink}
                aria-label={social.name}
                style={{
                  pointerEvents: social.url ? "auto" : "none",
                  opacity: social.url ? 1 : 0.4,
                }}
              >
                {social.icon}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.footerLinks}>
          <h4 className={styles.footerLinksTitle}>Company</h4>
          <ul className={styles.footerLinksList}>
            {companyLinks.map(([label, href]) => (
              <li key={label}>
                <Link to={href}>{label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <span className={styles.footerCopy}>
          © {currentYear} SkilledProz Technologies Ltd. All rights reserved.
        </span>
        <div className={styles.footerLegal}>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
