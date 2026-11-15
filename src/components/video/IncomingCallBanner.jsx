// src/components/video/InterviewCallButton.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../lib/api";
import { FaVideo, FaSpinner, FaExclamationTriangle } from "react-icons/fa";
import styles from "./InterviewCallButton.module.css"; // Ensure this CSS file exists

export default function InterviewCallButton({ applicationId, workerName }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStartCall = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Hit the backend to create the VideoCall row and emit the socket event
      await api.post(`/jobs/applications/${applicationId}/call`);

      // 2. The backend has now created the call. Since we are the hirer (caller),
      // we immediately navigate to the interview room. The room will wait for the
      // worker to accept. (The backend GET route returns the URL).
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
