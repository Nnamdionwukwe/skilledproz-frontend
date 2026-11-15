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
          // Assuming the backend returns jobPostId, or we can fetch it.
          // If your backend doesn't return jobPostId here, we'll just redirect to the management page.
          setJobPostId(data.jobPostId || null);
        } else {
          setError("Call has ended or does not exist.");
        }
      })
      .catch((err) => {
        // If the call ended/declined before we even loaded, send them back
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
        // If we get a 404, it means the call was deleted or ended
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
      // Navigate back to the Job Applications page.
      // If we know the jobPostId, go to the specific job's applications,
      // otherwise go to the hirer's general jobs management dashboard.
      const redirectPath = jobPostId
        ? `/jobs/${jobPostId}/applications`
        : "/dashboard/hirer/jobs-management";

      setTimeout(() => {
        navigate(redirectPath);
      }, 2000); // Give them 2 seconds to read the "Call Ended" screen
    }
  }, [callEnded, jobPostId, navigate]);

  // ── Render States ──

  if (callEnded) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <FaPhoneSlash size={48} color="#ef4444" className="mb-4" />
        <h2 className="text-2xl font-bold">Call Ended</h2>
        <p className="text-slate-400 mt-2">Returning to applications...</p>
        <button
          onClick={() => navigate("/dashboard/hirer/jobs-management")}
          className="mt-6 px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700"
        >
          Go Back Now
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <FaVideoSlash size={48} color="#ef4444" className="mb-4" />
        <h2 className="text-2xl font-bold">Call Unavailable</h2>
        <p className="text-slate-400 mt-2">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-2 bg-blue-600 rounded-lg text-white font-medium hover:bg-blue-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (!callUrl) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white">
        <FaSpinner size={32} className="mb-4 animate-spin text-blue-500" />
        <p className="text-slate-400">Connecting to interview room...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden">
      <iframe
        src={callUrl}
        allow="camera; microphone; display-capture; fullscreen"
        className="w-full h-full border-none"
        title="Interview Video Call"
      />
    </div>
  );
}
