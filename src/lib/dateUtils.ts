// ─── Timezone-safe date utilities ─────────────────────────────────────────────
// Extracted from CurationForm — shared by CurationForm and TailorForm.

/** Returns today's date as "YYYY-MM-DD" using the local clock (no UTC shift). */
export function getLocalToday(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Parse a "YYYY-MM-DD" string as a LOCAL date.
 * Avoids the UTC midnight → previous-day rollback that `new Date(str)` causes
 * in negative-offset timezones (US/Eastern, US/Pacific, etc.).
 */
export function parseDateLocal(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight — no UTC offset applied
}

/** Serialise a Date back to "YYYY-MM-DD" using the local clock. */
export function formatDateLocal(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Compute the inclusive day count between two ISO date strings.
 * Uses Math.round (not Math.ceil) to guard against DST ±1 h drift
 * causing a fractional day to ceil up to an extra day.
 * Result is clamped to [1, maxDays].
 */
export function computeDuration(
  departure: string,
  returnDate: string,
  maxDays: number
): number {
  if (!departure || !returnDate) return 1;
  const diff = Math.round(
    (parseDateLocal(returnDate).getTime() - parseDateLocal(departure).getTime()) /
      86_400_000
  );
  // +1 for inclusive counting: departure day is Day 1.
  // July 1 → July 3 = 2 nights = 3 inclusive days.
  return Math.min(maxDays, Math.max(1, diff + 1));
}
