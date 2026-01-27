import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format large numbers with K/M suffixes
 *
 * Examples:
 * - 500 -> "500"
 * - 1500 -> "1.5K"
 * - 1000000 -> "1M"
 *
 * @param num - The number to format
 * @returns Formatted string with suffix
 */
export function formatCount(num: number): string {
  if (num >= 1_000_000) {
    const formatted = num / 1_000_000;
    return formatted % 1 === 0 ? `${formatted}M` : `${formatted.toFixed(1)}M`;
  }
  if (num >= 1_000) {
    const formatted = num / 1_000;
    return formatted % 1 === 0 ? `${formatted}K` : `${formatted.toFixed(1)}K`;
  }
  return num.toLocaleString();
}
