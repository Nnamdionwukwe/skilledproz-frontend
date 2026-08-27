// src/pages/admin/AdminLogs.jsx
import { useState, useEffect } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../lib/api";
import styles from "./AdminLogs.module.css";

import {
  FaSearch,
  FaFilter,
  FaDownload,
  FaEye,
  FaEyeSlash,
  FaClock,
  FaUser,
  FaServer,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaSpinner,
  FaArrowLeft,
  FaArrowRight,
  FaTimes,
  FaFileExport,
  FaTrash,
} from "react-icons/fa";

const LOG_TYPES = [
  { value: "all", label: "All Logs", icon: <FaServer /> },
  { value: "error", label: "Errors", icon: <FaExclamationTriangle /> },
  { value: "security", label: "Security", icon: <FaShieldAlt /> },
  { value: "wallet", label: "Wallet", icon: <FaClock /> },
  { value: "info", label: "Info", icon: <FaCheckCircle /> },
];

export default function AdminLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedLog, setSelectedLog] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(() => {
      if (autoRefresh) fetchLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [filter, page, autoRefresh]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/logs", {
        params: { type: filter, search, page, limit: 50 },
      });
      setLogs(res.data.data?.logs || []);
      setTotalPages(res.data.data?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case "error":
        return <FaExclamationTriangle style={{ color: "#EF4444" }} />;
      case "warn":
        return <FaExclamationTriangle style={{ color: "#F59E0B" }} />;
      case "security":
        return <FaShieldAlt style={{ color: "#3B82F6" }} />;
      case "wallet":
        return <FaClock style={{ color: "#10B981" }} />;
      default:
        return <FaCheckCircle style={{ color: "#6B7280" }} />;
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const exportLogs = async () => {
    try {
      const res = await api.get("/admin/logs/export", {
        params: { type: filter, search },
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `logs-${filter}-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export logs:", err);
    }
  };

  return (
    <AdminLayout>
      <div className={styles.page}>
        <div className={styles.header}>
          <div>
            <p className={styles.eyebrow}>Monitoring</p>
            <h1 className={styles.title}>System Logs</h1>
            <p className={styles.subtitle}>
              Monitor platform activity and security events
            </p>
          </div>
          <div className={styles.actions}>
            <button className={styles.exportBtn} onClick={exportLogs}>
              <FaFileExport /> Export Logs
            </button>
            <button
              className={`${styles.autoRefreshBtn} ${autoRefresh ? styles.active : ""}`}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? "Auto-Refresh On" : "Auto-Refresh Off"}
            </button>
          </div>
        </div>

        <div className={styles.controls}>
          <div className={styles.searchWrap}>
            <FaSearch />
            <input
              type="text"
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs()}
            />
          </div>
          <div className={styles.filterWrap}>
            {LOG_TYPES.map((type) => (
              <button
                key={type.value}
                className={`${styles.filterBtn} ${filter === type.value ? styles.active : ""}`}
                onClick={() => setFilter(type.value)}
              >
                {type.icon} {type.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>
            <FaSpinner className={styles.spinner} />
            <p>Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className={styles.empty}>
            <FaServer size={48} />
            <h3>No logs found</h3>
            <p>Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className={styles.logsContainer}>
            <div className={styles.logsList}>
              {logs.map((log, index) => (
                <div
                  key={index}
                  className={`${styles.logEntry} ${styles[log.level] || ""}`}
                  onClick={() => setSelectedLog(log)}
                >
                  <div className={styles.logIcon}>{getLogIcon(log.level)}</div>
                  <div className={styles.logContent}>
                    <div className={styles.logHeader}>
                      <span className={styles.logLevel}>
                        {log.level || "info"}
                      </span>
                      <span className={styles.logTime}>
                        <FaClock size={12} /> {formatTime(log.timestamp)}
                      </span>
                      {log.userId && (
                        <span className={styles.logUser}>
                          <FaUser size={12} /> User: {log.userId}
                        </span>
                      )}
                    </div>
                    <div className={styles.logMessage}>{log.message}</div>
                    {log.metadata && Object.keys(log.metadata).length > 0 && (
                      <div className={styles.logMetadata}>
                        <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <FaArrowLeft /> Prev
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next <FaArrowRight />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
