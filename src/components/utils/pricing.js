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

  let qty = 1;
  if (value && unit !== "custom") {
    qty = value;
  } else if (hours) {
    if (unit === "hours") qty = hours;
    else if (unit === "days") qty = Math.round(hours / 8);
    else if (unit === "weeks") qty = Math.round(hours / 40);
    else if (unit === "months") qty = Math.round(hours / 160);
    else if (unit === "years") qty = Math.round(hours / 1920); // 40h/week * 48 weeks
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

  const subtotal = parseFloat((agreedRate * qty).toFixed(2));
  const hirerFee = parseFloat((subtotal * HIRER_FEE_RATE).toFixed(2));
  const workerPayout = subtotal;
  const grossTotal = parseFloat((subtotal + hirerFee).toFixed(2));
  const referralSaving = currency === "NGN" ? referralDiscount : 0;
  const totalCharged = parseFloat(
    Math.max(0, grossTotal - referralSaving).toFixed(2),
  );

  return {
    agreedRate,
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
    hasQty: !!(value || hours) && unit !== "custom",
  };
}
