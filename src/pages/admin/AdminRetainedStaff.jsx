import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminRetainedStaff.module.css";
import { FiUsers, FiDollarSign, FiRefreshCw, FiSearch } from "react-icons/fi";
import { retainedStaffApi } from "../../lib/etainedStaffApi";

export default function AdminRetainedStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadStaff = () => {
    setLoading(true);
    retainedStaffApi
      .adminListStaff({ page, limit: 20, search })
      .then((res) => {
        setStaff(res.data.data.staff);
        setTotalPages(res.data.data.meta.pages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadStaff();
  }, [page, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    loadStaff();
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Retained Staff (Global)</h1>
            <p className={styles.subtitle}>
              Manage all active and inactive payroll memberships across the
              platform.
            </p>
          </div>
          <button
            className={styles.refreshBtn}
            onClick={loadStaff}
            disabled={loading}
          >
            <FiRefreshCw className={loading ? styles.spinning : ""} /> Refresh
          </button>
        </div>

        <div className={styles.toolbar}>
          <form className={styles.searchForm} onSubmit={handleSearch}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search by worker, hirer, or job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </form>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Worker</th>
                <th>Hirer</th>
                <th>Job Title</th>
                <th>Pay Rate</th>
                <th>Frequency</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className={styles.center}>
                    Loading...
                  </td>
                </tr>
              ) : staff.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.center}>
                    No staff found.
                  </td>
                </tr>
              ) : (
                staff.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {s.worker.avatar ? (
                            <img src={s.worker.avatar} alt="" />
                          ) : (
                            s.worker.firstName[0]
                          )}
                        </div>
                        <div>
                          <p className={styles.name}>
                            {s.worker.firstName} {s.worker.lastName}
                          </p>
                          <p className={styles.email}>{s.worker.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.userCell}>
                        <div className={styles.avatar}>
                          {s.hirer.avatar ? (
                            <img src={s.hirer.avatar} alt="" />
                          ) : (
                            s.hirer.firstName[0]
                          )}
                        </div>
                        <div>
                          <p className={styles.name}>
                            {s.hirer.firstName} {s.hirer.lastName}
                          </p>
                          <p className={styles.email}>{s.hirer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className={styles.role}>{s.jobTitle}</p>
                      <p className={styles.dept}>{s.department || "—"}</p>
                    </td>
                    <td className={styles.amount}>
                      {s.currency} {s.payRate.toLocaleString()}
                    </td>
                    <td>
                      <span className={styles.freqBadge}>
                        {s.payFrequency.replace("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.status} ${styles[s.status.toLowerCase()]}`}
                      >
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </button>
            <span>
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
