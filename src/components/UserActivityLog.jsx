// src/components/UserActivityLog.jsx
import { useState, useEffect } from "react";
import styles from "./UserActivityLog.module.css";
import api from "../lib/api";
import { FaClock, FaEye, FaLock, FaShieldAlt } from "react-icons/fa";

export default function UserActivityLog() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      const res = await api.get("/user/activities");
      setActivities(res.data.data || []);
    } catch (err) {
      console.error("Failed to fetch activities:", err);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "login":
        return <FaLock />;
      case "view":
        return <FaEye />;
      case "security":
        return <FaShieldAlt />;
      default:
        return <FaClock />;
    }
  };

  if (loading) return <div className={styles.loading}>Loading...</div>;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Recent Activity</h3>
      {activities.length === 0 ? (
        <p className={styles.empty}>No recent activity</p>
      ) : (
        <ul className={styles.list}>
          {activities.map((activity, index) => (
            <li key={index} className={styles.item}>
              <span className={styles.icon}>
                {getActivityIcon(activity.type)}
              </span>
              <div className={styles.content}>
                <span className={styles.description}>
                  {activity.description}
                </span>
                <span className={styles.time}>
                  {new Date(activity.timestamp).toLocaleString()}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
