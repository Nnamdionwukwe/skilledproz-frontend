// src/components/video/InterviewCallButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { FaVideo, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import styles from "./InterviewCallButton.module.css";

export default function InterviewCallButton({ applicationId, workerName }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartCall = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Create the VideoCall row + emit socket event
      await api.post(`/jobs/applications/${applicationId}/call`);

      // 2. Navigate the hirer to the interview room
      navigate(`/interview/${applicationId}`);
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to start the interview call.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <button
        className={styles.startBtn}
        onClick={handleStartCall}
        disabled={loading}
      >
        {loading ? (
          <FaSpinner className={styles.spinner} />
        ) : (
          <>
            <FaVideo style={{ marginRight: 6 }} /> Start Interview with{" "}
            {workerName}
          </>
        )}
      </button>
      {error && (
        <p className={styles.error}>
          <FaExclamationTriangle style={{ marginRight: 6 }} /> {error}
        </p>
      )}
    </div>
  );
}
