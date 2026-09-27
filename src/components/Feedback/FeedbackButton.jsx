import { useState } from "react";
import {
  FaComment,
  FaTimes,
  FaStar,
  FaSmile,
  FaFrown,
  FaMeh,
  FaBug,
  FaLightbulb,
  FaHeart,
  FaArrowRight,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaUser,
  FaEnvelope,
  FaTag,
  FaCheck,
} from "react-icons/fa";
import styles from "./Feedback.module.css";

// ── ANALYTICS ─────────────────────────────────────────────────────────────
import tracker from "../../lib/analytics/tracker";

const FEEDBACK_TYPES = [
  { id: "praise", label: "Praise", icon: <FaSmile />, color: "#10B981" },
  {
    id: "suggestion",
    label: "Suggestion",
    icon: <FaLightbulb />,
    color: "#F59E0B",
  },
  { id: "bug", label: "Bug Report", icon: <FaBug />, color: "#EF4444" },
  {
    id: "feature",
    label: "Feature Request",
    icon: <FaHeart />,
    color: "#8B5CF6",
  },
  { id: "general", label: "General", icon: <FaComment />, color: "#3B82F6" },
];

const RATINGS = [
  { value: 1, label: "Very Poor", icon: <FaFrown /> },
  { value: 2, label: "Poor", icon: <FaFrown /> },
  { value: 3, label: "Average", icon: <FaMeh /> },
  { value: 4, label: "Good", icon: <FaSmile /> },
  { value: 5, label: "Excellent", icon: <FaSmile /> },
];

