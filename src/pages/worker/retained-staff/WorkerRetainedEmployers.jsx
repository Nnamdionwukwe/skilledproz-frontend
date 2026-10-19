// src/pages/worker/retained-staff/WorkerRetainedEmployers.jsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import WorkerLayout from "../../../components/layout/WorkerLayout";
import styles from "./WorkerRetainedStaff.module.css";
import { FiBriefcase, FiChevronRight, FiUser, FiLoader } from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

export default function WorkerRetainedEmployers() {
  const [employers, setEmployers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    retainedStaffApi
      .listMyEmployers()
      .then((res) => {
        setEmployers(res.data.data.employers || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <WorkerLayout>
        <div className={styles.page}>
          <div className={styles.header}>
            <h1 className={styles.title}>My Employers</h1>
            <p className={styles.subtitle}>Loading your payroll details...</p>
          </div>
          <div className={styles.grid}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${styles.skeleton} ${styles.skeletonCard}`}
              />
            ))}
          </div>
        </div>
      </WorkerLayout>
    );
  }

  return (
    <WorkerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>My Employers</h1>
          <p className={styles.subtitle}>
            Companies you are currently retained by
          </p>
        </div>

        {employers.length === 0 ? (
          <div className={styles.emptyState}>
            <FiBriefcase size={48} />
            <h3>No active employers</h3>
            <p>
              You are not currently on any employer's payroll. When a hirer adds
              you to their retained staff, they will appear here.
            </p>
          </div>
        ) : (
          <div className={styles.grid}>
            {employers.map((emp) => (
              <Link
                to={`/dashboard/worker/employers/${emp.id}`}
                key={emp.id}
                className={styles.card}
              >
                <div className={styles.cardHeader}>
                  <h3>{emp.jobTitle}</h3>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[emp.status.toLowerCase()] || ""
                    }`}
                  >
                    {emp.status}
                  </span>
                </div>
                <p className={styles.cardSub}>
                  <FiUser size={12} />
                  {emp.hirer?.firstName} {emp.hirer?.lastName}
                </p>

                <div className={styles.cardStats}>
                  <div>
                    <span className={styles.statLabel}>Pay Rate</span>
                    <span className={styles.statVal}>
                      {emp.currency} {emp.payRate?.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className={styles.statLabel}>Lifetime Earned</span>
                    <span className={styles.statVal}>
                      {emp.currency} {emp.lifetimeEarned?.toLocaleString() || 0}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </WorkerLayout>
  );
}
