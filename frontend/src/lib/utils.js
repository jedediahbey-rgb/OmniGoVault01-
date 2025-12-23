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
 */
export function formatCurrency(value, fallback = '-') {
  if (value === null || value === undefined || value === '') return fallback;
  return new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Format dates consistently
 */
export function formatDate(dateStr, fallback = '-') {
  if (!dateStr) return fallback;
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return fallback;
  }
}
