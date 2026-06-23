import styles from "../BookingDetail.module.css";
export default function Skeleton() {
  return (
    <>
      <div className={styles.skBack} />
      <div className={styles.layout}>
        <div className={styles.skMain} />
        <div className={styles.skSide} />
      </div>
    </>
  );
}
