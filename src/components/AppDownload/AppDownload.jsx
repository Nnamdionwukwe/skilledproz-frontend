import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FaAndroid,
  FaApple,
  FaWindows,
  FaDownload,
  FaQrcode,
  FaMobileAlt,
  FaLaptop,
  FaCheckCircle,
  FaTimes,
} from "react-icons/fa";
import styles from "./AppDownload.module.css";

export default function AppDownload() {
  const [showModal, setShowModal] = useState(false);
  const [deviceType, setDeviceType] = useState("unknown");
  const [copied, setCopied] = useState(false);

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    if (/android/i.test(userAgent)) {
      setDeviceType("android");
    } else if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
      setDeviceType("ios");
    } else if (/windows/i.test(userAgent)) {
      setDeviceType("windows");
    } else if (/mac/i.test(userAgent)) {
      setDeviceType("mac");
    } else {
      setDeviceType("other");
    }
  }, []);

  const downloadLinks = {
    android: {
      icon: <FaAndroid />,
      label: "Download for Android",
      url: "/downloads/skilledproz.apk",
      color: "#3DDC84",
      storeUrl: "https://play.google.com/store/apps/details?id=com.skilledproz",
    },
    ios: {
      icon: <FaApple />,
      label: "Download for iOS",
      url: "https://apps.apple.com/app/skilledproz",
      color: "#000000",
      storeUrl: "https://apps.apple.com/app/skilledproz",
    },
    windows: {
      icon: <FaWindows />,
      label: "Download for Windows",
      url: "/downloads/skilledproz-setup.exe",
      color: "#0078D4",
    },
    mac: {
      icon: <FaApple />,
      label: "Download for Mac",
      url: "/downloads/skilledproz.dmg",
      color: "#000000",
    },
    other: {
      icon: <FaDownload />,
      label: "Download App",
      url: "/downloads/skilledproz.apk",
      color: "#6B7280",
    },
  };

  const currentLink = downloadLinks[deviceType] || downloadLinks.other;

  // Get the download URL for QR code
  const getDownloadUrl = () => {
    if (deviceType === "android") {
      return currentLink.storeUrl || "https://skilledproz.com/download";
    }
    return "https://skilledproz.com/download";
  };

  const handleDownload = () => {
    // Track download event
    if (window.gtag) {
      window.gtag("event", "app_download", {
        device_type: deviceType,
        platform: currentLink.label,
      });
    }

    // For Android, show modal with instructions
    if (deviceType === "android") {
      setShowModal(true);
      return;
    }

    // For iOS, redirect to App Store
    if (deviceType === "ios") {
      window.open(currentLink.storeUrl, "_blank");
      return;
    }

    // For other devices, download directly
    const link = document.createElement("a");
    link.href = currentLink.url;
    link.download = `skilledproz-app.${deviceType === "windows" ? "exe" : deviceType === "mac" ? "dmg" : "apk"}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href + "download");
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getDeviceIcon = () => {
    switch (deviceType) {
      case "android":
        return <FaAndroid className={styles.deviceIcon} />;
      case "ios":
        return <FaApple className={styles.deviceIcon} />;
      case "windows":
        return <FaWindows className={styles.deviceIcon} />;
      case "mac":
        return <FaLaptop className={styles.deviceIcon} />;
      default:
        return <FaMobileAlt className={styles.deviceIcon} />;
    }
  };

  const getDeviceName = () => {
    switch (deviceType) {
      case "android":
        return "Android";
      case "ios":
        return "iOS";
      case "windows":
        return "Windows";
      case "mac":
        return "Mac";
      default:
        return "Your Device";
    }
  };

  return (
    <>
      {/* ── Download Button ── */}
      <div className={styles.downloadWrapper}>
        <div className={styles.downloadCard}>
          <div className={styles.downloadHeader}>
            <span className={styles.downloadBadge}>
              <FaDownload /> Available Now
            </span>
            <h3 className={styles.downloadTitle}>Download the App</h3>
            <p className={styles.downloadSubtitle}>
              Get the full SkilledProz experience on your device
            </p>
          </div>

          <div className={styles.downloadBody}>
            <div className={styles.deviceInfo}>
              {getDeviceIcon()}
              <span className={styles.deviceName}>
                {getDeviceName()} detected
              </span>
            </div>

            <button onClick={handleDownload} className={styles.downloadBtn}>
              {currentLink.icon}
              {currentLink.label}
              <span className={styles.downloadBtnArrow}>→</span>
            </button>

            <div className={styles.downloadOptions}>
              <button
                onClick={() => setShowModal(true)}
                className={styles.optionBtn}
              >
                <FaQrcode /> Scan QR Code
              </button>
              <button onClick={handleCopyLink} className={styles.optionBtn}>
                {copied ? <FaCheckCircle /> : <FaDownload />}
                {copied ? "Copied!" : "Copy Download Link"}
              </button>
            </div>
          </div>

          <div className={styles.downloadFooter}>
            <span className={styles.footerItem}>
              <FaCheckCircle /> Secure Download
            </span>
            <span className={styles.footerItem}>
              <FaCheckCircle /> Free
            </span>
            <span className={styles.footerItem}>
              <FaCheckCircle /> Instant Install
            </span>
          </div>
        </div>
      </div>

      {/* ── QR Code Modal ── */}
      {showModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowModal(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setShowModal(false)}
            >
              <FaTimes />
            </button>

            <div className={styles.modalContent}>
              <h2 className={styles.modalTitle}>📱 Scan to Download</h2>
              <p className={styles.modalSubtitle}>
                Scan this QR code with your phone's camera
              </p>

              <div className={styles.qrContainer}>
                <QRCodeSVG
                  value={getDownloadUrl()}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#1a2466"
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className={styles.qrUrl}>
                <span>{getDownloadUrl()}</span>
              </div>

              <div className={styles.modalInstructions}>
                <h4>Installation Instructions:</h4>
                <ol>
                  <li>Scan the QR code with your phone</li>
                  <li>Tap "Download" on the page that opens</li>
                  <li>Open the downloaded file</li>
                  <li>Tap "Install" when prompted</li>
                  <li>Open the app and get started!</li>
                </ol>
              </div>

              <div className={styles.modalButtons}>
                <a
                  href={currentLink.url}
                  download
                  className={styles.modalDownloadBtn}
                >
                  <FaDownload /> Download Now
                </a>
                <button
                  onClick={() => setShowModal(false)}
                  className={styles.modalCloseBtn}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
