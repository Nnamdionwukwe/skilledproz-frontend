import { useState, useEffect, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import Skeleton from "../../../components/common/Skeleton";
import CreateCycleModal from "./CreateCycleModal";
import styles from "./HirerRetainedStaff.module.css";
import {
  FiArrowLeft,
  FiUser,
  FiClock,
  FiFileText,
  FiBookOpen,
  FiPauseCircle,
  FiPlayCircle,
  FiPlus,
  FiAlertCircle,
  FiDollarSign,
  FiChevronRight,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function HirerRetainedStaffDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [member, setMember] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cyclesLoading, setCyclesLoading] = useState(false);
  const [tab, setTab] = useState("payroll");
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const loadMember = useCallback(() => {
    setLoading(true);
    retainedStaffApi
      .getStaff(id)
      .then((res) => {
        setMember(res.data.data.member);
        setCycles(res.data.data.recentCycles || []);
      })
      .catch((err) =>
        setError(err.response?.data?.message || "Failed to load staff member"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  const loadCycles = useCallback(() => {
    setCyclesLoading(true);
    retainedStaffApi
      .listCycles(id, { limit: 30 })
      .then((res) => setCycles(res.data.data.cycles))
      .catch(() => {})
      .finally(() => setCyclesLoading(false));
  }, [id]);

  useEffect(() => {
    loadMember();
  }, [loadMember]);

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await retainedStaffApi.pauseStaff(id, "Paused from staff detail");
      loadMember();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to pause");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await retainedStaffApi.resumeStaff(id);
      loadMember();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resume");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <Skeleton width={160} height={16} style={{ marginBottom: 16 }} />
          <div className={styles.profileHeaderSkeleton}>
            <Skeleton.Circle size={80} />
            <div style={{ flex: 1 }}>
              <Skeleton width="40%" height={22} style={{ marginBottom: 8 }} />
              <Skeleton width="60%" height={14} />
            </div>
          </div>
          <Skeleton.Table rows={4} cols={4} />
        </div>
      </HirerLayout>
    );
  }

  if (error || !member) {
    return (
      <HirerLayout>
        <div className={styles.page}>
          <div className={styles.emptyState}>
            <FiAlertCircle size={48} />
            <h3>{error || "Staff member not found"}</h3>
            <Link
              to="/dashboard/hirer/retained-staff/staff"
              className={styles.backLink}
            >
              <FiArrowLeft /> Back to Staff
            </Link>
          </div>
        </div>
      </HirerLayout>
    );
  }

  return (
    <HirerLayout>
      <div className={styles.page}>
        <Link
          to="/dashboard/hirer/retained-staff/staff"
          className={styles.backLink}
        >
          <FiArrowLeft /> Back to Staff
        </Link>

        {error && (
          <div className={styles.errorBanner}>
            <FiAlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Profile header */}
        <div className={styles.profileHeader}>
          <div className={styles.profileAvatar}>
            {member.worker.avatar ? (
              <img src={member.worker.avatar} alt="" />
            ) : (
              <FiUser size={24} />
            )}
          </div>
          <div className={styles.profileInfo}>
            <h1>
              {member.worker.firstName} {member.worker.lastName}
            </h1>
            <p>
              {member.jobTitle}
              {member.department && ` · ${member.department}`}
            </p>
            <span
              className={`${styles.statusPill} ${
                styles[`status${member.status}`]
              }`}
            >
              {member.status}
            </span>
          </div>
          <div className={styles.profileActions}>
            {member.status === "ACTIVE" && (
              <button
                className={styles.btnSecondary}
                onClick={handlePause}
                disabled={actionLoading}
              >
                <FiPauseCircle /> Pause
              </button>
            )}
            {member.status === "PAUSED" && (
              <button
                className={styles.btnSecondary}
                onClick={handleResume}
                disabled={actionLoading}
              >
                <FiPlayCircle /> Resume
              </button>
            )}
            <button
              className={styles.btnPrimary}
              onClick={() => setShowCycleModal(true)}
            >
              <FiPlus /> Create Cycle
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statIcon}>
              <FiDollarSign />
            </div>
            <div>
              <p className={styles.statLabel}>Pay Rate</p>
              <p className={styles.statValue}>
                {formatMoney(member.payRate, member.currency)}
              </p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.green}`}>
              <FiClock />
            </div>
            <div>
              <p className={styles.statLabel}>Lifetime Paid</p>
              <p className={styles.statValue}>
                {formatMoney(member.totalPaidLifetime, member.currency)}
              </p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.orange}`}>
              <FiDollarSign />
            </div>
            <div>
              <p className={styles.statLabel}>Held in Escrow</p>
              <p className={styles.statValue}>
                {formatMoney(member.totalHeld, member.currency)}
              </p>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.yellow}`}>
              <FiClock />
            </div>
            <div>
              <p className={styles.statLabel}>Next Cycle</p>
              <p className={styles.statValue}>
                {member.nextCycleAt ? formatDate(member.nextCycleAt) : "—"}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={tab === "payroll" ? styles.tabActive : styles.tab}
            onClick={() => setTab("payroll")}
          >
            <FiClock size={14} /> Payroll
          </button>
          <button
            className={tab === "documents" ? styles.tabActive : styles.tab}
            onClick={() => setTab("documents")}
          >
            <FiFileText size={14} /> Documents
          </button>
          <button
            className={tab === "notes" ? styles.tabActive : styles.tab}
            onClick={() => setTab("notes")}
          >
            <FiBookOpen size={14} /> HR Notes
          </button>
        </div>

        {/* Payroll tab */}
        {tab === "payroll" && (
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Recent Cycles</h3>
              <button
                className={styles.btnSmall}
                onClick={() => setShowCycleModal(true)}
              >
                <FiPlus size={12} /> Create Cycle
              </button>
            </div>

            {cyclesLoading ? (
              <Skeleton.Table rows={5} cols={5} />
            ) : cycles.length === 0 ? (
              <div className={styles.emptyPanel}>
                <FiClock size={32} />
                <p>No cycles yet. Create your first cycle above.</p>
              </div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Period</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cycles.map((cycle) => (
                      <tr key={cycle.id}>
                        <td>
                          <p className={styles.tableName}>
                            {formatDate(cycle.periodStart)} —{" "}
                            {formatDate(cycle.periodEnd)}
                          </p>
                          <p className={styles.tableSub}>{cycle.label}</p>
                        </td>
                        <td>
                          <p className={styles.tableSub}>
                            {cycle.type.replace("_", " ")}
                          </p>
                        </td>
                        <td>
                          <p className={styles.amountCell}>
                            {formatMoney(cycle.netAmount, cycle.currency)}
                          </p>
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${
                              styles[cycle.status.toLowerCase()] || ""
                            }`}
                          >
                            {cycle.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/dashboard/hirer/retained-staff/${id}/cycles/${cycle.id}`}
                            className={styles.viewBtn}
                          >
                            <FiChevronRight />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Documents tab */}
        {tab === "documents" && (
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>Employment Documents</h3>
            {!member.documents || member.documents.length === 0 ? (
              <div className={styles.emptyPanel}>
                <FiFileText size={32} />
                <p>No documents uploaded yet.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {member.documents.map((doc) => (
                  <div key={doc.id} className={styles.listItem}>
                    <FiFileText />
                    <div style={{ flex: 1 }}>
                      <p className={styles.listName}>{doc.title}</p>
                      <p className={styles.listSub}>
                        {doc.type} · {formatDate(doc.createdAt)}
                      </p>
                    </div>
                    <a
                      href={doc.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.viewDocLink}
                    >
                      View
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Notes tab */}
        {tab === "notes" && (
          <div className={styles.panel}>
            <h3 className={styles.panelTitle}>HR Notes</h3>
            {!member.staffNotes || member.staffNotes.length === 0 ? (
              <div className={styles.emptyPanel}>
                <FiBookOpen size={32} />
                <p>No HR notes yet.</p>
              </div>
            ) : (
              <div className={styles.list}>
                {member.staffNotes.map((note) => (
                  <div key={note.id} className={styles.listItem}>
                    <div style={{ flex: 1 }}>
                      <p className={styles.listName}>{note.title}</p>
                      <p className={styles.listSub}>{note.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateCycleModal
        isOpen={showCycleModal}
        onClose={() => setShowCycleModal(false)}
        onSuccess={(cycle) => {
          loadMember();
          navigate(`/dashboard/hirer/retained-staff/${id}/cycles/${cycle.id}`);
        }}
        member={member}
      />
    </HirerLayout>
  );
}
