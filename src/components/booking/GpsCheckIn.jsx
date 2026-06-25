import { useState } from "react";
import api from "../../lib/api";
import styles from "./GpsCheckIn.module.css";
import {
  FaMapMarkerAlt,
  FaLocationArrow,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSpinner,
  FaCheck,
  FaTimes,
  FaCircle,
} from "react-icons/fa";

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
    );
    const data = await res.json();
    const addr = data.address || {};
    return (
      addr.suburb ||
      addr.neighbourhood ||
      addr.village ||
      addr.town ||
      addr.city ||
      addr.county ||
      `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    );
  } catch {
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
}

function getGPS() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
        }),
      () => resolve({ latitude: null, longitude: null }),
      { timeout: 10000, enableHighAccuracy: true },
    );
  });
}

export default function GpsCheckIn({
  bookingId,
  status,
  isWorker,
  jobLatitude,
  jobLongitude,
  onSuccess,
}) {
  const [phase, setPhase] = useState("idle");
  const [gpsData, setGpsData] = useState(null);
  const [locationLabel, setLocationLabel] = useState("");
  const [distanceKm, setDistanceKm] = useState(null);
  const [error, setError] = useState("");

  if (!isWorker) return null;
  if (!["ACCEPTED", "IN_PROGRESS"].includes(status)) return null;

  const isCheckIn = status === "ACCEPTED";

  const handleLocate = async () => {
    setPhase("locating");
    setError("");

    const gps = await getGPS();

    if (!gps.latitude) {
      setGpsData({ latitude: null, longitude: null });
      setLocationLabel("Location unavailable");
      setDistanceKm(null);
      setPhase("confirming");
      return;
    }

    const label = await reverseGeocode(gps.latitude, gps.longitude);
    setLocationLabel(label);
    setGpsData(gps);

    if (jobLatitude && jobLongitude) {
      const dist = haversineKm(
        gps.latitude,
        gps.longitude,
        jobLatitude,
        jobLongitude,
      );
      setDistanceKm(dist);
    }

    setPhase("confirming");
  };

  const handleConfirm = async () => {
    setPhase("submitting");
    try {
      const endpoint = isCheckIn
        ? `/bookings/${bookingId}/checkin`
        : `/bookings/${bookingId}/checkout`;

      const res = await api.patch(endpoint, {
        latitude: gpsData?.latitude || null,
        longitude: gpsData?.longitude || null,
      });

      setPhase("done");
      onSuccess?.(res.data.data.booking, gpsData);
    } catch (e) {
      setError(e.response?.data?.message || "Action failed. Please try again.");
      setPhase("idle");
    }
  };

  const handleReset = () => {
    setPhase("idle");
    setGpsData(null);
    setLocationLabel("");
    setDistanceKm(null);
    setError("");
  };

  const distanceWarning =
    distanceKm !== null && distanceKm > 1
      ? `You appear to be ${distanceKm.toFixed(1)} km from the job site.`
      : null;

  return (
    <div className={styles.wrap}>
      {/* ── IDLE STATE ── */}
      {phase === "idle" && (
        <button
          className={`${styles.mainBtn} ${isCheckIn ? styles.btnCheckIn : styles.btnCheckOut}`}
          onClick={handleLocate}
        >
          <span
            className={`${styles.pulseDot} ${isCheckIn ? styles.dotGreen : styles.dotOrange}`}
          />
          {isCheckIn ? "Check In — Start Job" : "Check Out — Mark Complete"}
        </button>
      )}

      {/* ── LOCATING ── */}
      {phase === "locating" && (
        <div className={styles.locatingBox}>
          <div className={styles.locatingIcon}>
            <FaMapMarkerAlt size={24} />
          </div>
          <div>
            <p className={styles.locatingTitle}>Acquiring your location...</p>
            <p className={styles.locatingHint}>
              Please allow location access if prompted
            </p>
          </div>
          <FaSpinner className={styles.spinner} />
        </div>
      )}

      {/* ── CONFIRM ── */}
      {phase === "confirming" && (
        <div className={styles.confirmBox}>
          <div className={styles.confirmHeader}>
            <span className={styles.confirmIcon}>
              {isCheckIn ? (
                <FaCheckCircle color="var(--green)" size={22} />
              ) : (
                <FaCircle color="var(--red)" size={22} />
              )}
            </span>
            <div>
              <p className={styles.confirmTitle}>
                {isCheckIn ? "Confirm Check-In" : "Confirm Check-Out"}
              </p>
              <p className={styles.confirmTime}>
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </p>
            </div>
          </div>

          {/* Location display */}
          <div className={styles.locationCard}>
            <div className={styles.locationRow}>
              <span className={styles.locationIcon}>
                <FaLocationArrow size={18} />
              </span>
              <div>
                <p className={styles.locationLabel}>Your current location</p>
                <p className={styles.locationValue}>
                  {locationLabel || "Unknown"}
                </p>
                {gpsData?.accuracy && (
                  <p className={styles.locationAccuracy}>
                    ±{gpsData.accuracy}m accuracy
                  </p>
                )}
                {gpsData?.latitude && (
                  <p className={styles.locationCoords}>
                    {gpsData.latitude.toFixed(5)},{" "}
                    {gpsData.longitude.toFixed(5)}
                  </p>
                )}
              </div>
            </div>

            {/* Distance from job */}
            {distanceKm !== null && (
              <div
                className={`${styles.distanceRow} ${distanceKm > 1 ? styles.distanceFar : styles.distanceNear}`}
              >
                <span>
                  {distanceKm < 0.1 ? (
                    <FaCheckCircle color="var(--green)" />
                  ) : distanceKm > 1 ? (
                    <FaExclamationTriangle color="#fbbf24" />
                  ) : (
                    <FaLocationArrow />
                  )}
                </span>
                <span>
                  {distanceKm < 0.1
                    ? "You're at the job site"
                    : `${distanceKm.toFixed(2)} km from job site`}
                </span>
              </div>
            )}

            {/* No GPS warning */}
            {!gpsData?.latitude && (
              <div className={styles.noGpsRow}>
                <span>
                  <FaExclamationTriangle color="#fbbf24" />
                </span>
                <span>
                  Location unavailable — check-in will proceed without GPS
                </span>
              </div>
            )}
          </div>

          {/* Distance warning */}
          {distanceWarning && (
            <div className={styles.warningBox}>
              <FaExclamationTriangle style={{ marginRight: "6px" }} />
              {distanceWarning} Your location is still recorded.
            </div>
          )}

          {/* Actions */}
          <div className={styles.confirmActions}>
            <button className={styles.cancelBtn} onClick={handleReset}>
              <FaTimes style={{ marginRight: "4px" }} /> Cancel
            </button>
            <button
              className={`${styles.confirmBtn} ${isCheckIn ? styles.confirmBtnIn : styles.confirmBtnOut}`}
              onClick={handleConfirm}
            >
              <FaCheck style={{ marginRight: "6px" }} />
              {isCheckIn ? "Confirm Check-In" : "Confirm Check-Out"}
            </button>
          </div>
        </div>
      )}

      {/* ── SUBMITTING ── */}
      {phase === "submitting" && (
        <div className={styles.submittingBox}>
          <FaSpinner className={styles.spinner} />
          <p>{isCheckIn ? "Checking in..." : "Checking out..."}</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {error && (
        <div className={styles.errorBox}>
          <FaExclamationTriangle style={{ marginRight: "6px" }} />
          {error}
          <button onClick={handleReset} className={styles.retryBtn}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
