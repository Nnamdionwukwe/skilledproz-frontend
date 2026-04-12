export function formatJobDuration(job) {
  if (!job) return null;

  const unit = job.estimatedUnit || "hours";
  const value = job.estimatedValue;
  const hours = job.estimatedHours;

  // Custom text — return as-is
  if (unit === "custom") return value || null;

  const num = value ? parseFloat(value) : null;

  // Unit display config
  const cfg = {
    hours: { s: "hour", p: "hours", icon: "⏱" },
    days: { s: "day", p: "days", icon: "📅" },
    weeks: { s: "week", p: "weeks", icon: "📆" },
    months: { s: "month", p: "months", icon: "🗓" },
  };
  const c = cfg[unit] || cfg.hours;

  // Primary label e.g. "3 days"
  const count = num ?? (unit === "hours" && hours ? hours : null);
  if (!count) return null;

  const primary = `${count} ${count === 1 ? c.s : c.p}`;

  // Build equivalents shown in parentheses
  const equivParts = [];

  if (unit === "months" && num) {
    const w = +(num * 4).toFixed(0);
    equivParts.push(`${w} wk${w !== 1 ? "s" : ""}`);
    const h = +(num * 160).toFixed(0);
    equivParts.push(`≈${h}h`);
  } else if (unit === "weeks" && num) {
    const d = +(num * 7).toFixed(0);
    equivParts.push(`${d} day${d !== 1 ? "s" : ""}`);
    const h = +(num * 40).toFixed(0);
    equivParts.push(`≈${h}h`);
  } else if (unit === "days" && num) {
    const h = +(num * 8).toFixed(0);
    equivParts.push(`≈${h}h`);
    if (num >= 7) {
      const w = +(num / 7).toFixed(1);
      equivParts.push(`${w} wk${w !== 1 ? "s" : ""}`);
    }
  } else if (unit === "hours" && count >= 8) {
    const d = +(count / 8).toFixed(1);
    equivParts.push(`≈${d} day${d !== 1 ? "s" : ""}`);
  }

  const suffix = equivParts.length > 0 ? ` (${equivParts.join(", ")})` : "";
  return `${primary}${suffix}`;
}

// Structured version for rich UI components
export function formatJobDurationParts(job) {
  if (!job) return null;

  const unit = job.estimatedUnit || "hours";
  const value = job.estimatedValue;
  const hours = job.estimatedHours;

  if (unit === "custom") {
    return value
      ? { primary: value, icon: "📝", equivalents: [], unit: "custom" }
      : null;
  }

  const num = value ? parseFloat(value) : null;

  const cfg = {
    hours: { s: "hour", p: "hours", icon: "⏱" },
    days: { s: "day", p: "days", icon: "📅" },
    weeks: { s: "week", p: "weeks", icon: "📆" },
    months: { s: "month", p: "months", icon: "🗓" },
  };
  const c = cfg[unit] || cfg.hours;
  const count = num ?? (unit === "hours" && hours ? hours : null);
  if (!count) return null;

  const primary = `${count} ${count === 1 ? c.s : c.p}`;
  const icon = c.icon;

  const equivalents = [];

  if (unit === "months" && num) {
    equivalents.push({
      label: `${+(num * 4).toFixed(0)} weeks`,
      unit: "weeks",
    });
    equivalents.push({
      label: `${+(num * 160).toFixed(0)} hrs`,
      unit: "hours",
    });
  } else if (unit === "weeks" && num) {
    equivalents.push({ label: `${+(num * 7).toFixed(0)} days`, unit: "days" });
    equivalents.push({ label: `${+(num * 40).toFixed(0)} hrs`, unit: "hours" });
  } else if (unit === "days" && num) {
    equivalents.push({ label: `${+(num * 8).toFixed(0)} hrs`, unit: "hours" });
    if (num >= 7)
      equivalents.push({
        label: `${+(num / 7).toFixed(1)} wks`,
        unit: "weeks",
      });
  } else if (unit === "hours" && count >= 8) {
    equivalents.push({
      label: `${+(count / 8).toFixed(1)} days`,
      unit: "days",
    });
  }

  return { primary, icon, equivalents, unit, count };
}
