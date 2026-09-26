import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminAnalytics.module.css";
import { FiUsers, FiTarget, FiRefreshCw, FiChevronRight } from "react-icons/fi";
import analyticsApi from "../../lib/analytics/analyticsApi";
import { fmtFull, timeAgo } from "../../lib/analytics/formatUtils";

export default function AdminSegments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [members, setMembers] = useState(null);
  const [membersLoading, setMembersLoading] = useState(false);

  const loadSegments = useCallback(() => {
    setLoading(true);
    analyticsApi
      .listSegments()
      .then((r) => setSegments(r.data?.data?.segments || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSegments();
  }, [loadSegments]);

  const openSegment = (segment) => {
    setSelected(segment);
    setMembersLoading(true);
    analyticsApi
      .segmentUsers(segment.key)
      .then((r) => setMembers(r.data.data))
      .catch(console.error)
      .finally(() => setMembersLoading(false));
  };

  const memberList = members?.members || [];
  const memberTotal = members?.total ?? 0;
  const safeSegments = segments || [];

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <p className={styles.eyebrow}>Targeting</p>
            <h1 className={styles.pageTitle}>User Segments</h1>
          </div>
          <div className={styles.headerRight}>
            <button className={styles.refreshBtn} onClick={loadSegments}>
              <FiRefreshCw size={16} />
            </button>
          </div>
        </div>

        {!selected && (
          <>
            {loading && (
              <div
                className={styles.skGrid}
                style={{
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                }}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={styles.skCard}
                    style={{ height: 110 }}
                  />
                ))}
              </div>
            )}

            {!loading && (
              <div className={styles.statsGrid}>
                {safeSegments.map((s) => (
                  <button
                    key={s.id}
                    className={styles.statCard}
                    style={{
                      cursor: "pointer",
                      textAlign: "left",
                      border: "1px solid #e5e5e8",
                    }}
                    onClick={() => openSegment(s)}
                  >
                    <div className={styles.statTop}>
                      <span className={styles.statIcon}>
                        <FiTarget size={16} />
                      </span>
                      <FiChevronRight size={16} style={{ color: "#888" }} />
                    </div>
                    <div className={styles.statValue} style={{ fontSize: 20 }}>
                      {s.name}
                    </div>
                    <div className={styles.statLabel}>
                      <span className={styles.pillOrange}>{s.key}</span> ·{" "}
                      <FiUsers size={11} style={{ verticalAlign: -1 }} />{" "}
                      {fmtFull(s.memberCount ?? 0)}
                    </div>
                    {s.description && (
                      <p
                        style={{
                          fontSize: 11,
                          color: "#888",
                          marginTop: 8,
                          marginBottom: 0,
                        }}
                      >
                        {s.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {selected && (
          <>
            <button
              className={styles.rowLink}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                marginBottom: 16,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: 13,
              }}
              onClick={() => {
                setSelected(null);
                setMembers(null);
              }}
            >
              ← Back to segments
            </button>

            <div className={styles.panel} style={{ marginBottom: 24 }}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>{selected.name}</h3>
                <p className={styles.panelSub}>
                  <span className={styles.pillOrange}>{selected.key}</span> ·{" "}
                  {fmtFull(selected.memberCount ?? 0)} member(s)
                  {selected.description && ` · ${selected.description}`}
                </p>
              </div>
            </div>

            <div className={styles.panel}>
              <div className={styles.panelHeader}>
                <h3 className={styles.panelTitle}>Members</h3>
                <p className={styles.panelSub}>
                  {memberTotal} total {membersLoading && "· loading..."}
                </p>
              </div>
              <div className={styles.panelBody} style={{ padding: 0 }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Role</th>
                      <th>Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!membersLoading && memberList.length === 0 && (
                      <tr>
                        <td colSpan={3} className={styles.noData}>
                          No members yet. The nightly aggregation job populates
                          this.
                        </td>
                      </tr>
                    )}
                    {memberList.map((m) => (
                      <tr key={m.id}>
                        <td>
                          <Link
                            to={`/admin/analytics/user/${m.id}`}
                            className={styles.userCell}
                            style={{ textDecoration: "none" }}
                          >
                            <div className={styles.userAvatar}>
                              {m.avatar ? (
                                <img src={m.avatar} alt="" />
                              ) : (
                                `${m.firstName?.[0] || ""}${m.lastName?.[0] || ""}`
                              )}
                            </div>
                            <div>
                              <div className={styles.userName}>
                                {m.firstName} {m.lastName}
                              </div>
                              <div className={styles.userEmail}>{m.email}</div>
                            </div>
                          </Link>
                        </td>
                        <td>
                          <span className={styles.pill}>{m.role}</span>
                        </td>
                        <td style={{ fontSize: 11, color: "#888" }}>
                          {timeAgo(m.assignedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
