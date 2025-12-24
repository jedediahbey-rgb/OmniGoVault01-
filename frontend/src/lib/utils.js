import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Convert slug/key strings to human-readable titles
 * e.g., "notice_of_interest" -> "Notice Of Interest"
 */
export function humanizeSlug(s = '') {
  if (!s) return '';
  return s
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format currency values consistently
 * Returns formatted string or fallback for empty values
 * @param {number} value - The value to format
 * @param {string} fallback - Fallback for null/undefined
 * @param {boolean} compact - Use compact notation (e.g., $50k)
 */
export function formatCurrency(value, fallback = '-', compact = false) {
  if (value === null || value === undefined || value === '') return fallback;
  
  const num = Number(value);
  const absNum = Math.abs(num);
  
  // Use compact notation for large values
  if (compact && absNum >= 1000) {
    const sign = num < 0 ? '-' : '';
    if (absNum >= 1000000) {
      const formatted = (absNum / 1000000).toFixed(absNum % 1000000 === 0 ? 0 : 1);
      return `${sign}$${formatted}M`;
    } else {
      const formatted = (absNum / 1000).toFixed(absNum % 1000 === 0 ? 0 : 1);
      return `${sign}$${formatted}k`;
    }
  }
  
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format currency with compact notation (always uses k/M for large values)
 */
export function formatCurrencyCompact(value, fallback = '-') {
  return formatCurrency(value, fallback, true);
}

/**
 * Format dates consistently
 * Handles timezone issues by parsing date-only strings as local time
 */
export function formatDate(dateStr, fallback = '-') {
  if (!dateStr) return fallback;
  try {
    let date;
    // If it's a date-only string (YYYY-MM-DD), parse as local time to avoid timezone shift
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const [year, month, day] = dateStr.split('-').map(Number);
      date = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      date = new Date(dateStr);
    }
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return fallback;
  }
}
