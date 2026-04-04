import { useRef } from "react";
import styles from "./BookingInvoice.module.css";

export default function BookingInvoice({ booking, trigger = true }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const content = printRef.current;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Invoice — ${booking.title}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'DM Sans', sans-serif; background: #fff; color: #111; padding: 40px; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
            .logo { font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }
            .logo span { color: #f97316; }
            .invoice-meta { text-align: right; }
            .invoice-meta h1 { font-size: 28px; font-weight: 900; letter-spacing: -1px; color: #f97316; }
            .invoice-meta p { font-size: 13px; color: #666; margin-top: 4px; }
            .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
            .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
            .party h3 { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 8px; }
            .party p { font-size: 14px; color: #111; font-weight: 600; }
            .party small { font-size: 12px; color: #666; }
            .table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
            .table th { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #999; font-weight: 600; padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .table td { padding: 12px; font-size: 13px; color: #111; border-bottom: 1px solid #f3f4f6; }
            .table td:last-child { text-align: right; font-weight: 600; }
            .totals { margin-left: auto; width: 240px; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #666; }
            .total-row.final { font-size: 16px; font-weight: 800; color: #111; border-top: 2px solid #111; padding-top: 12px; margin-top: 6px; }
            .footer { margin-top: 48px; padding-top: 24px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #999; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 100px; font-size: 11px; font-weight: 700; background: #f0fdf4; color: #16a34a; border: 1px solid #86efac; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo">Skilled<span>Proz</span></div>
            <div class="invoice-meta">
              <h1>INVOICE</h1>
              <p>#SKP-${booking.id?.slice(-8).toUpperCase()}</p>
              <p>Date: ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>

          <div class="parties">
            <div class="party">
              <h3>Billed To (Hirer)</h3>
              <p>${booking.hirer?.firstName} ${booking.hirer?.lastName}</p>
              <small>${booking.hirer?.email || ""}</small>
            </div>
            <div class="party">
              <h3>Service Provider (Worker)</h3>
              <p>${booking.worker?.firstName} ${booking.worker?.lastName}</p>
              <small>${booking.worker?.email || ""}</small>
            </div>
          </div>

          <hr class="divider" />

          <table class="table">
            <thead>
              <tr>
                <th>Service</th>
                <th>Category</th>
                <th>Date</th>
                <th>Duration</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${booking.title}</td>
                <td>${booking.category?.name || "—"}</td>
                <td>${new Date(booking.scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</td>
                <td>${booking.estimatedHours ? `${booking.estimatedHours}h` : "—"}</td>
                <td>${booking.currency} ${(booking.payment?.amount || booking.agreedRate || 0).toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal</span>
              <span>${booking.currency} ${(booking.agreedRate || 0).toLocaleString()}</span>
            </div>
            ${
              booking.payment
                ? `
            <div class="total-row">
              <span>Platform Fee</span>
              <span>− ${booking.currency} ${(booking.payment.platformFee || 0).toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Worker Payout</span>
              <span>${booking.currency} ${(booking.payment.workerPayout || 0).toLocaleString()}</span>
            </div>
            `
                : ""
            }
            <div class="total-row final">
              <span>Total Paid</span>
              <span>${booking.currency} ${(booking.payment?.amount || booking.agreedRate || 0).toLocaleString()}</span>
            </div>
          </div>

          <div class="footer">
            <p>SkilledProz Global Skills Marketplace · support@skilledproz.com</p>
            <p style="margin-top: 6px;">Booking ID: ${booking.id} · Status: ${booking.status}</p>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <button className={styles.invoiceBtn} onClick={handlePrint}>
      🧾 Download Invoice
    </button>
  );
}
