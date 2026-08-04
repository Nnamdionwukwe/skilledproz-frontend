import { QRCodeSVG } from "qrcode.react";
import styles from "./QRCodeDownload.module.css";

export default function QRCodeDownload() {
  const downloadUrl = "https://skilledproz.com/download";

  return (
    <div className={styles.qrWrapper}>
      <QRCodeSVG value={downloadUrl} size={200} level="H" />
      <p className={styles.qrLabel}>Scan to download the app</p>
    </div>
  );
}
