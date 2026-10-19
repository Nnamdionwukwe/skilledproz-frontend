// src/pages/worker/retained-staff/WorkerEmployerDetail.jsx
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import styles from "./WorkerRetainedStaff.module.css";
import {
  FiArrowLeft,
  FiBriefcase,
  FiMapPin,
  FiClock,
  FiUser,
  FiDollarSign,
  FiFileText,
  FiGlobe,
  FiCheckCircle,
  FiInfo,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

function DetailItem({ icon, label, value }) {
  if (!value) return null;
  return (
    <div className={styles.detailItem}>
      <span className={styles.detailIcon}>{icon}</span>
      <div>
        <p className={styles.detailLabel}>{label}</p>
        <p className={styles.detailValue}>{value}</p>
      </div>
    </div>
  );
}

export default function WorkerEmployerDetail() {
  const { memberId } = useParams();
  const [member, setMember] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    retainedStaffApi
      .getMyEmployment(memberId)
      .then((res) => {
        setMember(res.data.data.member);
        setCycles(res.data.data.cycles || []);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || "Could not load employment details.",
        );
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  if (loading) {
    return (
      <WorkerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <Link to="/dashboard/worker/employers" className={styles.backLink}>
              <FiArrowLeft /> Back to Employers
            </Link>
            <div className={styles.skeletonTitle} />
          </div>
          <div className={styles.skeletonContent} />
        </div>
      </WorkerLayout>
    );
  }

  if (error || !member) {
    return (
      <WorkerLayout>
        <div className={styles.page}>
          <Link to="/dashboard/worker/employers" className={styles.backLink}>
            <FiArrowLeft /> Back to Employers
          </Link>
          <div className={styles.errorState}>
            <p>{error || "Employment record not found."}</p>
          </div>
        </div>
      </WorkerLayout>
    );
  }

  // Calculate financials from cycles
  const lifetimeEarned = cycles
    .filter((c) => c.status === "RELEASED")
    .reduce((sum, c) => sum + (c._sum.workerPayout || 0), 0);

  const inEscrow = cycles
    .filter((c) => c.status === "HELD")
    .reduce((sum, c) => sum + (c._sum.workerPayout || 0), 0);

  return (
    <WorkerLayout>
      <div className={styles.page}>
        {/* Header */}
        <div className={styles.header}>
          <Link to="/dashboard/worker/employers" className={styles.backLink}>
            <FiArrowLeft /> Back to Employers
          </Link>
          <div className={styles.titleRow}>
            <div>
              <h1 className={styles.title}>{member.jobTitle}</h1>
              <p className={styles.subtitle}>
                {member.hirer?.hirerProfile?.companyName ||
                  `${member.hirer?.firstName} ${member.hirer?.lastName}`}
              </p>
            </div>
            <span
              className={`${styles.statusBadge} ${styles[member.status.toLowerCase()] || ""}`}
            >
              {member.status}
            </span>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Base Pay Rate</p>
            <h2 className={styles.statValue}>
              {member.currency} {member.payRate?.toLocaleString()}
            </h2>
            <p className={styles.statSub}>{member.payFrequency}</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>Lifetime Earned</p>
            <h2 className={styles.statValue} style={{ color: "var(--green)" }}>
              {member.currency} {lifetimeEarned.toLocaleString()}
            </h2>
            <p className={styles.statSub}>From released cycles</p>
          </div>
          <div className={styles.statCard}>
            <p className={styles.statLabel}>In Escrow</p>
            <h2 className={styles.statValue} style={{ color: "var(--blue)" }}>
              {member.currency} {inEscrow.toLocaleString()}
            </h2>
            <p className={styles.statSub}>Pending release</p>
          </div>
        </div>

        {/* Employment Details Section */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Employment Details</h3>
          <div className={styles.detailGrid}>
            <DetailItem
              icon={<FiUser />}
              label="Employer"
              value={`${member.hirer?.firstName} ${member.hirer?.lastName}`}
            />
            <DetailItem
              icon={<FiBriefcase />}
              label="Employment Type"
              value={member.employmentType?.replace("_", " ")}
            />
            <DetailItem
              icon={<FiBriefcase />}
              label="Department"
              value={member.department}
            />
            <DetailItem
              icon={<FiBriefcase />}
              label="Employee #"
              value={member.employeeNumber}
            />
            <DetailItem
              icon={<FiUser />}
              label="Manager"
              value={member.managerName}
            />
            <DetailItem
              icon={<FiGlobe />}
              label="Location Type"
              value={member.locationType?.replace("_", " ")}
            />
            {member.locationType !== "REMOTE" && (
              <DetailItem
                icon={<FiMapPin />}
                label="Work Location"
                value={member.location}
              />
            )}
          </div>
        </div>

        {/* Schedule Section */}
        <div className={styles.sectionCard}>
          <h3 className={styles.sectionTitle}>Working Schedule</h3>
          <div className={styles.detailGrid}>
            <DetailItem
              icon={<FiClock />}
              label="Work Days"
              value={member.workDays?.join(", ")}
            />
            <DetailItem
              icon={<FiClock />}
              label="Working Hours"
              value={
                member.workStart && member.workEnd
                  ? `${member.workStart} — ${member.workEnd} (${member.timezone})`
                  : null
              }
            />
          </div>
        </div>

        {/* Notes (Public only) */}
        {member.staffNotes?.length > 0 && (
          <div className={styles.sectionCard}>
            <h3 className={styles.sectionTitle}>Notes from Employer</h3>
            <div className={styles.notesList}>
              {member.staffNotes.map((note) => (
                <div key={note.id} className={styles.noteItem}>
                  <div className={styles.noteHeader}>
                    <span className={styles.noteCategory}>{note.category}</span>
                    <span className={styles.noteDate}>
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className={styles.noteBody}>{note.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contact Hirer Card */}
        <div className={styles.actionCard}>
          <div>
            <h3 className={styles.actionTitle}>Need to reach out?</h3>
            <p className={styles.actionDesc}>
              Message your employer directly for any questions.
            </p>
          </div>
          <Link
            to={`/messages?with=${member.hirer?.id}`}
            className={styles.messageBtn}
          >
            Send Message
          </Link>
        </div>
      </div>
    </WorkerLayout>
  );
}
