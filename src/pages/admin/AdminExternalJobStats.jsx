import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";
import s from "./AdminExternalJobStats.module.css";

export default function AdminExternalJobStats() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [job, setJob] = useState(null);
  const [stats, setStats] = useState(null);

  // src/pages/admin/AdminExternalJobStats.jsx
  useEffect(() => {
    api
      .get(`/admin/external/jobs/${id}/stats`) // ← corrected path
      .then((res) => {
        const { job, stats } = res.data.data;
        setJob(job);
        setStats(stats);
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Failed to load stats");
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className={s.loader}>Loading stats…</div>;
  if (error) return <div className={s.error}>{error}</div>;
  if (!stats) return <div className={s.error}>No data available</div>;

  return (
    <div className={s.page}>
      <div className={s.header}>
        <h1 className={s.title}>Job Click Analytics</h1>
        <Link to="/admin/external/jobs" className={s.backLink}>
          ← Back to jobs
        </Link>
      </div>

      <div className={s.jobInfo}>
        <h2>{job.title}</h2>
        <p className={s.company}>{job.companyName}</p>
      </div>

      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <span className={s.statLabel}>Apply Clicks</span>
          <span className={s.statValue}>{stats.totalApplyClicks}</span>
          <span className={s.statSub}>
            {stats.uniqueApplyUsers} unique users
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Proceed Clicks</span>
          <span className={s.statValue}>{stats.totalProceedClicks}</span>
          <span className={s.statSub}>
            {stats.uniqueProceedUsers} unique users
          </span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Users Who Did Both</span>
          <span className={s.statValue}>{stats.uniqueBothUsers}</span>
          <span className={s.statSub}>applied & proceeded</span>
        </div>
        <div className={s.statCard}>
          <span className={s.statLabel}>Apply Only</span>
          <span className={s.statValue}>
            {stats.uniqueApplyUsers - stats.uniqueBothUsers}
          </span>
          <span className={s.statSub}>did not proceed</span>
        </div>
      </div>

      <div className={s.tableWrapper}>
        <h3>User Activity</h3>
        <table className={s.userTable}>
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Apply Click</th>
              <th>Proceed Click</th>
            </tr>
          </thead>
          <tbody>
            {stats.users.length === 0 ? (
              <tr>
                <td colSpan="4" className={s.noData}>
                  No activity yet
                </td>
              </tr>
            ) : (
              stats.users.map(({ user, actions }) => (
                <tr key={user.id}>
                  <td>
                    {user.firstName} {user.lastName}
                  </td>
                  <td>{user.email}</td>
                  <td>{actions.applied ? "✅" : "❌"}</td>
                  <td>{actions.proceeded ? "✅" : "❌"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
