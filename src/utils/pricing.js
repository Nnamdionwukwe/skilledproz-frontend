// src/utils/pricing.js  (frontend)
// Self-contained pricing utility — mirrors the backend's
// src/services/payment.service.js + src/config/fees.js so the UI
// shows the exact same totals the backend will charge.
//
// ⚠️ Keep these constants in sync with backend/src/config/fees.js
//
// Two-tier fee model:
//   NGN              → 2%  (covers Paystack's 1.5% + ₦100)
//   Any other currency → 5%  (covers Flutterwave's ~4.8% international fee)

export const NGN_HIRER_FEE_RATE = 0.02;
export const FOREIGN_HIRER_FEE_RATE = 0.05;

// Kept for backwards compatibility with existing importers that read
// HIRER_FEE_RATE directly. Defaults to the NGN rate.
export const HIRER_FEE_RATE = NGN_HIRER_FEE_RATE;

export const WORKER_FEE_RATE = 0.0;

/**
 * Get the effective hirer fee rate for a given currency.
 * NGN → 2%
 * everything else → 5%
 */
export function getHirerFeeRate(currency = "NGN") {
  const cur = (currency || "NGN").toUpperCase();
  return cur === "NGN" ? NGN_HIRER_FEE_RATE : FOREIGN_HIRER_FEE_RATE;
}

export function calcPricing(booking, referralDiscount = 0) {
  const agreedRate = Number(booking?.agreedRate) || 0;
  const unit = booking?.estimatedUnit || "hours";
  const hours = booking?.estimatedHours;
  const value = booking?.estimatedValue
    ? parseFloat(booking.estimatedValue)
    : null;
  const currency = booking?.currency || "USD";
  const isNegotiated = !!(booking?.isNegotiated && booking?.negotiatedRate);
  const quantity = booking?.quantity || 1;

  const isJobPostBooking = booking?.source === "JOB_POST";

  let qty = 1;
  let subtotal = 0;
  let hasQty = false;

  if (isJobPostBooking) {
    subtotal = parseFloat(agreedRate.toFixed(2));
    if (unit === "custom" && quantity) {
      qty = quantity;
      hasQty = true;
    } else if (value && unit !== "custom") {
      qty = value;
      hasQty = true;
    } else if (hours) {
      if (unit === "hours") qty = hours;
      else if (unit === "days") qty = Math.round(hours / 8);
      else if (unit === "weeks") qty = Math.round(hours / 40);
      else if (unit === "months") qty = Math.round(hours / 160);
      else if (unit === "years") qty = Math.round(hours / 1920);
      hasQty = true;
    }
  } else if (isNegotiated) {
    subtotal =
      parseFloat(booking.negotiatedRate) || parseFloat(agreedRate) || 0;
    if (unit === "custom" && quantity) {
      qty = quantity;
      hasQty = true;
    } else if (value && unit !== "custom") {
      qty = value;
      hasQty = true;
    } else if (hours) {
      if (unit === "hours") qty = hours;
      else if (unit === "days") qty = Math.round(hours / 8);
      else if (unit === "weeks") qty = Math.round(hours / 40);
      else if (unit === "months") qty = Math.round(hours / 160);
      else if (unit === "years") qty = Math.round(hours / 1920);
      hasQty = true;
    }
  } else if (unit === "custom") {
    const customRate = agreedRate || 0;
    const customQty = quantity || 1;
    subtotal = parseFloat((customRate * customQty).toFixed(2));
    qty = customQty;
    hasQty = true;
  } else {
    if (value && unit !== "custom") {
      qty = value;
      hasQty = true;
    } else if (hours) {
      if (unit === "hours") qty = hours;
      else if (unit === "days") qty = Math.round(hours / 8);
      else if (unit === "weeks") qty = Math.round(hours / 40);
      else if (unit === "months") qty = Math.round(hours / 160);
      else if (unit === "years") qty = Math.round(hours / 1920);
      hasQty = true;
    }
    subtotal = parseFloat((agreedRate * qty).toFixed(2));
  }

  const unitSuffix =
    {
      hours: "/hr",
      days: "/day",
      weeks: "/wk",
      months: "/mo",
      years: "/yr",
      custom: "",
    }[unit] || "";

  const unitLabel =
    {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
      years: "year",
      custom: "custom",
    }[unit] || unit;

  // ✅ Two-tier fee math — NGN (2%) vs. everything else (5%).
  const feeRate = getHirerFeeRate(currency);
  const feePercent = Math.round(feeRate * 100);

  const hirerFee = parseFloat((subtotal * feeRate).toFixed(2));
  const workerPayout = parseFloat(
    (subtotal * (1 - WORKER_FEE_RATE)).toFixed(2),
  );
  const grossTotal = parseFloat((subtotal + hirerFee).toFixed(2));

  const referralSaving = currency === "NGN" ? referralDiscount : 0;
  const totalCharged = parseFloat(
    Math.max(0, grossTotal - referralSaving).toFixed(2),
  );

  return {
    agreedRate: isJobPostBooking
      ? agreedRate
      : isNegotiated
        ? booking.negotiatedRate
        : agreedRate,
    qty,
    unit,
    unitSuffix,
    unitLabel,
    currency,
    subtotal,
    hirerFee,
    workerPayout,
    grossTotal,
    totalCharged,
    referralSaving,
    hasQty: hasQty || unit === "custom" || !!(value || hours),
    isNegotiated,
    negotiatedRate: isNegotiated ? booking.negotiatedRate : null,
    isJobPostBooking,
    // Expose the effective rate so UI labels like "Service Fee (5%)"
    // render the correct percentage per currency.
    feeRate,
    feePercent,
  };
}
