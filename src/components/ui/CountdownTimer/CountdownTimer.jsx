import { useState, useEffect } from "react";
import {
  FaRocket,
  FaClock,
  FaCheckCircle,
  FaClipboardList,
} from "react-icons/fa";
import styles from "./CountdownTimer.module.css";
import SurveyModal from "../../survey/SurveyModal";
import SurveyPage from "../../survey/SurveyModal";

/**
 * CountdownTimer Component
 *
 * @param {string} targetDate - ISO date string (e.g., "2026-09-01T00:00:00")
 * @param {string} title - Optional title above timer (default: "Launching In")
 * @param {string} size - "sm" | "md" | "lg" (default: "md")
 * @param {string} variant - "light" | "dark" | "orange" (default: "orange")
 * @param {boolean} showLabels - Show unit labels (default: true)
 * @param {string} className - Additional CSS classes
 * @param {boolean} showSurvey - Show survey button (default: false)
 * @param {string} email - Pre-fill email for survey (default: "")
 */
const CountdownTimer = ({
  targetDate = "2026-09-01T00:00:00",
  title = "Launching In",
  size = "md",
  variant = "orange",
  showLabels = true,
  className = "",
  showSurvey = false,
  email = "",
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [isExpired, setIsExpired] = useState(false);
  const [showSurveyModal, setShowSurveyModal] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const distance = target - now;

      if (distance < 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setIsExpired(false);
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        ),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const unitLabels = {
    days: "Days",
    hours: "Hours",
    minutes: "Minutes",
    seconds: "Seconds",
  };

  const sizeClasses = {
    sm: styles.sm,
    md: styles.md,
    lg: styles.lg,
  };

  const variantClasses = {
    light: styles.light,
    dark: styles.dark,
    orange: styles.orange,
  };

  if (isExpired) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.expiredMessage}>
          <FaCheckCircle className={styles.expiredIcon} />
          <p className={styles.expiredText}>We're Live!</p>
          <p className={styles.expiredSub}>Join SkilledProz today</p>
        </div>
        {showSurvey && (
          <>
            <button
              className={styles.surveyBtn}
              onClick={() => setShowSurveyModal(true)}
            >
              <FaClipboardList /> Tell us what you need
            </button>
            <SurveyModal
              isOpen={showSurveyModal}
              onClose={() => setShowSurveyModal(false)}
              email={email}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className={`${styles.container} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      >
        {title && (
          <p className={styles.title}>
            <FaClock className={styles.titleIcon} />
            {title}
          </p>
        )}

        <div className={styles.timerGrid}>
          {Object.entries(timeLeft).map(([unit, value]) => (
            <div key={unit} className={styles.unitWrapper}>
              <div className={styles.unitCard}>
                <span className={styles.unitValue}>
                  {String(value).padStart(2, "0")}
                </span>
                {showLabels && (
                  <span className={styles.unitLabel}>{unitLabels[unit]}</span>
                )}
              </div>
              {unit !== "seconds" && (
                <span className={styles.separator}>:</span>
              )}
            </div>
          ))}
        </div>

        {/* Survey Button - shown below timer when enabled */}
        {showSurvey && (
          <button
            className={styles.surveyBtn}
            onClick={() => setShowSurveyModal(true)}
          >
            <FaClipboardList /> Tell us what feature you need most
          </button>
        )}
      </div>

      {/* Survey Modal */}
      {showSurvey && (
        <SurveyPage
          isOpen={showSurveyModal}
          onClose={() => setShowSurveyModal(false)}
          email={email}
        />
      )}
    </>
  );
};

export default CountdownTimer;
