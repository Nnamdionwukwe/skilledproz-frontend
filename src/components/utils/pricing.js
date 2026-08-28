// src/utils/pricing.js
export const HIRER_FEE_RATE = 0.05;

export function calcPricing(booking, referralDiscount = 0) {
  const agreedRate = booking?.agreedRate || 0;
  const unit = booking?.estimatedUnit || "hours";
  const hours = booking?.estimatedHours;
  const value = booking?.estimatedValue
    ? parseFloat(booking.estimatedValue)
    : null;
  const currency = booking?.currency || "USD";
  const isNegotiated = booking?.isNegotiated && booking?.negotiatedRate;

  let qty = 1;
  let subtotal = 0;
  let hasQty = false;

  // For negotiated bookings, the agreedRate IS the total amount
  if (isNegotiated) {
    // Use the negotiated rate as the total
    subtotal =
      parseFloat(booking.negotiatedRate) || parseFloat(agreedRate) || 0;

    // Still show duration for reference, but don't use it in calculation
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
    } else if (value) {
      qty = value;
      hasQty = true;
    }

    // IMPORTANT: For negotiated, the "agreedRate" should be the total, not per-unit
    // But we keep the original agreedRate for display purposes
  } else {
    // Regular calculation - multiply rate by quantity
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
    } else if (unit === "custom" && value) {
      qty = value;
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
    }[unit] || "";

  const unitLabel =
    {
      hours: "hour",
      days: "day",
      weeks: "week",
      months: "month",
      years: "year",
    }[unit] || unit;

  const hirerFee = parseFloat((subtotal * HIRER_FEE_RATE).toFixed(2));
  const workerPayout = subtotal;
  const grossTotal = parseFloat((subtotal + hirerFee).toFixed(2));
  const referralSaving = currency === "NGN" ? referralDiscount : 0;
  const totalCharged = parseFloat(
    Math.max(0, grossTotal - referralSaving).toFixed(2),
  );

  return {
    agreedRate: isNegotiated ? booking.negotiatedRate : agreedRate,
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
    hasQty: (hasQty || !!(value || hours)) && unit !== "custom",
    isNegotiated,
    negotiatedRate: isNegotiated ? booking.negotiatedRate : null,
  };
}
