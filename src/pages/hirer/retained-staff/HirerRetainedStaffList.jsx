import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import styles from "./HirerRetainedStaff.module.css";
import { FiUser, FiChevronRight } from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

export default function HirerRetainedStaffList() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    retainedStaffApi
      .listStaff()
      .then((res) => setStaff(res.data.data.staff))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <HirerLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Retained Staff</p>
            <h1 className={styles.title}>My Staff</h1>
          </div>
          <Link
            to="/dashboard/hirer/retained-staff/new"
            className={styles.btnPrimary}
          >
            Add New
          </Link>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : staff.length === 0 ? (
          <div className={styles.emptyState}>
            <FiUser size={48} />
            <h3>No staff added yet</h3>
            <p>Add your first worker to start managing their payroll.</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {staff.map((member) => (
              <Link
                to={`/dashboard/hirer/retained-staff/${member.id}`}
                key={member.id}
                className={styles.card}
              >
                <div className={styles.cardAvatar}>
                  {member.worker.avatar ? (
                    <img src={member.worker.avatar} alt="" />
                  ) : (
                    <FiUser />
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <h3>
                    {member.worker.firstName} {member.worker.lastName}
                  </h3>
                  <p>{member.jobTitle}</p>
                  <p className={styles.cardRate}>
                    {member.currency} {member.payRate.toLocaleString()} /{" "}
                    {member.payFrequency.toLowerCase()}
                  </p>
                </div>
                <FiChevronRight className={styles.cardArrow} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
