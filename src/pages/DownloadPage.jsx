import { Link } from "react-router-dom";
import AppDownload from "../components/AppDownload/AppDownload";
import styles from "./DownloadPage.module.css";

export default function DownloadPage() {
  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <Link to="/" className={styles.backBtn}>
          ← Back to Home
        </Link>
        <AppDownload />
        <div className={styles.instructions}>
          <h3>📱 Need help?</h3>
          <p>
            Having trouble downloading? Contact our support team at{" "}
            <a href="mailto:support@skilledproz.com">support@skilledproz.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}
