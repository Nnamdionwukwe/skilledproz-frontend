import styles from "../BookingDetail.module.css";
function mapsUrl(lat, lng) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}
export default function GpsCard({
  title,
  dotColor,
  timestamp,
  lat,
  lng,
  distKm,
  cardClass,
}) {
  return (
    <div className={`${styles.gpsCard} ${cardClass}`}>
      <div className={styles.gpsCardHeader}>
        <span className={styles.gpsCardDot} style={{ background: dotColor }} />
        <span className={styles.gpsCardTitle}>{title}</span>
        {timestamp && (
          <span className={styles.gpsCardTime}>
            {new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}{" "}
            ·{" "}
            {new Date(timestamp).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </span>
        )}
      </div>
      <div className={styles.gpsCoordRow}>
        <span className={styles.gpsCoordLabel}>Coordinates</span>
        <span className={styles.gpsCoordValue}>
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </span>
      </div>
      {distKm !== null && (
        <div
          className={`${styles.gpsDistRow} ${distKm > 1 ? styles.gpsDistFar : styles.gpsDistNear}`}
        >
          <span>{distKm < 0.1 ? "✅" : distKm > 1 ? "⚠️" : "📏"}</span>
          <span>
            {distKm < 0.1
              ? "Worker was at the job site"
              : `${distKm.toFixed(2)} km from job site`}
          </span>
        </div>
      )}
      <a
        href={mapsUrl(lat, lng)}
        target="_blank"
        rel="noreferrer"
        className={styles.gpsMapLink}
      >
        🗺️ View on Google Maps
      </a>
    </div>
  );
}
