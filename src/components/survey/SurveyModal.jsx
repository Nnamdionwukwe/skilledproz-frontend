import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaCheck,
  FaArrowRight,
  FaArrowLeft,
  FaUser,
  FaWrench,
  FaShieldAlt,
  FaClock,
  FaMoneyBillWave,
  FaStar,
  FaUserTie,
  FaBuilding,
  FaHome,
  FaTools,
  FaBolt,
  FaPaintBrush,
  FaSnowflake,
  FaSpinner,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSmile,
  FaFrown,
  FaMeh,
  FaCommentDots,
  FaPhone,
  FaEnvelope,
  FaMapMarkerAlt,
  FaGlobe,
  FaHome as FaHomeIcon,
  FaInfoCircle,
  FaPhoneAlt,
  FaEnvelope as FaEnvelopeIcon,
} from "react-icons/fa";
import styles from "./SurveyPage.module.css";

const ROLES = [
  {
    id: "hirer",
    label: "I want to hire",
    icon: <FaBuilding />,
    desc: "Post jobs, find workers",
  },
  {
    id: "worker",
    label: "I want to work",
    icon: <FaTools />,
    desc: "Find jobs, get paid",
  },
  { id: "both", label: "Both", icon: <FaUserTie />, desc: "Hire and work" },
];

const INDUSTRIES = [
  { id: "plumbing", label: "Plumbing", icon: <FaWrench />, color: "#3B82F6" },
  { id: "electrical", label: "Electrical", icon: <FaBolt />, color: "#F59E0B" },
  { id: "carpentry", label: "Carpentry", icon: <FaTools />, color: "#F97316" },
  { id: "cleaning", label: "Cleaning", icon: <FaHome />, color: "#10B981" },
  { id: "hvac", label: "HVAC", icon: <FaSnowflake />, color: "#06B6D4" },
  {
    id: "painting",
    label: "Painting",
    icon: <FaPaintBrush />,
    color: "#EC4899",
  },
  {
    id: "office",
    label: "Office/Admin",
    icon: <FaUserTie />,
    color: "#8B5CF6",
  },
  { id: "other", label: "Other", icon: <FaStar />, color: "#6B7280" },
];

const CONCERNS = [
  { id: "payment", label: "Payment security", icon: <FaMoneyBillWave /> },
  { id: "reliability", label: "Worker reliability", icon: <FaShieldAlt /> },
  { id: "finding", label: "Finding the right person", icon: <FaUser /> },
  { id: "payment_time", label: "Getting paid on time", icon: <FaClock /> },
  { id: "communication", label: "Poor communication", icon: <FaCommentDots /> },
  { id: "other", label: "Other", icon: <FaStar /> },
];

const EXPERIENCE_LEVELS = [
  { id: "beginner", label: "Beginner", icon: <FaFrown /> },
  { id: "intermediate", label: "Intermediate", icon: <FaMeh /> },
  { id: "expert", label: "Expert", icon: <FaSmile /> },
];

const HEAR_ABOUT = [
  { id: "google", label: "Google Search" },
  { id: "social", label: "Social Media" },
  { id: "friend", label: "Friend/Colleague" },
  { id: "ad", label: "Advertisement" },
  { id: "other", label: "Other" },
];

