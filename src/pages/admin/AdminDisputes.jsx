import { useState, useEffect } from "react";
import api from "../../lib/api";
import AdminLayout from "../../components/layout/AdminLayout";
import styles from "./AdminDisputes.module.css";

function fmt(n) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(
    n || 0,
  );
}

function timeAgo(d) {
  if (!d) return "—";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days === 0) return "Today";
  return `${days}d ago`;
}

export default function AdminDisputes() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .get("/admin/disputes")
      .then((r) => setDisputes(r.data.data?.disputes || []))
      .finally(() => setLoading(false));
  }, []);

  async function resolve(bookingId, resolution) {
    setResolving(bookingId);
    try {
      await api.patch(`/admin/disputes/${bookingId}/resolve`, {
        resolution,
        refundHirer: resolution === "REFUND",
        releaseToWorker: resolution === "RELEASE",
        adminNotes: notes,
      });
      setDisputes((prev) => prev.filter((d) => d.id !== bookingId));
      setSelected(null);
      setSuccess(
        `Dispute resolved — ${resolution === "REFUND" ? "hirer refunded" : "payment released to worker"}`,
      );
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setResolving(null);
      setNotes("");
    }
  }

  return (
    <AdminLayout>
      <div className={styles.page}>
        {success && <div className={styles.successBanner}>✅ {success}</div>}

        <div className={styles.headerRow}>
          <div>
            <h1 className={styles.title}>Disputes</h1>
            <p className={styles.sub}>
              {disputes.length} active · Review and resolve each case
            </p>
          </div>
        </div>

        {loading ? (
          <div className={styles.skList}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={styles.skeleton}
                style={{ height: 100 }}
              />
            ))}
          </div>
        ) : disputes.length === 0 ? (
          <div className={styles.empty}>
            <span>⚖️</span>
            <p>No active disputes</p>
            <small>All disputes have been resolved. Great work! 🎉</small>
          </div>
        ) : (
          <div className={styles.disputeList}>
            {disputes.map((d, i) => (
              <div
                key={d.id}
                className={`${styles.disputeCard} ${selected?.id === d.id ? styles.disputeCardOpen : ""}`}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div
                  className={styles.disputeCardHeader}
                  onClick={() => setSelected(selected?.id === d.id ? null : d)}
                >
                  <div className={styles.disputeAvatars}>
                    <div className={styles.da}>{d.hirer?.firstName?.[0]}</div>
                    <div className={`${styles.da} ${styles.daB}`}>
                      {d.worker?.firstName?.[0]}
                    </div>
                  </div>

                  <div className={styles.disputeMain}>
                    <h3 className={styles.disputeTitle}>{d.title}</h3>
                    <p className={styles.disputePeople}>
                      <span className={styles.hirerSpan}>
                        🧑 {d.hirer?.firstName} {d.hirer?.lastName}
                      </span>
                      <span className={styles.vsDot}>vs</span>
                      <span className={styles.workerSpan}>
                        🔨 {d.worker?.firstName} {d.worker?.lastName}
                      </span>
                    </p>
                    <p className={styles.disputeMeta}>
                      {d.category?.name} · Opened {timeAgo(d.updatedAt)}
                    </p>
                  </div>

                  <div className={styles.disputeRight}>
                    <span className={styles.disputeAmount}>
                      ₦{fmt(d.agreedRate)}
                    </span>
                    {d.payment && (
                      <span className={styles.escrowPill}>
                        {d.payment.status === "HELD"
                          ? "🔒 In Escrow"
                          : d.payment.status}
                      </span>
                    )}
                    <span className={styles.chevron}>
                      {selected?.id === d.id ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                {selected?.id === d.id && (
                  <div className={styles.disputeDetail}>
                    <div className={styles.partyCards}>
                      <div className={styles.partyCard}>
                        <div className={styles.partyLabel}>Hirer</div>
                        <div className={styles.partyName}>
                          {d.hirer?.firstName} {d.hirer?.lastName}
                        </div>
                        <div className={styles.partyEmail}>
                          {d.hirer?.email}
                        </div>
                      </div>
                      <div className={styles.vsText}>vs</div>
                      <div className={styles.partyCard}>
                        <div className={styles.partyLabel}>Worker</div>
                        <div className={styles.partyName}>
                          {d.worker?.firstName} {d.worker?.lastName}
                        </div>
                        <div className={styles.partyEmail}>
                          {d.worker?.email}
                        </div>
                      </div>
                    </div>

                    {d.payment && (
                      <div className={styles.paymentInfo}>
                        <div className={styles.payInfoRow}>
                          <span>Total paid</span>
                          <span>₦{fmt(d.payment.amount)}</span>
                        </div>
                        <div className={styles.payInfoRow}>
                          <span>Worker payout</span>
                          <span>₦{fmt(d.payment.workerPayout)}</span>
                        </div>
                        <div className={styles.payInfoRow}>
                          <span>Platform fee</span>
                          <span>₦{fmt(d.payment.platformFee)}</span>
                        </div>
                        <div className={styles.payInfoRow}>
                          <span>Provider</span>
                          <span>{d.payment.provider}</span>
                        </div>
                      </div>
                    )}

                    <div className={styles.notesSection}>
                      <label className={styles.notesLabel}>
                        Admin notes (optional)
                      </label>
                      <textarea
                        className={styles.notesInput}
                        placeholder="Document your decision..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                      />
                    </div>

                    <div className={styles.resolveActions}>
                      <button
                        className={styles.refundBtn}
                        onClick={() => resolve(d.id, "REFUND")}
                        disabled={resolving === d.id}
                      >
                        {resolving === d.id ? "…" : "💸 Refund Hirer"}
                      </button>
                      <button
                        className={styles.releaseBtn}
                        onClick={() => resolve(d.id, "RELEASE")}
                        disabled={resolving === d.id}
                      >
                        {resolving === d.id ? "…" : "✅ Release to Worker"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
