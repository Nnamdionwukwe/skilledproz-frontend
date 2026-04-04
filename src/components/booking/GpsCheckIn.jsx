import { useState } from "react";
import api from "../../lib/api";
import styles from "./GpsCheckIn.module.css";

export default function GpsCheckIn({ bookingId, status, isWorker, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [locating, setLocating] = useState(false);

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(status)) return null;

  const getGPS = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        resolve({ latitude: null, longitude: null });
        return;
      }
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocating(false);
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        () => {
          setLocating(false);
          resolve({ latitude: null, longitude: null }); // fallback — don't block
        },
        { timeout: 8000, enableHighAccuracy: true },
      );
    });

  const handleCheckIn = async () => {
    setLoading(true);
    setGpsError("");
    const { latitude, longitude } = await getGPS();
    try {
      const res = await api.patch(`/bookings/${bookingId}/checkin`, {
        latitude,
        longitude,
      });
      onSuccess?.(res.data.data.booking, { latitude, longitude });
    } catch (e) {
      setGpsError(e.response?.data?.message || "Check-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    setGpsError("");
    const { latitude, longitude } = await getGPS();
    try {
      const res = await api.patch(`/bookings/${bookingId}/checkout`, {
        latitude,
        longitude,
      });
      onSuccess?.(res.data.data.booking, { latitude, longitude });
    } catch (e) {
      setGpsError(e.response?.data?.message || "Check-out failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrap}>
      {status === "ACCEPTED" && (
        <button
          className={`${styles.btn} ${styles.btnIn}`}
          onClick={handleCheckIn}
          disabled={loading || locating}
        >
          {locating ? (
            <>
              <span className={styles.spinner} /> Getting location...
            </>
          ) : loading ? (
            <>
              <span className={styles.spinner} /> Checking in...
            </>
          ) : (
            <>
              <span className={styles.pulse} /> Check In — Start Job
            </>
          )}
        </button>
      )}

      {status === "IN_PROGRESS" && (
        <button
          className={`${styles.btn} ${styles.btnOut}`}
          onClick={handleCheckOut}
          disabled={loading || locating}
        >
          {locating ? (
            <>
              <span className={styles.spinner} /> Getting location...
            </>
          ) : loading ? (
            <>
              <span className={styles.spinner} /> Checking out...
            </>
          ) : (
            <>✓ Check Out — Mark Complete</>
          )}
        </button>
      )}

      {gpsError && <p className={styles.err}>⚠️ {gpsError}</p>}

      <p className={styles.hint}>
        {locating
          ? "📍 Acquiring GPS location..."
          : "📍 GPS location will be recorded for this action"}
      </p>
    </div>
  );
}
