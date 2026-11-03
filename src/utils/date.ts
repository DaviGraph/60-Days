// Timezone utilities for Africa/Lagos (UTC+1)

export const CHALLENGE_START = '2026-11-01T00:00:00+01:00';
export const CHALLENGE_END = '2027-01-01T00:00:00+01:00';
export const TOTAL_GOAL_NGN = 500000;
export const TOTAL_DAYS = 61;

/**
 * Returns current Date adjusted to Africa/Lagos time components.
 */
export function getLagosNow(): Date {
  return new Date();
}

/**
 * Returns YYYY-MM-DD for a given date in Africa/Lagos timezone.
 */
export function getLagosDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Formats amount in NGN with ₦ symbol and zero decimal places.
 */
export function formatNGN(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculates current "Day N" of 61.
 * Whole days since START + 1, capped at 61.
 * If before START, returns 1. If after END, returns 61.
 */
export function getDayNumber(now: Date = new Date()): number {
  const startMs = new Date(CHALLENGE_START).getTime();
  const currentMs = now.getTime();

  if (currentMs < startMs) {
    return 1;
  }

  const diffMs = currentMs - startMs;
  const day = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(day, 1), TOTAL_DAYS);
}

export interface CountdownInfo {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
  totalRemainingMs: number;
}

/**
 * Countdown to CHALLENGE_END (2027-01-01T00:00:00+01:00) calculated from fixed dates.
 */
export function getCountdown(now: Date = new Date()): CountdownInfo {
  const endMs = new Date(CHALLENGE_END).getTime();
  const currentMs = now.getTime();
  const diff = endMs - currentMs;

  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
      totalRemainingMs: 0,
    };
  }

  const seconds = Math.floor((diff / 1000) % 60);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  return {
    days,
    hours,
    minutes,
    seconds,
    isComplete: false,
    totalRemainingMs: diff,
  };
}

/**
 * Days left for daily run rate calculation.
 * Always at least 1 day left to avoid division by zero.
 */
export function getDaysLeft(now: Date = new Date()): number {
  const countdown = getCountdown(now);
  if (countdown.isComplete) return 0;
  // If remaining is less than 24 hours, count as 1 day left
  const days = Math.ceil(countdown.totalRemainingMs / (24 * 60 * 60 * 1000));
  return Math.max(days, 1);
}

/**
 * Friendly label for dates: "Today", "Yesterday", or "12 Nov 2026"
 */
export function getFriendlyDateLabel(dateStr: string, now: Date = new Date()): string {
  const todayStr = getLagosDateString(now);
  if (dateStr === todayStr) return 'Today';

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = getLagosDateString(yesterday);
  if (dateStr === yesterdayStr) return 'Yesterday';

  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  }

  return dateStr;
}
