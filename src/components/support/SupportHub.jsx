// src/pages/support/SupportHub.jsx
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FiPlus,
  FiFileText,
  FiClock,
  FiChevronRight,
  FiX,
  FiUploadCloud,
} from "react-icons/fi";
import { useAuthStore } from "../../store/authStore";
import HirerLayout from "../../components/layout/HirerLayout";
import WorkerLayout from "../../components/layout/WorkerLayout";
import { supportApi } from "../../lib/supportApi";
import styles from "./SupportHub.module.css";

const CATEGORIES = [
  { value: "ACCOUNT", label: "Account & Login" },
  { value: "PAYMENT", label: "Payments & Billing" },
  { value: "BOOKING", label: "Bookings & Jobs" },
  { value: "TECHNICAL", label: "Technical Bug" },
  { value: "VERIFICATION", label: "Verification" },
  { value: "WITHDRAWAL", label: "Withdrawals" },
  { value: "OTHER", label: "Other" },
];

export default function SupportHub() {
  const { user } = useAuthStore();
  const Layout = user?.role === "HIRER" ? HirerLayout : WorkerLayout;

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Create Ticket Form State
  const [formData, setFormData] = useState({
    category: "TECHNICAL",
    subject: "",
    description: "",
  });
  const [files, setFiles] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    try {
      const res = await supportApi.getMyTickets();
      setTickets(res.data.tickets || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const data = new FormData();
      data.append("category", formData.category);
      data.append("subject", formData.subject);
      data.append("description", formData.description);

      files.forEach((file) => {
        data.append("attachments", file);
      });

      await supportApi.createTicket(data);

      // Reset and refresh
      setIsModalOpen(false);
      setFormData({ category: "TECHNICAL", subject: "", description: "" });
      setFiles([]);
      fetchTickets();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "OPEN":
        return <span className={`${styles.badge} ${styles.open}`}>Open</span>;
      case "IN_PROGRESS":
        return (
          <span className={`${styles.badge} ${styles.progress}`}>
            In Progress
          </span>
        );
      case "WAITING_USER":
        return (
          <span className={`${styles.badge} ${styles.waiting}`}>
            Action Needed
          </span>
        );
      case "RESOLVED":
        return (
          <span className={`${styles.badge} ${styles.resolved}`}>Resolved</span>
        );
      case "CLOSED":
        return (
          <span className={`${styles.badge} ${styles.closed}`}>Closed</span>
        );
      default:
        return <span className={styles.badge}>{status}</span>;
    }
  };

  return (
    <Layout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Support Hub</h1>
            <p>View your past tickets or open a new one for detailed issues.</p>
          </div>
          <button
            className={styles.createBtn}
            onClick={() => setIsModalOpen(true)}
          >
            <FiPlus /> New Ticket
          </button>
        </div>

        {loading ? (
          <div className={styles.ticketList}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard} />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className={styles.emptyState}>
            <FiFileText size={48} />
            <h3>No tickets yet</h3>
            <p>
              Need help with something? Open a ticket and our team will get back
              to you.
            </p>
          </div>
        ) : (
          <div className={styles.ticketList}>
            {tickets.map((t) => (
              <Link
                to={`/support/ticket/${t.id}`}
                key={t.id}
                className={styles.ticketCard}
              >
                <div className={styles.ticketIcon}>
                  <FiFileText size={20} />
                </div>
                <div className={styles.ticketInfo}>
                  <div className={styles.ticketTop}>
                    <span className={styles.ticketNumber}>
                      {t.ticketNumber}
                    </span>
                    {getStatusBadge(t.status)}
                  </div>
                  <h3 className={styles.ticketSubject}>{t.subject}</h3>
                  <div className={styles.ticketMeta}>
                    <span>
                      <FiClock size={12} />{" "}
                      {new Date(t.createdAt).toLocaleDateString()}
                    </span>
                    <span className={styles.category}>
                      {t.category.replace("_", " ")}
                    </span>
                  </div>
                </div>
                <FiChevronRight className={styles.chevron} />
              </Link>
            ))}
          </div>
        )}

        {/* ── Create Ticket Modal ── */}
        {isModalOpen && (
          <div
            className={styles.modalOverlay}
            onClick={() => setIsModalOpen(false)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Create Support Ticket</h2>
                <button onClick={() => setIsModalOpen(false)}>
                  <FiX size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className={styles.form}>
                {error && <div className={styles.errorBox}>{error}</div>}

                <div className={styles.field}>
                  <label>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={styles.field}>
                  <label>Subject</label>
                  <input
                    type="text"
                    required
                    minLength={4}
                    placeholder="Brief summary of the issue"
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label>Description</label>
                  <textarea
                    required
                    minLength={10}
                    rows={5}
                    placeholder="Please provide as much detail as possible..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>

                <div className={styles.field}>
                  <label>Attachments (Images, PDFs, Videos)</label>
                  <div className={styles.uploadBox}>
                    <FiUploadCloud size={24} />
                    <span>Click to upload files</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,video/mp4,video/webm,video/quicktime"
                      onChange={(e) => setFiles(Array.from(e.target.files))}
                    />
                  </div>
                  {files.length > 0 && (
                    <div className={styles.fileList}>
                      {files.map((f, i) => (
                        <div key={i} className={styles.fileItem}>
                          {f.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.modalFooter}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitBtn}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Creating..." : "Submit Ticket"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
