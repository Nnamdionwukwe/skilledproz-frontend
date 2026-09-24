// src/components/ui/AlertModal.jsx
import { Link } from "react-router-dom";
import { FiX, FiArrowRight, FiAlertTriangle } from "react-icons/fi";
import styles from "./AlertModal.module.css";

export default function AlertModal({
  isOpen,
  onClose,
  title = "Attention Required",
  subtitle = "Some items on the platform need your review.",
  alerts = [], // [{ icon: Component, label, description, to, variant }]
}) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIcon}>
              <FiAlertTriangle size={20} />
            </div>
            <div>
              <h3 className={styles.title}>{title}</h3>
              <p className={styles.subtitle}>{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className={styles.list}>
          {alerts.map((a, i) => {
            const Icon = a.icon;
            const content = (
              <>
                <span
                  className={`${styles.alertIcon} ${styles[`variant_${a.variant || "amber"}`]}`}
                >
                  {Icon ? <Icon size={16} /> : <FiAlertTriangle size={16} />}
                </span>
                <div className={styles.alertText}>
                  <span className={styles.alertLabel}>{a.label}</span>
                  {a.description && (
                    <span className={styles.alertDesc}>{a.description}</span>
                  )}
                </div>
                {a.to && <FiArrowRight size={16} className={styles.arrow} />}
              </>
            );

            return a.to ? (
              <Link
                key={i}
                to={a.to}
                className={styles.alertRow}
                onClick={onClose}
              >
                {content}
              </Link>
            ) : (
              <div key={i} className={styles.alertRow}>
                {content}
              </div>
            );
          })}
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.dismissBtn} onClick={onClose}>
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
