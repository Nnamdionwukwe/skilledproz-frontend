// src/components/support/GlobalSupportBanner.jsx
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiMessageSquare, FiX } from "react-icons/fi";
import { useAdminSupportStore } from "../../store/adminSupportStore";
import styles from "./GlobalSupportBanner.module.css";

export default function GlobalSupportBanner() {
  const { banner, hideBanner } = useAdminSupportStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (banner) {
      // Auto-hide banner after 8 seconds
      const timer = setTimeout(() => {
        hideBanner();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [banner, hideBanner]);

  if (!banner) return null;

  return (
    <div
      className={styles.bannerContainer}
      onClick={() => {
        navigate("/admin/support");
        hideBanner();
      }}
    >
      <div className={styles.bannerContent}>
        <div className={styles.bannerIcon}>
          <FiMessageSquare size={20} />
        </div>
        <div className={styles.bannerText}>
          <strong>{banner.title}</strong>
          <p>{banner.message}</p>
        </div>
        <button
          className={styles.closeBtn}
          onClick={(e) => {
            e.stopPropagation(); // Prevent navigating when clicking close
            hideBanner();
          }}
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}
