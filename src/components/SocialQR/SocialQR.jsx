import { useState } from "react";
import { Link } from "react-router-dom";
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
  FaLink,
  FaMobileAlt,
  FaArrowLeft,
  FaPrint,
  FaUpload,
  FaSms,
  FaShare,
  FaEllipsisH,
  FaSnapchat,
  FaReddit,
  FaPinterest,
  FaDiscord,
  FaSlack,
  FaWeixin,
  FaLine,
  FaViber,
} from "react-icons/fa";
import styles from "./SocialQR.module.css";

const SOCIAL_PLATFORMS = [
  {
    id: "twitter",
    name: "Twitter/X",
    icon: <FaTwitter />,
    url: "https://x.com/skilledprozz",
    color: "#1DA1F2",
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: <FaYoutube />,
    url: "https://youtube.com/@skilledprozmarketplace",
    color: "#FF0000",
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <FaInstagram />,
    url: "https://www.instagram.com/skilledproz",
    color: "#E4405F",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <FaTiktok />,
    url: "https://www.tiktok.com/@skilledprozmarketplace",
    color: "#000000",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FaFacebook />,
    url: "https://www.facebook.com/share/19LD9KwbZt/",
    color: "#1877F2",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <FaLinkedin />,
    url: "",
    color: "#0A66C2",
  },
];

// ── All Share Options ──
const SHARE_OPTIONS = [
  {
    id: "instagram",
    name: "Instagram",
    icon: <FaInstagram />,
    color: "#E4405F",
    type: "social",
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <FaTiktok />,
    color: "#000000",
    type: "social",
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FaFacebook />,
    color: "#1877F2",
    type: "social",
  },
  {
    id: "twitter",
    name: "X/Twitter",
    icon: <FaTwitter />,
    color: "#1DA1F2",
    type: "social",
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: <FaWhatsapp />,
    color: "#25D366",
    type: "messaging",
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: <FaTelegram />,
    color: "#26A5E4",
    type: "messaging",
  },
  {
    id: "viber",
    name: "Viber",
    icon: <FaViber />,
    color: "#665CAC",
    type: "messaging",
  },
  {
    id: "line",
    name: "Line",
    icon: <FaLine />,
    color: "#00C300",
    type: "messaging",
  },
  {
    id: "weixin",
    name: "WeChat",
    icon: <FaWeixin />,
    color: "#07C160",
    type: "messaging",
  },
  {
    id: "discord",
    name: "Discord",
    icon: <FaDiscord />,
    color: "#5865F2",
    type: "social",
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: <FaReddit />,
    color: "#FF4500",
    type: "social",
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: <FaPinterest />,
    color: "#E60023",
    type: "social",
  },
  {
    id: "snapchat",
    name: "Snapchat",
    icon: <FaSnapchat />,
    color: "#FFFC00",
    type: "social",
  },
  {
    id: "slack",
    name: "Slack",
    icon: <FaSlack />,
    color: "#4A154B",
    type: "work",
  },
  {
    id: "sms",
    name: "Messages",
    icon: <FaSms />,
    color: "#34A853",
    type: "messaging",
  },
  {
    id: "email",
    name: "Email",
    icon: <FaEnvelope />,
    color: "#6B7280",
    type: "work",
  },
  {
    id: "copy",
    name: "Copy Link",
    icon: <FaCopy />,
    color: "#6B7280",
    type: "utility",
  },
  {
    id: "print",
    name: "Print",
    icon: <FaPrint />,
    color: "#6B7280",
    type: "utility",
  },
  {
    id: "upload",
    name: "Save to Photos",
    icon: <FaUpload />,
    color: "#6B7280",
    type: "utility",
  },
  {
    id: "share",
    name: "Quick Share",
    icon: <FaShare />,
    color: "#6B7280",
    type: "utility",
  },
];

