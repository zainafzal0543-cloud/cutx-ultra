import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { v4 as uuidv4 } from 'uuid';

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Generate a UUID */
export function generateId(): string {
  return uuidv4();
}

/** Format percentage */
export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Debounce a function */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/** Generate distinct colors for pieces */
const PIECE_COLORS = [
  '#E8F4FD', '#FEF3C7', '#D1FAE5', '#FCE7F3', '#EDE9FE',
  '#FEE2E2', '#ECFDF5', '#FFF7ED', '#F0F9FF', '#F5F3FF',
  '#FFFBEB', '#F0FDF4', '#FFF1F2', '#F8FAFC', '#EFF6FF',
];

export function getPieceColor(index: number): string {
  return PIECE_COLORS[index % PIECE_COLORS.length];
}

export function getPieceBorderColor(index: number): string {
  const borders = [
    '#93C5FD', '#FCD34D', '#6EE7B7', '#F9A8D4', '#C4B5FD',
    '#FCA5A5', '#A7F3D0', '#FED7AA', '#BAE6FD', '#DDD6FE',
    '#FDE68A', '#BBF7D0', '#FECDD3', '#CBD5E1', '#BFDBFE',
  ];
  return borders[index % borders.length];
}

/** Truncate text */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}

/** Format date */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

/** Format relative time */
export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return formatDate(dateString);
}
