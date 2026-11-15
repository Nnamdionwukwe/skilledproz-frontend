// src/pages/InterviewCallRoom.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import {
  FaArrowLeft,
  FaSpinner,
  FaVideoSlash,
  FaPhoneSlash,
} from "react-icons/fa";

export default function InterviewCallRoom() {
  const { applicationId } = useParams();
  const navigate = useNavigate();

  const [callUrl, setCallUrl] = useState(null);
  const [callId, setCallId] = useState(null); // ✅ NEW
  const [jobPostId, setJobPostId] = useState(null);
  const [error, setError] = useState("");
  const [callEnded, setCallEnded] = useState(false);

  // ── 1. Initial Fetch ──
  useEffect(() => {
    api
      .get(`/jobs/applications/${applicationId}/call`)
      .then((res) => {
        const data = res.data?.data;
        if (data?.callUrl) {
          setCallUrl(data.callUrl);
          setCallId(data.callId || null); // ✅ NEW
          setJobPostId(data.jobPostId || null);
        } else {
          setError("Call has ended or does not exist.");
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          setCallEnded(true);
        } else {
          setError("Failed to load call room.");
        }
      });
  }, [applicationId]);

  // ── 2. Poll for Call Status (Every 5 seconds) ──
  useEffect(() => {
    if (!callUrl || callEnded) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/applications/${applicationId}/call`);
        const status = res.data?.data?.status;

        if (status === "ENDED" || status === "DECLINED") {
          setCallEnded(true);
          clearInterval(interval);
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setCallEnded(true);
          clearInterval(interval);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [applicationId, callUrl, callEnded]);

  // ── 3. Handle Redirect on End ──
  useEffect(() => {
    if (callEnded) {
      const redirectPath = jobPostId
        ? `/jobs/${jobPostId}/applications`
        : "/dashboard/hirer/jobs-management";

      setTimeout(() => {
        navigate(redirectPath);
      }, 2000);
    }
  }, [callEnded, jobPostId, navigate]);

  // ── 4. End call when the user clicks Leave ──
  async function handleLeave() {
    if (callId) {
      try {
        await api.patch(`/video-calls/${callId}/end`);
      } catch {
        /* silent — even if end fails, the user is leaving */
      }
    }
    setCallEnded(true);
  }

  // ── Render States ──

  if (callEnded) {
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
        <FaPhoneSlash size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>Call Ended</h2>
        <p style={{ color: "#94a3b8", marginTop: 8 }}>
          Returning to applications...
        </p>
        <button
          onClick={() => navigate("/dashboard/hirer/jobs-management")}
          style={{
            marginTop: 24,
            padding: "10px 24px",
            background: "#3b82f6",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          Go Back Now
        </button>
      </div>
    );
  }

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
        <h2 style={{ fontSize: 24, fontWeight: "bold" }}>Call Unavailable</h2>
        <p style={{ color: "#94a3b8", marginTop: 8 }}>{error}</p>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: 24,
            padding: "10px 24px",
            background: "#3b82f6",
            color: "#fff",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
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
          size={32}
          style={{
            marginBottom: 16,
            animation: "spin 1s linear infinite",
            color: "#3b82f6",
          }}
        />
        <p style={{ color: "#94a3b8" }}>Connecting to interview room...</p>
      </div>
    );
  }

  // ── The Video Room ──
  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
      }}
    >
      {/* Top bar with Leave button */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "12px 20px",
          background: "#1e293b",
          color: "#fff",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <button
          onClick={handleLeave}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "transparent",
            border: "none",
            color: "#fff",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          <FaArrowLeft /> Leave Call
        </button>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 12,
            fontWeight: 600,
            color: "#94a3b8",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          Interview Session
        </span>
      </div>

      {/* MiroTalk Iframe */}
      <iframe
        src={callUrl}
        allow="camera; microphone; display-capture; fullscreen"
        style={{ flex: 1, width: "100%", border: "none" }}
        title="Interview Video Call"
      />
    </div>
  );
}
