import { Link } from "react-router-dom";
import styles from "./BookingDetail.module.css";
// ── Feature components (from parent folder) ──────────────────────────────
import EmergencyContact from "../EmergencyContact";
import SOSButton from "../SOSButton";
import GpsCheckIn from "../GpsCheckIn";
import InsuranceAddon from "../../hirer/InsuranceAddon";
import VideoCallButton from "../VideoCallButton";

// ── Inline helpers ──────────────────────────────────────────────────────
function Spinner() {
  return <span className={styles.spinner} />;
}

function ActionBtn({ label, color, loading, onClick }) {
  return (
    <button
      className={`${styles.actionBtn} ${styles[`actionBtn_${color}`]}`}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? <Spinner /> : label}
    </button>
  );
}

function CancelBox({
  show,
  reason,
  reasonError,
  acting,
  onOpen,
  onClose,
  onChangeReason,
  onConfirm,
}) {
  if (!show) {
    return (
      <button
        className={`${styles.actionBtn} ${styles.actionBtn_redOutline}`}
        onClick={onOpen}
      >
        Cancel Booking
      </button>
    );
  }
  return (
    <div className={styles.cancelBox}>
      <p className={styles.cancelBoxTitle}>
        Reason <span className={styles.cancelRequired}>*</span>
      </p>
      <textarea
        className={`${styles.cancelInput} ${reasonError ? styles.cancelInputError : ""}`}
        placeholder="Please explain why you are cancelling…"
        value={reason}
        onChange={(e) => onChangeReason(e.target.value)}
        rows={3}
      />
      {reasonError && <p className={styles.cancelFieldError}>{reasonError}</p>}
      <div className={styles.cancelRow}>
        <button
          className={styles.cancelConfirm}
          disabled={acting}
          onClick={onConfirm}
        >
          {acting ? <Spinner /> : "Confirm Cancellation"}
        </button>
        <button className={styles.cancelAbort} onClick={onClose}>
          Keep Booking
        </button>
      </div>
    </div>
  );
}

