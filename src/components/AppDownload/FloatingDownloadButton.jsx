import { useState, useEffect } from "react";
import {
  FaDownload,
  FaAndroid,
  FaApple,
  FaWindows,
  FaTimes,
} from "react-icons/fa";
import styles from "./FloatingDownloadButton.module.css";

export default function FloatingDownloadButton() {
  const [isVisible, setIsVisible] = useState(true);
  const [deviceType, setDeviceType] = useState("other");

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    if (/android/i.test(userAgent)) setDeviceType("android");
    else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream)
      setDeviceType("ios");
    else if (/windows/i.test(userAgent)) setDeviceType("windows");
    else if (/mac/i.test(userAgent)) setDeviceType("mac");
  }, []);

  const getIcon = () => {
    switch (deviceType) {
      case "android":
        return <FaAndroid />;
      case "ios":
        return <FaApple />;
      case "windows":
        return <FaWindows />;
      default:
        return <FaDownload />;
    }
  };

  const getLabel = () => {
    switch (deviceType) {
      case "android":
        return "Get App";
      case "ios":
        return "Download";
      case "windows":
        return "Get App";
      default:
        return "Download App";
    }
  };

  if (!isVisible) return null;

  return (
    <div className={styles.floatingBtn}>
      <button className={styles.closeBtn} onClick={() => setIsVisible(false)}>
        <FaTimes />
      </button>
      <a href="/download" className={styles.downloadLink}>
        {getIcon()}
        <span className={styles.btnText}>{getLabel()}</span>
      </a>
    </div>
  );
}
