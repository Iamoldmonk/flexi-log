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
    return true; // always show every day
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

  if (unit === "hour") {
    // Hour-based recurs every day (slots generated separately)
    return daysDiff >= 0;
  }

  if (unit === "day") {
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
 * Generate all past missed instances for recurring templates.
 * Returns an array of { ...template, instanceDate: "YYYY-MM-DD" } for each
 * day the checklist was scheduled but not submitted.
 * @param {Object[]} templates - Array of template objects
 * @param {Object[]} logs - Array of log objects from Firestore
 * @param {string} roleName - Current role name to filter logs
 * @param {number} [maxDays=30] - How far back to look
 * @returns {Object[]} Array of expired instance objects
 */
export function getMissedInstances(templates, logs = [], roleName = "", maxDays = 30) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const instances = [];

  // Build a set of "templateName::YYYY-MM-DD" that were submitted by this role
  const submittedSet = new Set();
  logs.forEach(log => {
    if (log.roleName !== roleName) return;
    const d = log.submittedAt ? new Date(log.submittedAt) : null;
    if (d) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      submittedSet.add(`${log.templateName}::${dateStr}`);
    }
  });

  templates.forEach(tpl => {
    const rec = tpl.recurrence;
    if (!rec) return;
    if (typeof rec === "string" && rec === "Does not repeat") return;
    if (typeof rec === "object" && rec.quick === "Does not repeat") return;

    const start = tpl.startDate ? parseDate(tpl.startDate) : null;
    if (!start) return;

    // Walk each day from start (or maxDays ago, whichever is later) to yesterday
    const lookback = new Date(today);
    lookback.setDate(lookback.getDate() - maxDays);
    const from = start > lookback ? start : lookback;

    const cursor = new Date(from);
    while (cursor < today) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(cursor.getDate()).padStart(2, "0")}`;

      // Check if this template was scheduled on this day
      if (shouldShowToday(tpl, cursor)) {
        // Check if it was submitted
        const key = `${tpl.name}::${dateStr}`;
        if (!submittedSet.has(key)) {
          instances.push({
            ...tpl,
            instanceDate: dateStr,
            instanceId: `${tpl.id}_${dateStr}`,
          });
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  });

  // Sort newest first
  instances.sort((a, b) => b.instanceDate.localeCompare(a.instanceDate));
  return instances;
}

/**
 * Generate time-slot instances for hourly-recurring templates for today.
 * Returns array of { ...template, slotHour, slotLabel, slotId } for each time slot.
 * Non-hourly templates return [template] unchanged.
 */
export function expandHourlySlots(template) {
  const rec = template.recurrence;
  if (!rec || typeof rec === "string") return [template];
  if (rec.quick !== "Custom..." || rec.unit !== "hour") return [template];

  const interval = rec.interval || 1;
  const [startH, startM] = (template.time || "08:00").split(":").map(Number);
  const slots = [];

  // Generate slots from start time every N hours until end of day (24:00)
  for (let h = startH; h < 24; h += interval) {
    const hh = String(h).padStart(2, "0");
    const mm = String(startM || 0).padStart(2, "0");
    const label = `${hh}:${mm}`;
    slots.push({
      ...template,
      slotHour: h,
      slotMinute: startM || 0,
      slotLabel: label,
      slotId: `${template.id}_${hh}${mm}`,
      id: `${template.id}_${hh}${mm}`, // override id so selector treats each slot independently
      _parentId: template.id,
    });
  }
  return slots.length > 0 ? slots : [template];
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