export default function BookingDetailSidebar({
  booking,
  payment,
  isHirer,
  isWorker,
  other,
  userId,
  acting,
  emergencyContact,
  showCancel,
  cancelReason,
  cancelError,
  onCancelOpen,
  onCancelClose,
  onCancelReasonChange,
  onCancelSubmit,
  onShowDispute,
  onSuccess,
  refetch,
  updateStatus,
}) {
  return (
    <>
      {/* Party card */}
      <div className={styles.partyCard}>
        <p className={styles.partyLabel}>{isHirer ? "Worker" : "Hirer"}</p>
        <div className={styles.partyAvatar}>
          {other?.avatar ? (
            <img src={other.avatar} alt="" />
          ) : (
            <span>
              {other?.firstName?.[0]}
              {other?.lastName?.[0]}
            </span>
          )}
        </div>
        <p className={styles.partyName}>
          {other?.firstName} {other?.lastName}
        </p>
        {other?.phone && (
          <a href={`tel:${other.phone}`} className={styles.partyPhone}>
            📱 {other.phone}
          </a>
        )}
        <a
          href={`/messages?with=${other?.id}&booking=${booking.id}`}
          className={styles.messageBtn}
        >
          💬 Send Message
        </a>
      </div>

      {/* Actions card */}
      <div className={styles.actionsCard}>
        <p className={styles.actionsTitle}>Actions</p>

        {isWorker && (
          <>
            <EmergencyContact
              bookingId={booking.id}
              bookingStatus={booking.status}
              isWorker={isWorker}
              existing={emergencyContact}
              onSaved={() => {}}
            />
            <SOSButton
              bookingId={booking.id}
              bookingStatus={booking.status}
              isWorker={isWorker}
              sosActivatedAt={booking.sosActivatedAt}
              sosResolvedAt={booking.sosResolvedAt}
              onUpdate={() => {}}
            />

            {booking.status === "PENDING" && (
              <ActionBtn
                label="Accept Booking"
                color="green"
                loading={acting}
                onClick={() => updateStatus("ACCEPTED")}
              />
            )}

            {booking.status === "ACCEPTED" && payment?.status === "HELD" && (
              <GpsCheckIn
                bookingId={booking.id}
                status={booking.status}
                isWorker={isWorker}
                jobLatitude={booking.latitude}
                jobLongitude={booking.longitude}
                onSuccess={(updated) => {
                  refetch();
                  onSuccess(
                    updated.status === "IN_PROGRESS"
                      ? "✅ Checked in — job is now in progress."
                      : "✅ Checked out — job marked as completed.",
                  );
                }}
              />
            )}

            {booking.status === "ACCEPTED" &&
              (!payment || payment.status === "PENDING") && (
                <div className={styles.waitingPayment}>
                  ⏳ Waiting for hirer to complete payment before you can check
                  in.
                </div>
              )}

            {booking.status === "IN_PROGRESS" && (
              <GpsCheckIn
                bookingId={booking.id}
                status={booking.status}
                isWorker={isWorker}
                jobLatitude={booking.latitude}
                jobLongitude={booking.longitude}
                onSuccess={() => {
                  refetch();
                  onSuccess("✅ Checked out — job marked as completed.");
                }}
              />
            )}

            {["PENDING", "ACCEPTED"].includes(booking.status) && (
              <CancelBox
                show={showCancel}
                reason={cancelReason}
                reasonError={cancelError}
                acting={acting}
                onOpen={onCancelOpen}
                onClose={onCancelClose}
                onChangeReason={onCancelReasonChange}
                onConfirm={onCancelSubmit}
              />
            )}
          </>
        )}

        {isHirer && (
          <>
            {emergencyContact?.name && (
              <div className={styles.emergencyCard}>
                <p className={styles.emergencyTitle}>
                  🚨 Worker's Emergency Contact
                </p>
                <div className={styles.emergencyRow}>
                  <span className={styles.emergencyLabel}>Name</span>
                  <span className={styles.emergencyValue}>
                    {emergencyContact.name}
                  </span>
                </div>
                <div className={styles.emergencyRow}>
                  <span className={styles.emergencyLabel}>Phone</span>
                  <a
                    href={`tel:${emergencyContact.phone}`}
                    className={styles.emergencyPhone}
                  >
                    📱 {emergencyContact.phone}
                  </a>
                </div>
                {emergencyContact.relationship && (
                  <div className={styles.emergencyRow}>
                    <span className={styles.emergencyLabel}>Relation</span>
                    <span className={styles.emergencyValue}>
                      {emergencyContact.relationship}
                    </span>
                  </div>
                )}
              </div>
            )}
            {booking.status === "ACCEPTED" && (
              <InsuranceAddon
                bookingId={booking.id}
                booking={booking}
                onPurchased={() => onSuccess("Insurance activated.")}
              />
            )}
            {payment?.status === "HELD" && (
              <Link
                to={`/bookings/${booking.id}/release`}
                className={`${styles.actionBtn} ${styles.actionBtn_green}`}
              >
                💸 Release Payment
              </Link>
            )}
            {["PENDING", "ACCEPTED"].includes(booking.status) && (
              <CancelBox
                show={showCancel}
                reason={cancelReason}
                reasonError={cancelError}
                acting={acting}
                onOpen={onCancelOpen}
                onClose={onCancelClose}
                onChangeReason={onCancelReasonChange}
                onConfirm={onCancelSubmit}
              />
            )}
          </>
        )}

        {(isHirer || isWorker) && (
          <VideoCallButton
            bookingId={booking.id}
            bookingStatus={booking.status}
            userId={userId}
            hirerId={booking.hirerId}
            workerId={booking.workerId}
          />
        )}

        {(isHirer || isWorker) &&
          ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(booking.status) && (
            <button
              className={`${styles.actionBtn} ${styles.actionBtn_red}`}
              onClick={onShowDispute}
            >
              ⚠️ Raise a Dispute
            </button>
          )}

        {!isHirer && !isWorker && (
          <p className={styles.noActions}>No actions available.</p>
        )}
      </div>
    </>
  );
}
