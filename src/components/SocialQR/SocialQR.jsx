import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  FaTwitter,
  FaYoutube,
  FaInstagram,
  FaTiktok,
  FaFacebook,
  FaLinkedin,
  FaShareAlt,
  FaWhatsapp,
  FaTelegram,
  FaEnvelope,
  FaCopy,
  FaCheck,
  FaDownload,
  FaTimes,
  FaQrcode,
  FaLink,
  FaMobileAlt,
} from "react-icons/fa";
import styles from "./SocialQR.module.css";

const SOCIAL_PLATFORMS = [
  {
    id: "twitter",
    name: "Twitter/X",
    icon: <FaTwitter />,
    url: "https://x.com/skilledprozz",
    color: "#1DA1F2",
    bgColor: "#1DA1F2",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: <FaYoutube />,
    url: "https://youtube.com/@skilledprozmarketplace",
    color: "#FF0000",
    bgColor: "#FF0000",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <FaInstagram />,
    url: "https://www.instagram.com/skilledproz",
    color: "#E4405F",
    bgColor: "#E4405F",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <FaTiktok />,
    url: "https://www.tiktok.com/@skilledprozmarketplace",
    color: "#000000",
    bgColor: "#000000",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FaFacebook />,
    url: "https://www.facebook.com/share/19LD9KwbZt/",
    color: "#1877F2",
    bgColor: "#1877F2",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <FaLinkedin />,
    url: "",
    color: "#0A66C2",
    bgColor: "#0A66C2",
  },
];

const SHARE_APPS = [
  { id: "whatsapp", name: "WhatsApp", icon: <FaWhatsapp />, color: "#25D366" },
  { id: "telegram", name: "Telegram", icon: <FaTelegram />, color: "#26A5E4" },
  { id: "email", name: "Email", icon: <FaEnvelope />, color: "#6B7280" },
  { id: "copy", name: "Copy Link", icon: <FaCopy />, color: "#6B7280" },
];

export default function SocialQR() {
  const [selectedPlatform, setSelectedPlatform] = useState(SOCIAL_PLATFORMS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [showShareMessage, setShowShareMessage] = useState(false);

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setIsModalOpen(true);
  };

  const handleCopyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleDownloadQR = () => {
    const svg = document.querySelector(".qr-code-container svg");
    if (svg) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = function () {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const link = document.createElement("a");
        link.download = `skilledproz-${selectedPlatform.id}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  };

  const handleShare = (app, url) => {
    const message = `📱 Follow SkilledProz on ${selectedPlatform.name}!\n\n${url}\n\nJoin the global marketplace for skilled trades! 🚀`;

    switch (app) {
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(message)}`,
          "_blank",
        );
        break;
      case "telegram":
        window.open(
          `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
          "_blank",
        );
        break;
      case "email":
        window.open(
          `mailto:?subject=Follow SkilledProz on ${selectedPlatform.name}&body=${encodeURIComponent(message)}`,
          "_blank",
        );
        break;
      case "copy":
        handleCopyLink(url);
        setShareMessage("✅ Link copied to clipboard!");
        setShowShareMessage(true);
        setTimeout(() => setShowShareMessage(false), 3000);
        break;
      default:
        break;
    }
  };

  const getShareUrl = (platform) => {
    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Follow SkilledProz on Twitter! 🚀\n\n${platform.url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(platform.url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(platform.url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`Follow SkilledProz on ${platform.name}! 🚀\n\n${platform.url}`)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(platform.url)}&text=${encodeURIComponent(`Follow SkilledProz on ${platform.name}! 🚀`)}`,
      email: `mailto:?subject=Follow SkilledProz on ${platform.name}&body=${encodeURIComponent(`Follow SkilledProz on ${platform.name}! 🚀\n\n${platform.url}`)}`,
    };
    return urls[platform.id] || platform.url;
  };

  return (
    <div className={styles.socialQR}>
      <div className={styles.header}>
        <h2 className={styles.title}>📱 Connect With Us</h2>
        <p className={styles.subtitle}>
          Follow SkilledProz on all social platforms
        </p>
      </div>

      <div className={styles.platformGrid}>
        {SOCIAL_PLATFORMS.map((platform) => (
          <button
            key={platform.id}
            className={styles.platformCard}
            onClick={() => handlePlatformSelect(platform)}
            style={{
              borderColor:
                platform.id === selectedPlatform.id
                  ? platform.color
                  : undefined,
              background:
                platform.id === selectedPlatform.id
                  ? `${platform.color}10`
                  : undefined,
            }}
            disabled={!platform.url}
          >
            <span
              className={styles.platformIcon}
              style={{ color: platform.color }}
            >
              {platform.icon}
            </span>
            <span className={styles.platformName}>{platform.name}</span>
            {!platform.url && (
              <span className={styles.platformComingSoon}>Coming Soon</span>
            )}
          </button>
        ))}
      </div>

      {/* ── QR Code Modal ── */}
      {isModalOpen && selectedPlatform.url && (
        <div
          className={styles.modalOverlay}
          onClick={() => setIsModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.modalClose}
              onClick={() => setIsModalOpen(false)}
            >
              <FaTimes />
            </button>

            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <span
                  className={styles.modalPlatformIcon}
                  style={{ color: selectedPlatform.color }}
                >
                  {selectedPlatform.icon}
                </span>
                <h3 className={styles.modalTitle}>
                  {selectedPlatform.name} QR Code
                </h3>
                <p className={styles.modalSubtitle}>
                  Scan to follow us on {selectedPlatform.name}
                </p>
              </div>

              <div className={`${styles.qrContainer} qr-code-container`}>
                <QRCodeSVG
                  value={selectedPlatform.url}
                  size={220}
                  bgColor="#ffffff"
                  fgColor="#1a1a2e"
                  level="H"
                  includeMargin={true}
                />
              </div>

              <div className={styles.qrUrl}>
                <FaLink className={styles.qrUrlIcon} />
                <span>{selectedPlatform.url}</span>
              </div>

              <div className={styles.modalActions}>
                <button onClick={handleDownloadQR} className={styles.actionBtn}>
                  <FaDownload /> Download QR
                </button>
                <button
                  onClick={() => handleCopyLink(selectedPlatform.url)}
                  className={styles.actionBtn}
                >
                  {copied ? <FaCheck /> : <FaCopy />}
                  {copied ? "Copied!" : "Copy Link"}
                </button>
              </div>

              {/* ── Share Section ── */}
              <div className={styles.shareSection}>
                <p className={styles.shareTitle}>
                  <FaShareAlt /> Share this profile
                </p>
                <div className={styles.shareButtons}>
                  {SHARE_APPS.map((app) => (
                    <button
                      key={app.id}
                      className={styles.shareBtn}
                      onClick={() => handleShare(app.id, selectedPlatform.url)}
                      style={{
                        background:
                          app.id === "copy" ? "var(--bg-card)" : app.color,
                        color:
                          app.id === "copy" ? "var(--text-dim)" : "#ffffff",
                      }}
                    >
                      {app.icon}
                      <span className={styles.shareBtnLabel}>{app.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {showShareMessage && (
                <div className={styles.shareMessage}>{shareMessage}</div>
              )}

              <div className={styles.modalFooter}>
                <span className={styles.footerNote}>
                  <FaMobileAlt /> Share and grow our community!
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
