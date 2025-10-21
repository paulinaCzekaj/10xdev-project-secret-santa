/**
 * Date validation utilities for form validation
 */

/**
 * Check if a date is in the future (after today)
 * @param date - Date to validate
 * @returns true if date is in the future, false otherwise
 */
export function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today;
}

/**
 * Get the minimum future date (N days from now)
 * @param daysFromNow - Number of days from today (default: 1)
 * @returns Date object set to N days from now at midnight
 */
export function getMinimumFutureDate(daysFromNow = 1): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Check if a date is within a specified range
 * @param date - Date to check
 * @param minDate - Minimum allowed date
 * @param maxDate - Maximum allowed date
 * @returns true if date is within range, false otherwise
 */
export function isDateInRange(date: Date, minDate: Date, maxDate: Date): boolean {
  return date >= minDate && date <= maxDate;
}
