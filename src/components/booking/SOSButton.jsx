import { useState } from "react";
import api from "../../lib/api";
import styles from "./SOSButton.module.css";

export default function SOSButton({
  bookingId,
  bookingStatus,
  isWorker,
  sosActivatedAt,
  sosResolvedAt,
  onUpdate,
}) {
  const [phase, setPhase] = useState("idle");
  const [error, setError] = useState("");

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(bookingStatus)) return null;

  const isActive = !!sosActivatedAt && !sosResolvedAt;
  const isResolved = !!sosActivatedAt && !!sosResolvedAt;

  async function handleSOS() {
    if (isActive) return; // Already active
    setPhase("locating");
    setError("");

    let lat = null;
    let lng = null;

    try {
      const pos = await new Promise((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 8000,
          enableHighAccuracy: true,
        }),
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // Proceed without GPS
    }

    setPhase("sending");
    try {
      const res = await api.post(`/bookings/${bookingId}/sos`, {
        latitude: lat,
        longitude: lng,
      });
      setPhase("done");
      onUpdate?.(res.data.data.booking);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Failed to send SOS. Please call emergency services.",
      );
      setPhase("idle");
    }
  }

  if (isResolved) {
    return (
      <div className={styles.resolved}>
        <span className={styles.resolvedIcon}>✅</span>
        <span>Emergency resolved</span>
      </div>
    );
  }

  if (isActive) {
    return (
      <div className={styles.activeWrap}>
        <div className={styles.activePulse} />
        <div className={styles.activeContent}>
          <span className={styles.activeIcon}>🚨</span>
          <div>
            <p className={styles.activeTitle}>SOS Active</p>
            <p className={styles.activeTime}>
              Sent at{" "}
              {new Date(sosActivatedAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
        <p className={styles.activeHint}>
          Your hirer and our team have been alerted.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      {phase === "idle" && (
        <button className={styles.sosBtn} onClick={handleSOS}>
          <span className={styles.sosDot} />
          🆘 Emergency SOS
        </button>
      )}

      {phase === "locating" && (
        <div className={styles.locating}>
          <span className={styles.spinner} />
          <span>Getting your location...</span>
        </div>
      )}

      {phase === "sending" && (
        <div className={styles.locating}>
          <span className={styles.spinner} />
          <span>Sending emergency alert...</span>
        </div>
      )}

      {phase === "done" && (
        <div className={styles.activeWrap}>
          <span className={styles.activeIcon}>🚨</span>
          <span className={styles.activeTitle}>
            SOS Sent — help is on the way
          </span>
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      <p className={styles.hint}>
        Only use in a genuine emergency. Your GPS location will be shared.
      </p>
    </div>
  );
}
