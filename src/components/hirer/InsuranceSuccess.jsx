import { useState, useEffect } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import api from "../../lib/api";

export default function InsuranceSuccess() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking");
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!sessionId) {
      navigate("/dashboard");
      return;
    }
    api
      .post("/insurance/verify", { sessionId })
      .then((res) => {
        setData(res.data.data);
        setStatus("success");
      })
      .catch(() => setStatus("error"));
  }, [sessionId]);

  const role = user?.role?.toLowerCase();

  if (status === "verifying") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "1rem",
          color: "var(--text-dim)",
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            border: "3px solid var(--border)",
            borderTopColor: "var(--orange)",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
            display: "inline-block",
          }}
        />
        <p>Activating insurance...</p>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 480,
        margin: "3rem auto",
        padding: "1.5rem",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 20,
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🛡️</div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.5rem",
            fontWeight: 800,
            color: "var(--text)",
            marginBottom: "0.4rem",
          }}
        >
          {status === "success"
            ? "Insurance Activated!"
            : "Verification Failed"}
        </h1>
        {status === "success" && (
          <p style={{ fontSize: "0.875rem", color: "var(--text-dim)" }}>
            Your {data?.plan} cover is now active.
          </p>
        )}
      </div>

      {status === "success" && (
        <div
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
          }}
        >
          {[
            ["Plan", data?.plan],
            ["Coverage", data?.coverage],
            ["Reference", data?.reference],
            [
              "Activated",
              new Date(data?.purchasedAt).toLocaleDateString("en-GB"),
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.83rem",
              }}
            >
              <span style={{ color: "var(--text-dim)" }}>{label}</span>
              <span
                style={{
                  fontWeight: 600,
                  color: "var(--text)",
                  fontFamily: label === "Reference" ? "monospace" : "inherit",
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {bookingId && (
          <Link
            to={`/bookings/${bookingId}`}
            style={{
              flex: 1,
              background: "var(--orange)",
              color: "var(--bg)",
              borderRadius: 10,
              padding: "0.75rem",
              fontWeight: 700,
              fontSize: "0.875rem",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Back to Booking
          </Link>
        )}
        <Link
          to={`/dashboard/${role}`}
          style={{
            flex: 1,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            color: "var(--text-dim)",
            borderRadius: 10,
            padding: "0.75rem",
            fontWeight: 600,
            fontSize: "0.875rem",
            textAlign: "center",
            textDecoration: "none",
          }}
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