export default function SocialQR() {
  const [selectedPlatform, setSelectedPlatform] = useState(SOCIAL_PLATFORMS[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [showShareMessage, setShowShareMessage] = useState(false);
  const [showAllShareOptions, setShowAllShareOptions] = useState(false);

  const shareMessageText = `📱 Follow SkilledProz on ${selectedPlatform.name}!\n\n${selectedPlatform.url}\n\nJoin the global marketplace for skilled trades! 🚀`;

  const handlePlatformSelect = (platform) => {
    if (!platform.url) return;
    setSelectedPlatform(platform);
    setIsModalOpen(true);
    setShowAllShareOptions(false);
  };

  const handleCopyLink = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setShareMessage("✅ Link copied to clipboard!");
      setShowShareMessage(true);
      setTimeout(() => {
        setCopied(false);
        setShowShareMessage(false);
      }, 3000);
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
    const message = shareMessageText;

    // Native share API (for mobile devices)
    if (app === "share" && navigator.share) {
      navigator
        .share({
          title: `Follow SkilledProz on ${selectedPlatform.name}`,
          text: message,
          url: url,
        })
        .catch(() => {});
      return;
    }

    // Copy to clipboard
    if (app === "copy") {
      handleCopyLink(url);
      return;
    }

    // Print
    if (app === "print") {
      window.print();
      return;
    }

    // Save to Photos (download)
    if (app === "upload") {
      handleDownloadQR();
      return;
    }

    // Social media sharing URLs
    const shareUrls = {
      instagram: `https://www.instagram.com/`,
      tiktok: `https://www.tiktok.com/@skilledprozmarketplace`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Follow SkilledProz on Twitter! 🚀\n\n${url}`)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`,
      viber: `https://viber://forward?text=${encodeURIComponent(message)}`,
      line: `https://line.me/R/msg/text/?${encodeURIComponent(message)}`,
      weixin: `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
      discord: `https://discord.com/channels/@me`,
      reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(`Follow SkilledProz on ${selectedPlatform.name}!`)}`,
      pinterest: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(url)}&description=${encodeURIComponent(`Follow SkilledProz on ${selectedPlatform.name}!`)}`,
      snapchat: `https://www.snapchat.com/`,
      slack: `https://slack.com/app_redirect?channel=`,
      sms: `sms:?body=${encodeURIComponent(message)}`,
      email: `mailto:?subject=Follow SkilledProz on ${selectedPlatform.name}&body=${encodeURIComponent(message)}`,
    };

    if (shareUrls[app]) {
      window.open(shareUrls[app], "_blank");
    }
  };

  // Get visible share options (first 6, then show more)
  const visibleShareOptions = showAllShareOptions
    ? SHARE_OPTIONS
    : SHARE_OPTIONS.slice(0, 6);

  return (
    <div className={styles.socialQR}>
      {/* ── Back Button ── */}
      <Link to="/" className={styles.backButton}>
        <FaArrowLeft /> Back to Home
      </Link>

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
                  Share {selectedPlatform.name} Profile
                </h3>
                <p className={styles.modalSubtitle}>
                  Scan QR code or share the profile link
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

                <div className={styles.shareGrid}>
                  {visibleShareOptions.map((app) => (
                    <button
                      key={app.id}
                      className={styles.shareBtn}
                      onClick={() => handleShare(app.id, selectedPlatform.url)}
                      style={{
                        background: app.color,
                        color:
                          app.id === "copy" ||
                          app.id === "print" ||
                          app.id === "upload"
                            ? "var(--text)"
                            : "#ffffff",
                      }}
                    >
                      {app.icon}
                      <span className={styles.shareBtnLabel}>{app.name}</span>
                    </button>
                  ))}
                </div>

                {!showAllShareOptions && SHARE_OPTIONS.length > 6 && (
                  <button
                    className={styles.showMoreBtn}
                    onClick={() => setShowAllShareOptions(true)}
                  >
                    <FaEllipsisH /> Show More
                  </button>
                )}

                {showAllShareOptions && (
                  <button
                    className={styles.showLessBtn}
                    onClick={() => setShowAllShareOptions(false)}
                  >
                    <FaTimes /> Show Less
                  </button>
                )}
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
