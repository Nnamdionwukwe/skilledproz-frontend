// src/pages/hirer/retained-staff/HirerRetainedStaffList.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import HirerLayout from "../../../components/layout/HirerLayout";
import Skeleton from "../../../components/common/Skeleton";
import AddStaffModal from "./AddStaffModal";
import styles from "./HirerRetainedStaff.module.css";
import {
  FiUser,
  FiPlus,
  FiChevronRight,
  FiSearch,
  FiArrowLeft,
} from "react-icons/fi";
import { retainedStaffApi } from "../../../lib/etainedStaffApi";

function formatMoney(amount, currency = "NGN") {
  if (amount == null) return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export default function HirerRetainedStaffList() {
  const navigate = useNavigate();
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const loadStaff = () => {
    setLoading(true);
    retainedStaffApi
      .listStaff({
        status: statusFilter || undefined,
        search: search || undefined,
      })
      .then((res) => setStaff(res.data.data.staff))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    loadStaff();
  };

  return (
    <HirerLayout>
      <div className={styles.page}>
        {/* ✅ Back Button */}
        <Link to="/dashboard/hirer/retained-staff" className={styles.backLink}>
          <FiArrowLeft /> Back to Payroll Dashboard
        </Link>

        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Retained Staff</p>
            <h1 className={styles.title}>My Staff</h1>
            <p className={styles.subtitle}>
              {staff.length} {staff.length === 1 ? "member" : "members"} on
              payroll
            </p>
          </div>
          <button
            className={styles.btnPrimary}
            onClick={() => setShowAdd(true)}
          >
            <FiPlus /> Add Staff
          </button>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <div className={styles.filterTabs}>
            {[
              { value: "", label: "All" },
              { value: "ACTIVE", label: "Active" },
              { value: "PAUSED", label: "Paused" },
              { value: "ENDED", label: "Ended" },
            ].map((t) => (
              <button
                key={t.value}
                className={`${styles.filterTab} ${
                  statusFilter === t.value ? styles.filterTabActive : ""
                }`}
                onClick={() => setStatusFilter(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <form className={styles.searchForm} onSubmit={handleSearch}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by name, role, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        {/* Grid */}
        {loading ? (
          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton.Card key={i} height={180} />
            ))}
          </div>
        ) : staff.length === 0 ? (
          <div className={styles.emptyState}>
            <FiUser size={48} />
            <h3>No staff yet</h3>
            <p>
              Add your first worker to your payroll and start managing their
              recurring payouts.
            </p>
            <button
              className={styles.btnPrimary}
              onClick={() => setShowAdd(true)}
              style={{ marginTop: "1rem" }}
            >
              <FiPlus /> Add Staff Member
            </button>
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
                    {formatMoney(member.payRate, member.currency)} /{" "}
                    {member.payFrequency.toLowerCase().replace("_", " ")}
                  </p>
                </div>
                <div className={styles.cardRight}>
                  <span
                    className={`${styles.statusPill} ${
                      styles[`status${member.status}`]
                    }`}
                  >
                    {member.status}
                  </span>
                  <FiChevronRight className={styles.cardArrow} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <AddStaffModal
        isOpen={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(member) => {
          loadStaff();
          navigate(`/dashboard/hirer/retained-staff/${member.id}`);
        }}
      />
    </HirerLayout>
  );
}
