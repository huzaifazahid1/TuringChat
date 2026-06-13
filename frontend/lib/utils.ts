import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Smart "x ago" timestamp matching the screenshots. */
export function timeAgo(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d) : d;
  const diff = Math.max(0, Date.now() - t.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return t.toLocaleDateString();
}

/** Short HH:MM for chat bubbles. */
export function timeShort(d: Date | string): string {
  const t = typeof d === 'string' ? new Date(d) : d;
  return t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
