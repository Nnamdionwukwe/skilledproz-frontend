import { useState, useRef, useEffect } from "react";
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
  FaExternalLinkAlt,
} from "react-icons/fa";
import styles from "./SocialQR.module.css";

const SOCIAL_PLATFORMS = [
  {
    id: "telegram",
    name: "Telegram",
    icon: <FaTelegram />,
    url: "https://t.me/Skilledprozmarketplace",
    color: "#26A5E4",
  },
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

// ── QR Code with Logo Component ──
function QRCodeWithLogo({ value, size, logoSize = 50 }) {
  const containerRef = useRef(null);
  const [logoLoaded, setLogoLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      let existingLogo = container.querySelector(".qr-logo-overlay");
      if (existingLogo) {
        existingLogo.remove();
      }

      const overlay = document.createElement("div");
      overlay.className = "qr-logo-overlay";
      overlay.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: ${logoSize}px;
        height: ${logoSize}px;
        border-radius: 8px;
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        z-index: 10;
        padding: 6px;
        pointer-events: none;
      `;

      const img = document.createElement("img");
      img.src = "/skilledproz.PNG";
      img.alt = "SkilledProz";
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        border-radius: 4px;
      `;
      img.onload = () => setLogoLoaded(true);
      img.onerror = () => {
        overlay.innerHTML = `
          <div style="
            font-size: 12px;
            font-weight: 800;
            color: #f59e0b;
            text-align: center;
            line-height: 1.2;
          ">
            Skilled<br>Proz
          </div>
        `;
      };

      overlay.appendChild(img);

      if (getComputedStyle(container).position === "static") {
        container.style.position = "relative";
      }

      container.appendChild(overlay);
    }, 100);

    return () => clearTimeout(timer);
  }, [value, size, logoSize]);

  return (
    <div
      ref={containerRef}
      className="qr-code-wrapper"
      style={{ position: "relative", display: "inline-block" }}
    >
      <QRCodeSVG
        value={value}
        size={size}
        bgColor="#ffffff"
        fgColor="#1a1a2e"
        level="H"
        includeMargin={true}
      />
    </div>
  );
}

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
    const wrapper = document.querySelector(".qr-code-wrapper");
    if (!wrapper) return;

    const svg = wrapper.querySelector("svg");
    if (!svg) return;

    const clonedSvg = svg.cloneNode(true);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const size = 300;
    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);

    const svgData = new XMLSerializer().serializeToString(clonedSvg);
    const svgBlob = new Blob([svgData], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function () {
      ctx.drawImage(img, 0, 0, size, size);

      const logoImg = new Image();
      logoImg.src = "/skilledproz.PNG";
      logoImg.onload = function () {
        const logoSize = 60;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

        const link = document.createElement("a");
        link.download = `skilledproz-${selectedPlatform.id}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        URL.revokeObjectURL(url);
      };
      logoImg.onerror = function () {
        const logoSize = 60;
        const logoX = (size - logoSize) / 2;
        const logoY = (size - logoSize) / 2;

        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, logoSize / 2 + 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "#f59e0b";
        ctx.font = "bold 18px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Skilled", size / 2, size / 2 - 8);
        ctx.fillStyle = "#1a1a2e";
        ctx.font = "bold 16px Inter, sans-serif";
        ctx.fillText("Proz", size / 2, size / 2 + 18);

        const link = document.createElement("a");
        link.download = `skilledproz-${selectedPlatform.id}-qr.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        URL.revokeObjectURL(url);
      };
    };
    img.src = url;
  };

  const handleShare = (app, url) => {
    const message = shareMessageText;

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

    if (app === "copy") {
      handleCopyLink(url);
      return;
    }

    if (app === "print") {
      window.print();
      return;
    }

    if (app === "upload") {
      handleDownloadQR();
      return;
    }

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

  const visibleShareOptions = showAllShareOptions
    ? SHARE_OPTIONS
    : SHARE_OPTIONS.slice(0, 6);

  return (
    <div className={styles.socialQR}>
      <Link to="/" className={styles.backButton}>
        <FaArrowLeft /> Back to Home
      </Link>

      <div className={styles.header}>
        <h2 className={styles.title}>📱 Connect With Us</h2>
        <p className={styles.subtitle}>
          Follow SkilledProz on all social platforms
        </p>
      </div>

      {/* ── Social Platforms Grid ── */}
      <div className={styles.platformGrid}>
        {SOCIAL_PLATFORMS.map((platform) => (
          <div key={platform.id} className={styles.platformCardWrapper}>
            <button
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
            {/* ── Direct Social Link ── */}
            {platform.url && (
              <a
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.platformDirectLink}
                style={{ borderColor: platform.color }}
                title={`Follow us on ${platform.name}`}
              >
                <FaExternalLinkAlt />
                <span>Follow</span>
              </a>
            )}
          </div>
        ))}
      </div>

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
                <QRCodeWithLogo
                  value={selectedPlatform.url}
                  size={220}
                  logoSize={50}
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
