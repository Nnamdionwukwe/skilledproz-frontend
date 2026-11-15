// src/pages/InterviewCallRoom.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { FaArrowLeft, FaSpinner, FaVideoSlash } from "react-icons/fa";

export default function InterviewCallRoom() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [callUrl, setCallUrl] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch the call details to get the room URL
    // (You need a GET route that fetches the active call for this application)
    api
      .get(`/jobs/applications/${applicationId}/call`)
      .then((res) => {
        if (res.data?.data?.callUrl) {
          setCallUrl(res.data.data.callUrl);
        } else {
          setError("Call has ended or does not exist.");
        }
      })
      .catch(() => setError("Failed to load call room."));
  }, [applicationId]);

  if (error) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#fff",
        }}
      >
        <FaVideoSlash size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2>Call Unavailable</h2>
        <p style={{ color: "#94a3b8", marginBottom: 24 }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: "10px 20px",
            background: "#3b82f6",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!callUrl) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f172a",
          color: "#fff",
        }}
      >
        <FaSpinner
          className="spin"
          size={32}
          style={{ marginBottom: 16, animation: "spin 1s linear infinite" }}
        />
        <p>Connecting to interview room...</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", width: "100vw", overflow: "hidden" }}>
      <iframe
        src={callUrl}
        allow="camera; microphone; display-capture; fullscreen"
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Interview Video Call"
      />
    </div>
  );
}
