import styles from "./BookingDetail.module.css";
import Translator from "../../common/Translator";
export default function DescriptionSection({ description, notes }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Description</h2>
      <Translator text={description} />
      {notes && (
        <div className={styles.notes}>
          <span className={styles.notesIcon}>📝</span>
          <p>{notes}</p>
        </div>
      )}
    </section>
  );
}