export default function SurveyPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [totalSteps] = useState(6);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [formData, setFormData] = useState({
    role: "",
    industry: "",
    experience: "",
    problem: "",
    feature: "",
    concern: "",
    hearAbout: "",
    email: "",
    name: "",
    phone: "",
    location: "",
    additionalFeedback: "",
    rating: 0,
  });

  // Load email from URL params if provided
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const email = params.get("email");
    if (email) {
      setFormData((prev) => ({ ...prev, email }));
    }
  }, []);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000/api"}/survey`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!res.ok) throw new Error("Failed to submit");

      setStatus("success");
      setMessage("🎉 Thank you! Your feedback will shape SkilledProz.");

      setTimeout(() => {
        navigate("/", { state: { surveyComplete: true } });
      }, 3000);
    } catch (err) {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return formData.role;
      case 2:
        return formData.industry;
      case 3:
        return formData.experience;
      case 4:
        return formData.problem.trim().length > 10;
      case 5:
        return formData.feature.trim().length > 10;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const progressPercentage = ((step - 1) / (totalSteps - 1)) * 100;

  return (
    <div className={styles.page}>
      {/* ── Header with Navigation ── */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <Link to="/" className={styles.logo}>
              Skilled<span>Proz</span>
            </Link>
            <span className={styles.headerDivider}>|</span>
            <span className={styles.headerTitle}>Survey</span>
          </div>

          <nav className={styles.nav}>
            <Link to="/" className={styles.navLink}>
              <FaHomeIcon /> Home
            </Link>
            <Link to="/about" className={styles.navLink}>
              <FaInfoCircle /> About
            </Link>
            <Link to="/contact" className={styles.navLink}>
              <FaPhoneAlt /> Contact
            </Link>
          </nav>

          <div className={styles.headerRight}>
            <span className={styles.stepIndicator}>
              Step {step} of {totalSteps}
            </span>
            <Link to="/register" className={styles.headerCta}>
              Join Now
            </Link>
          </div>
        </div>
      </header>

      {/* ── Progress Bar ── */}
      <div className={styles.progressContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* ── Main Content ── */}
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Status Messages */}
          {status === "success" && (
            <div className={styles.successMessage}>
              <FaCheckCircle className={styles.successIcon} />
              <h3>Survey Submitted!</h3>
              <p>{message}</p>
              <p className={styles.successSub}>Redirecting you back...</p>
            </div>
          )}

          {status === "error" && (
            <div className={styles.errorMessage}>
              <FaExclamationTriangle className={styles.errorIcon} />
              <h3>Something went wrong</h3>
              <p>{message}</p>
              <button
                className={styles.retryBtn}
                onClick={() => setStatus("idle")}
              >
                Try Again
              </button>
            </div>
          )}

          {status === "idle" && (
            <form onSubmit={handleSubmit} className={styles.form}>
              {/* ── Step 1: Role ── */}
              {step === 1 && (
                <div className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepBadge}>Step 1</span>
                    <h2 className={styles.stepTitle}>
                      What's your primary role?
                    </h2>
                    <p className={styles.stepDesc}>
                      Tell us how you plan to use SkilledProz
                    </p>
                  </div>

                  <div className={styles.optionsGrid}>
                    {ROLES.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        className={`${styles.optionCard} ${formData.role === role.id ? styles.selected : ""}`}
                        onClick={() => {
                          handleInputChange("role", role.id);
                          setTimeout(handleNext, 300);
                        }}
                      >
                        <span className={styles.optionIconLarge}>
                          {role.icon}
                        </span>
                        <span className={styles.optionLabel}>{role.label}</span>
                        <span className={styles.optionDesc}>{role.desc}</span>
                        {formData.role === role.id && (
                          <FaCheck className={styles.optionCheck} />
                        )}
                      </button>
                    ))}
                  </div>

                  <div className={styles.navButtons}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={() => navigate("/")}
                    >
                      <FaArrowLeft /> Back to Home
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Industry ── */}
              {step === 2 && (
                <div className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepBadge}>Step 2</span>
                    <h2 className={styles.stepTitle}>
                      What industry do you work in?
                    </h2>
                    <p className={styles.stepDesc}>
                      Select your primary trade or profession
                    </p>
                  </div>

                  <div className={styles.industryGrid}>
                    {INDUSTRIES.map((ind) => (
                      <button
                        key={ind.id}
                        type="button"
                        className={`${styles.industryCard} ${formData.industry === ind.id ? styles.selected : ""}`}
                        onClick={() => {
                          handleInputChange("industry", ind.id);
                          setTimeout(handleNext, 300);
                        }}
                        style={{
                          borderColor:
                            formData.industry === ind.id
                              ? ind.color
                              : undefined,
                          background:
                            formData.industry === ind.id
                              ? `${ind.color}15`
                              : undefined,
                        }}
                      >
                        <span
                          className={styles.industryIcon}
                          style={{ color: ind.color }}
                        >
                          {ind.icon}
                        </span>
                        <span className={styles.industryLabel}>
                          {ind.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.navButtons}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleBack}
                    >
                      <FaArrowLeft /> Back
                    </button>
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleNext}
                      disabled={!isStepValid()}
                    >
                      Next <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 3: Experience ── */}
              {step === 3 && (
                <div className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepBadge}>Step 3</span>
                    <h2 className={styles.stepTitle}>
                      What's your experience level?
                    </h2>
                    <p className={styles.stepDesc}>
                      How experienced are you in your profession?
                    </p>
                  </div>

                  <div className={styles.optionsGrid}>
                    {EXPERIENCE_LEVELS.map((exp) => (
                      <button
                        key={exp.id}
                        type="button"
                        className={`${styles.optionCard} ${formData.experience === exp.id ? styles.selected : ""}`}
                        onClick={() => {
                          handleInputChange("experience", exp.id);
                          setTimeout(handleNext, 300);
                        }}
                      >
                        <span className={styles.optionIconLarge}>
                          {exp.icon}
                        </span>
                        <span className={styles.optionLabel}>{exp.label}</span>
                      </button>
                    ))}
                  </div>

                  <div className={styles.navButtons}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleBack}
                    >
                      <FaArrowLeft /> Back
                    </button>
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleNext}
                      disabled={!isStepValid()}
                    >
                      Next <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 4: Problem ── */}
              {step === 4 && (
                <div className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepBadge}>Step 4</span>
                    <h2 className={styles.stepTitle}>
                      What's your biggest challenge?
                    </h2>
                    <p className={styles.stepDesc}>
                      Tell us about your main pain point when hiring or getting
                      hired
                    </p>
                  </div>

                  <textarea
                    className={styles.textarea}
                    placeholder="Describe your biggest challenge in detail..."
                    value={formData.problem}
                    onChange={(e) =>
                      handleInputChange("problem", e.target.value)
                    }
                    rows={6}
                    required
                  />
                  <div className={styles.charCount}>
                    {formData.problem.length} characters (minimum 10)
                  </div>

                  <div className={styles.navButtons}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleBack}
                    >
                      <FaArrowLeft /> Back
                    </button>
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleNext}
                      disabled={!isStepValid()}
                    >
                      Next <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 5: Feature ── */}
              {step === 5 && (
                <div className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepBadge}>Step 5</span>
                    <h2 className={styles.stepTitle}>
                      What feature would make you use SkilledProz daily?
                    </h2>
                    <p className={styles.stepDesc}>
                      Describe the one feature that would be a game-changer for
                      you
                    </p>
                  </div>

                  <textarea
                    className={styles.textarea}
                    placeholder="Describe the feature that would make you a daily user..."
                    value={formData.feature}
                    onChange={(e) =>
                      handleInputChange("feature", e.target.value)
                    }
                    rows={5}
                    required
                  />
                  <div className={styles.charCount}>
                    {formData.feature.length} characters (minimum 10)
                  </div>

                  <div className={styles.navButtons}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleBack}
                    >
                      <FaArrowLeft /> Back
                    </button>
                    <button
                      type="button"
                      className={styles.nextBtn}
                      onClick={handleNext}
                      disabled={!isStepValid()}
                    >
                      Next <FaArrowRight />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 6: Details & Submit ── */}
              {step === 6 && (
                <div className={styles.step}>
                  <div className={styles.stepHeader}>
                    <span className={styles.stepBadge}>Final Step</span>
                    <h2 className={styles.stepTitle}>Almost there!</h2>
                    <p className={styles.stepDesc}>
                      Help us understand your needs better
                    </p>
                  </div>

                  {/* Personal Details */}
                  <div className={styles.formGroup}>
                    <h4 className={styles.formGroupTitle}>Personal Details</h4>
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label>
                          <FaUser /> Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your name"
                          value={formData.name}
                          onChange={(e) =>
                            handleInputChange("name", e.target.value)
                          }
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>
                          <FaEnvelope /> Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="Enter your email"
                          value={formData.email}
                          onChange={(e) =>
                            handleInputChange("email", e.target.value)
                          }
                          className={styles.input}
                          required
                        />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formField}>
                        <label>
                          <FaPhone /> Phone Number
                        </label>
                        <input
                          type="tel"
                          placeholder="Enter your phone number"
                          value={formData.phone}
                          onChange={(e) =>
                            handleInputChange("phone", e.target.value)
                          }
                          className={styles.input}
                        />
                      </div>
                      <div className={styles.formField}>
                        <label>
                          <FaMapMarkerAlt /> Location
                        </label>
                        <input
                          type="text"
                          placeholder="City, Country"
                          value={formData.location}
                          onChange={(e) =>
                            handleInputChange("location", e.target.value)
                          }
                          className={styles.input}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Concerns */}
                  <div className={styles.formGroup}>
                    <h4 className={styles.formGroupTitle}>
                      What's your biggest concern?
                    </h4>
                    <div className={styles.concernOptions}>
                      {CONCERNS.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className={`${styles.concernChip} ${formData.concern === c.id ? styles.selected : ""}`}
                          onClick={() => {
                            if (formData.concern === c.id) {
                              handleInputChange("concern", "");
                            } else {
                              handleInputChange("concern", c.id);
                            }
                          }}
                        >
                          {c.icon} {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* How did you hear */}
                  <div className={styles.formGroup}>
                    <h4 className={styles.formGroupTitle}>
                      How did you hear about us?
                    </h4>
                    <div className={styles.hearOptions}>
                      {HEAR_ABOUT.map((h) => (
                        <button
                          key={h.id}
                          type="button"
                          className={`${styles.hearChip} ${formData.hearAbout === h.id ? styles.selected : ""}`}
                          onClick={() => {
                            if (formData.hearAbout === h.id) {
                              handleInputChange("hearAbout", "");
                            } else {
                              handleInputChange("hearAbout", h.id);
                            }
                          }}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Additional Feedback */}
                  <div className={styles.formGroup}>
                    <h4 className={styles.formGroupTitle}>
                      Anything else you'd like to share?
                    </h4>
                    <textarea
                      className={styles.textarea}
                      placeholder="Additional comments, suggestions, or feedback..."
                      value={formData.additionalFeedback}
                      onChange={(e) =>
                        handleInputChange("additionalFeedback", e.target.value)
                      }
                      rows={3}
                    />
                  </div>

                  <div className={styles.navButtons}>
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={handleBack}
                    >
                      <FaArrowLeft /> Back
                    </button>
                    <button
                      type="submit"
                      className={styles.submitBtn}
                      disabled={status === "submitting" || !formData.email}
                    >
                      {status === "submitting" ? (
                        <>
                          <FaSpinner className={styles.spinner} /> Submitting...
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
      </main>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.footerBrand}>
            <Link to="/" className={styles.footerLogo}>
              Skilled<span>Proz</span>
            </Link>
            <p>Building the future of work, together.</p>
          </div>
          <div className={styles.footerLinks}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/contact">
              <FaEnvelopeIcon /> Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