export default function FeedbackButton({
  buttonText = "Give Feedback",
  buttonIcon = <FaComment />,
  buttonPosition = "fixed", // fixed | inline
  buttonColor = "orange",
  email = "",
  userName = "",
  onFeedbackSubmit = null,
  className = "",
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    type: "",
    rating: 0,
    title: "",
    description: "",
    email: email,
    name: userName,
    tags: [],
    screenUrl: "",
    browserInfo: "",
  });

  // Check if name/email are pre-filled from auth
  const hasPrefilledName = Boolean(userName);
  const hasPrefilledEmail = Boolean(email);

  // ── ANALYTICS: track modal open/close ────────────────────────────────────
  const openModal = () => {
    setIsOpen(true);
    tracker.action("feedback.modal.opened", {
      position: buttonPosition,
      color: buttonColor,
      hasPrefilledName,
      hasPrefilledEmail,
    });
  };

  const closeModal = () => {
    // If user closes before completing, log where they dropped off
    if (status !== "success") {
      tracker.track("feedback.modal.abandoned", {
        droppedAtStep: step,
        feedbackType: formData.type || null,
        hasRating: formData.rating > 0,
        hasTitle: !!formData.title,
        hasDescription: formData.description.length > 10,
      });
    }
    setIsOpen(false);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (typeId) => {
    handleInputChange("type", typeId);
    // ── ANALYTICS: which category do users pick? ───────────────────────────
    tracker.track("feedback.type.selected", { type: typeId });
  };

  const handleRatingSelect = (rating) => {
    handleInputChange("rating", rating);
    // ── ANALYTICS: satisfaction signal ─────────────────────────────────────
    tracker.track("feedback.rating.selected", {
      rating,
      feedbackType: formData.type || null,
    });
  };

  const handleNext = () => {
    if (step < 3) {
      const nextStep = step + 1;
      setStep(nextStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // ── ANALYTICS: step progression ──────────────────────────────────────
      tracker.track("feedback.step.advanced", {
        from: step,
        to: nextStep,
      });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      const prevStep = step - 1;
      setStep(prevStep);
      window.scrollTo({ top: 0, behavior: "smooth" });
      // ── ANALYTICS: user went back (signal of hesitation) ────────────────
      tracker.track("feedback.step.wentBack", {
        from: step,
        to: prevStep,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");

    // ── ANALYTICS: user is attempting to submit ─────────────────────────────
    tracker.action("feedback.submit.attempt", {
      type: formData.type,
      rating: formData.rating,
      titleLength: formData.title.length,
      descriptionLength: formData.description.length,
      hasEmail: !!formData.email,
    });

    try {
      // Collect browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        screen: `${window.screen.width}x${window.screen.height}`,
        language: navigator.language,
        platform: navigator.platform,
      };

      const payload = {
        ...formData,
        screenUrl: window.location.href,
        browserInfo: JSON.stringify(browserInfo),
        submittedAt: new Date().toISOString(),
      };

      // Send to your backend
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/feedback`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to submit feedback");

      setStatus("success");
      setMessage("Thank you! Your feedback helps us improve SkilledProz.");

      // ── ANALYTICS: submission succeeded (domain event) ──────────────────
      tracker.action("feedback.submitted", {
        type: formData.type,
        rating: formData.rating,
        titleLength: formData.title.length,
        descriptionLength: formData.description.length,
        hasEmail: !!formData.email,
        hasName: !!formData.name,
      });

      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
        setStep(1);
        setFormData({
          type: "",
          rating: 0,
          title: "",
          description: "",
          email: email,
          name: userName,
          tags: [],
          screenUrl: "",
          browserInfo: "",
        });
      }, 3000);

      if (onFeedbackSubmit) {
        onFeedbackSubmit(payload);
      }
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
      // ── ANALYTICS: submission failed ────────────────────────────────────
      tracker.action("feedback.submit.failed", {
        type: formData.type,
        reason: err.message || "unknown",
      });
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.type && formData.rating > 0;
      case 2:
        return (
          formData.title.trim().length > 0 &&
          formData.description.trim().length > 10
        );
      case 3:
        return true;
      default:
        return false;
    }
  };

  const isOpenClass = isOpen ? styles.open : "";

  const buttonClasses = `
    ${styles.floatingButton}
    ${buttonPosition === "fixed" ? styles.fixed : styles.inline}
    ${styles[buttonColor]}
    ${className}
  `;

  return (
    <>
      {/* Trigger Button */}
      {buttonPosition === "fixed" ? (
        <button
          className={buttonClasses}
          onClick={openModal}
          aria-label="Give Feedback"
          data-track-id="feedback.trigger.fixed"
        >
          {buttonIcon}
          <span className={styles.buttonText}>{buttonText}</span>
        </button>
      ) : (
        <button
          className={buttonClasses}
          onClick={openModal}
          data-track-id="feedback.trigger.inline"
        >
          {buttonIcon}
          {buttonText}
        </button>
      )}

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className={`${styles.overlay} ${isOpenClass}`}
          onClick={closeModal}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              className={styles.closeBtn}
              onClick={closeModal}
              data-track-id="feedback.modal.close"
            >
              <FaTimes />
            </button>

            {/* Header */}
            <div className={styles.header}>
              <span className={styles.badge}>💬 Feedback</span>
              <h2 className={styles.title}>Help Us Improve</h2>
              <p className={styles.subtitle}>
                Your feedback shapes the future of SkilledProz
              </p>
            </div>

            {/* Progress Steps */}
            <div className={styles.stepDots}>
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`${styles.stepDot} ${s === step ? styles.active : ""} ${s < step ? styles.completed : ""}`}
                />
              ))}
            </div>

            {/* Content */}
            {status === "success" && (
              <div className={styles.successMessage}>
                <FaCheckCircle className={styles.successIcon} />
                <h3>Feedback Submitted!</h3>
                <p>{message}</p>
                <p className={styles.successSub}>
                  Thank you for helping us grow.
                </p>
              </div>
            )}

            {status === "error" && (
              <div className={styles.errorMessage}>
                <FaExclamationTriangle className={styles.errorIcon} />
                <h3>Something went wrong</h3>
                <p>{message}</p>
                <button
                  className={styles.retryBtn}
                  onClick={() => {
                    setStatus("idle");
                    // ── ANALYTICS: retry after failure ────────────────────────
                    tracker.track("feedback.submit.retried", {
                      type: formData.type,
                    });
                  }}
                  data-track-id="feedback.error.retry"
                >
                  Try Again
                </button>
              </div>
            )}

            {status === "idle" && (
              <form onSubmit={handleSubmit} className={styles.form}>
                {/* Step 1: Type & Rating */}
                {step === 1 && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepLabel}>Step 1 of 3</span>
                      <h3 className={styles.question}>What's on your mind?</h3>
                      <p className={styles.stepDesc}>
                        Select a category and rate your experience
                      </p>
                    </div>

                    <div className={styles.typeGrid}>
                      {FEEDBACK_TYPES.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          className={`${styles.typeCard} ${formData.type === type.id ? styles.selected : ""}`}
                          onClick={() => handleTypeSelect(type.id)}
                          style={{
                            borderColor:
                              formData.type === type.id
                                ? type.color
                                : undefined,
                            background:
                              formData.type === type.id
                                ? `${type.color}15`
                                : undefined,
                          }}
                          data-track-id={`feedback.type.${type.id}`}
                        >
                          <span
                            className={styles.typeIcon}
                            style={{ color: type.color }}
                          >
                            {type.icon}
                          </span>
                          <span className={styles.typeLabel}>{type.label}</span>
                        </button>
                      ))}
                    </div>

                    <div className={styles.ratingSection}>
                      <p className={styles.ratingLabel}>Rate your experience</p>
                      <div className={styles.ratingStars}>
                        {RATINGS.map((rating) => (
                          <button
                            key={rating.value}
                            type="button"
                            className={`${styles.ratingStar} ${formData.rating >= rating.value ? styles.active : ""}`}
                            onClick={() => handleRatingSelect(rating.value)}
                            data-track-id={`feedback.rating.${rating.value}`}
                          >
                            <FaStar />
                            <span className={styles.ratingLabelSmall}>
                              {rating.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className={styles.navButtons}>
                      <button
                        type="button"
                        className={styles.nextBtn}
                        onClick={handleNext}
                        disabled={!isStepValid()}
                        data-track-id="feedback.step1.next"
                      >
                        Next <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepLabel}>Step 2 of 3</span>
                      <h3 className={styles.question}>Tell us more</h3>
                      <p className={styles.stepDesc}>
                        Be specific so we can take action
                      </p>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        <FaTag /> Title
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Brief summary of your feedback"
                        value={formData.title}
                        onChange={(e) =>
                          handleInputChange("title", e.target.value)
                        }
                        onFocus={() => {
                          if (!formData.title) {
                            tracker.track("feedback.step2.title.focused");
                          }
                        }}
                        required
                        data-track-id="feedback.step2.title"
                      />
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        <FaComment /> Description
                      </label>
                      <textarea
                        className={styles.textarea}
                        placeholder="Describe your experience in detail..."
                        value={formData.description}
                        onChange={(e) =>
                          handleInputChange("description", e.target.value)
                        }
                        onFocus={() => {
                          if (!formData.description) {
                            tracker.track("feedback.step2.description.focused");
                          }
                        }}
                        rows={4}
                        required
                        data-track-id="feedback.step2.description"
                      />
                      <div className={styles.charCount}>
                        {formData.description.length} characters (minimum 10)
                      </div>
                    </div>

                    <div className={styles.navButtons}>
                      <button
                        type="button"
                        className={styles.backBtn}
                        onClick={handleBack}
                        data-track-id="feedback.step2.back"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className={styles.nextBtn}
                        onClick={handleNext}
                        disabled={!isStepValid()}
                        data-track-id="feedback.step2.next"
                      >
                        Next <FaArrowRight />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Contact & Submit */}
                {step === 3 && (
                  <div className={styles.step}>
                    <div className={styles.stepHeader}>
                      <span className={styles.stepLabel}>Step 3 of 3</span>
                      <h3 className={styles.question}>Almost done!</h3>
                      <p className={styles.stepDesc}>
                        Help us follow up if needed (optional)
                      </p>
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        <FaUser /> Name
                        {hasPrefilledName && (
                          <span className={styles.prefillBadge}>
                            <FaCheck /> Pre-filled
                          </span>
                        )}
                      </label>
                      <div className={styles.inputWrapper}>
                        <input
                          type="text"
                          className={`${styles.input} ${hasPrefilledName ? styles.prefilled : ""}`}
                          placeholder="Your name"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          data-track-id="feedback.step3.name"
                        />
                        {hasPrefilledName && (
                          <span className={styles.prefillIcon}>
                            <FaCheck />
                          </span>
                        )}
                      </div>
                      {hasPrefilledName && (
                        <span className={styles.prefillHint}>
                          Auto-filled from your account
                        </span>
                      )}
                    </div>

                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        <FaEnvelope /> Email
                        {hasPrefilledEmail && (
                          <span className={styles.prefillBadge}>
                            <FaCheck /> Pre-filled
                          </span>
                        )}
                      </label>
                      <div className={styles.inputWrapper}>
                        <input
                          type="email"
                          className={`${styles.input} ${hasPrefilledEmail ? styles.prefilled : ""}`}
                          placeholder="Your email (so we can follow up)"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          data-track-id="feedback.step3.email"
                        />
                        {hasPrefilledEmail && (
                          <span className={styles.prefillIcon}>
                            <FaCheck />
                          </span>
                        )}
                      </div>
                      {hasPrefilledEmail && (
                        <span className={styles.prefillHint}>
                          Auto-filled from your account
                        </span>
                      )}
                      <span className={styles.fieldHint}>
                        We'll only use this to follow up on your feedback
                      </span>
                    </div>

                    <div className={styles.navButtons}>
                      <button
                        type="button"
                        className={styles.backBtn}
                        onClick={handleBack}
                        data-track-id="feedback.step3.back"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={status === "submitting"}
                        data-track-id="feedback.step3.submit"
                      >
                        {status === "submitting" ? (
                          <>
                            <FaSpinner className={styles.spinner} />{" "}
                            Submitting...
                          </>
                        ) : (
                          <>
                            Submit Feedback <FaArrowRight />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
