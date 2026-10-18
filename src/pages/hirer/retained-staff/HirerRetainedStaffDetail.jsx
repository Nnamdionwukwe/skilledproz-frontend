import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import styles from "./HirerRetainedStaff.module.css";
import {
  FiClock,
  FiFileText,
  FiBookOpen,
  FiPauseCircle,
  FiPlayCircle,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

export default function HirerRetainedStaffDetail() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [tab, setTab] = useState("payroll"); // payroll | documents | notes

  const loadData = () => {
    retainedStaffApi.getStaff(id).then((res) => {
      setMember(res.data.data.member);
      setCycles(res.data.data.recentCycles || []);
    });
  };

  useEffect(() => {
    loadData();
  }, [id]);

  if (!member)
    return (
      <HirerLayout>
        <p>Loading...</p>
      </HirerLayout>
    );

  return (
    <HirerLayout>
      <div className={styles.page}>
        <Link to="/dashboard/hirer/retained-staff" className={styles.backLink}>
          ← Back to Staff
        </Link>

        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>
            {member.worker.avatar ? (
              <img src={member.worker.avatar} alt="" />
            ) : (
              "?"
            )}
          </div>
          <div>
            <h1>
              {member.worker.firstName} {member.worker.lastName}
            </h1>
            <p>
              {member.jobTitle} · {member.department || "General"}
            </p>
          </div>
          <div className={styles.profileActions}>
            {member.status === "ACTIVE" ? (
              <button
                className={styles.btnSecondary}
                onClick={() => retainedStaffApi.pauseStaff(id).then(loadData)}
              >
                <FiPauseCircle /> Pause
              </button>
            ) : (
              <button
                className={styles.btnSecondary}
                onClick={() => retainedStaffApi.resumeStaff(id).then(loadData)}
              >
                <FiPlayCircle /> Resume
              </button>
            )}
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={tab === "payroll" ? styles.tabActive : styles.tab}
            onClick={() => setTab("payroll")}
          >
            Payroll
          </button>
          <button
            className={tab === "documents" ? styles.tabActive : styles.tab}
            onClick={() => setTab("documents")}
          >
            Documents
          </button>
          <button
            className={tab === "notes" ? styles.tabActive : styles.tab}
            onClick={() => setTab("notes")}
          >
            HR Notes
          </button>
        </div>

        {tab === "payroll" && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3>Recent Cycles</h3>
              <button
                className={styles.btnPrimary}
                onClick={() => alert("Open Create Cycle Modal")}
              >
                Create Cycle
              </button>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cycles.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {new Date(c.periodStart).toLocaleDateString()} -{" "}
                      {new Date(c.periodEnd).toLocaleDateString()}
                    </td>
                    <td>
                      {c.currency} {c.netAmount.toLocaleString()}
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${styles[c.status.toLowerCase()]}`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`/dashboard/hirer/retained-staff/${id}/cycles/${c.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </HirerLayout>
  );
}
