// src/components/common/Skeleton.jsx
// Reusable skeleton primitives.
//
// USAGE:
//   <Skeleton width="100%" height={20} />
//   <Skeleton variant="circle" size={40} />
//   <Skeleton variant="text" lines={3} />
//   <Skeleton.Table rows={5} cols={4} />
//
// All variants inherit the shimmer animation from the .skeleton class
// provided by the parent module's CSS (or the global Skeleton.module.css).

import styles from "./Skeleton.module.css";

export default function Skeleton({
  variant = "block",
  width,
  height,
  size,
  radius,
  lines = 1,
  className = "",
  style = {},
}) {
  if (variant === "text") {
    return (
      <div className={`${styles.textWrap} ${className}`} style={style}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={styles.skeleton}
            style={{
              height: 12,
              width: i === lines - 1 && lines > 1 ? "65%" : "100%",
              borderRadius: 4,
              marginBottom: i === lines - 1 ? 0 : 8,
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === "circle") {
    return (
      <div
        className={`${styles.skeleton} ${className}`}
        style={{
          width: size ?? 40,
          height: size ?? 40,
          borderRadius: "50%",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

  // default: block
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width: width ?? "100%",
        height: height ?? 20,
        borderRadius: radius ?? 8,
        ...style,
      }}
    />
  );
}

// ── Composite skeletons used across pages ────────────────────────────
Skeleton.Text = function Text({ lines = 3, className = "" }) {
  return <Skeleton variant="text" lines={lines} className={className} />;
};

Skeleton.Circle = function Circle({ size = 40, className = "" }) {
  return <Skeleton variant="circle" size={size} className={className} />;
};

Skeleton.Table = function Table({ rows = 5, cols = 4, className = "" }) {
  return (
    <div className={`${styles.table} ${className}`}>
      <div className={styles.tableRow} style={{ opacity: 0.6 }}>
        {Array.from({ length: cols }).map((_, c) => (
          <div
            key={c}
            className={styles.skeleton}
            style={{ height: 12, borderRadius: 4, flex: 1 }}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={styles.tableRow}>
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={styles.skeleton}
              style={{
                height: 16,
                borderRadius: 4,
                flex: c === 0 ? 2 : 1,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

Skeleton.Card = function Card({ height = 140, className = "" }) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{ height, borderRadius: 14, width: "100%" }}
    />
  );
};

Skeleton.KpiRow = function KpiRow({ count = 4, className = "" }) {
  return (
    <div className={`${styles.kpiRow} ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.kpiCard}>
          <div
            className={styles.skeleton}
            style={{ width: 44, height: 44, borderRadius: 12 }}
          />
          <div style={{ flex: 1 }}>
            <div
              className={styles.skeleton}
              style={{
                width: "60%",
                height: 10,
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            <div
              className={styles.skeleton}
              style={{ width: "80%", height: 18, borderRadius: 4 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};
