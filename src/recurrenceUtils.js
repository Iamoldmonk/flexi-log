// ─── Recurrence scheduling utility ──────────────────────────────────────────
// Determines whether a template should appear today based on its recurrence settings.

/**
 * Check if a template should be shown today based on its recurrence config.
 * @param {Object} template - The template object with recurrence, startDate, etc.
 * @param {Date} [now] - Optional override for current date (for testing)
 * @returns {boolean}
 */
export function shouldShowToday(template, now = new Date()) {
  const rec = template.recurrence;
  const startDate = template.startDate;

  // No recurrence configured — always show
  if (!rec) return true;

  // Legacy string format
  if (typeof rec === "string") {
    if (rec === "Daily" || rec === "Every day") return true;
    return true; // unknown legacy string, show by default
  }

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayDay = today.getDay(); // 0=Sun, 1=Mon, ...6=Sat

  // Parse start date
  const start = startDate ? parseDate(startDate) : null;

  // If start date is in the future, don't show yet
  if (start && today < start) return false;

  // Check end conditions first
  if (!checkEndConditions(rec, start, today, template)) return false;

  const quick = rec.quick || "Every day";

  // ── "Does not repeat" ──
  if (quick === "Does not repeat") {
    if (!start) return true; // no start date, show once
    return today.getTime() === start.getTime();
  }

  // ── "Every day" ──
  if (quick === "Every day") {
    // If specific days are selected, only show on those days
    if (rec.days && rec.days.length > 0) {
      return rec.days.includes(todayDay);
    }
    return true; // no days specified = every day
  }

  // ── "Every week" ──
  if (quick === "Every week") {
    if (rec.days && rec.days.length > 0) {
      return rec.days.includes(todayDay);
    }
    // No days selected — show on the same day of week as start date
    if (start) return todayDay === start.getDay();
    return true; // fallback: show every day
  }

  // ── "Every month" ──
  if (quick === "Every month") {
    if (!start) return true;
    const startDom = start.getDate(); // day of month
    const todayDom = today.getDate();
    // Handle months with fewer days (e.g., start on 31st, show on last day)
    if (startDom > daysInMonth(today)) {
      return todayDom === daysInMonth(today);
    }
    return todayDom === startDom;
  }

  // ── "Custom..." ──
  if (quick === "Custom...") {
    return checkCustomRecurrence(rec, start, today, todayDay);
  }

  // Unknown quick preset — show by default
  return true;
}

/**
 * Check custom recurrence with interval + unit + days
 */
function checkCustomRecurrence(rec, start, today, todayDay) {
  const interval = rec.interval || 1;
  const unit = rec.unit || "day";

  if (!start) {
    // No start date — fall back to simple checks
    if (unit === "day") return true;
    if (unit === "week" && rec.days && rec.days.length > 0) return rec.days.includes(todayDay);
    return true;
  }

  const daysDiff = Math.floor((today - start) / (1000 * 60 * 60 * 24));

  if (unit === "hour" || unit === "day") {
    // Every N days
    if (daysDiff < 0) return false;
    return daysDiff % interval === 0;
  }

  if (unit === "week") {
    // Every N weeks — check if this is a valid week AND valid day
    const weeksDiff = Math.floor(daysDiff / 7);
    const isValidWeek = weeksDiff % interval === 0;
    if (!isValidWeek) return false;
    // Check day of week
    if (rec.days && rec.days.length > 0) {
      return rec.days.includes(todayDay);
    }
    return todayDay === start.getDay();
  }

  if (unit === "month") {
    // Every N months
    const monthsDiff = (today.getFullYear() - start.getFullYear()) * 12 + (today.getMonth() - start.getMonth());
    if (monthsDiff < 0) return false;
    if (monthsDiff % interval !== 0) return false;
    // Check day of month
    const startDom = start.getDate();
    const todayDom = today.getDate();
    if (startDom > daysInMonth(today)) {
      return todayDom === daysInMonth(today);
    }
    return todayDom === startDom;
  }

  return true;
}

/**
 * Check if the recurrence has ended based on end conditions.
 */
function checkEndConditions(rec, start, today, template) {
  if (!rec.endsType || rec.endsType === "never") return true;

  if (rec.endsType === "on" && rec.endsDate) {
    const endDate = parseDate(rec.endsDate);
    if (endDate && today > endDate) return false;
  }

  if (rec.endsType === "after" && rec.endsAfter) {
    // Check submission count from localStorage
    const count = getSubmissionCount(template.id || template._docId);
    if (count >= (rec.endsAfter || 1)) return false;
  }

  return true;
}

/**
 * Track submission count for "ends after N" logic
 */
export function incrementSubmissionCount(templateId) {
  const key = "flexi_recurrence_counts";
  try {
    const counts = JSON.parse(localStorage.getItem(key) || "{}");
    counts[templateId] = (counts[templateId] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(counts));
  } catch {}
}

function getSubmissionCount(templateId) {
  try {
    const counts = JSON.parse(localStorage.getItem("flexi_recurrence_counts") || "{}");
    return counts[templateId] || 0;
  } catch { return 0; }
}

/**
 * Parse "YYYY-MM-DD" to a Date at midnight
 */
function parseDate(str) {
  if (!str) return null;
  const parts = str.split("-");
  if (parts.length !== 3) return null;
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

/**
 * Get the number of days in a month for a given date
 */
function daysInMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}
