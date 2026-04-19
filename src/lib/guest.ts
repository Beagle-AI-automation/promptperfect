import { nanoid } from 'nanoid';

export const GUEST_LIMIT = 5;

const GUEST_ID_KEY = 'pp_guest_id';
const GUEST_COUNT_KEY = 'pp_guest_count';

/** Existing guest fingerprint only (does not create an id). Used when claiming history after login. */
export function getStoredGuestId(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(GUEST_ID_KEY)?.trim() ?? '';
}

export function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${nanoid(12)}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function getGuestCount(): number {
  if (typeof window === 'undefined') return 0;
  const n = parseInt(localStorage.getItem(GUEST_COUNT_KEY) || '0', 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function setGuestCount(count: number): void {
  if (typeof window === 'undefined') return;
  const n = Math.max(0, Math.floor(Number(count)) || 0);
  localStorage.setItem(GUEST_COUNT_KEY, String(n));
}

export function incrementGuestCount(): number {
  const count = getGuestCount() + 1;
  localStorage.setItem(GUEST_COUNT_KEY, count.toString());
  return count;
}

export function isGuestLimitReached(): boolean {
  return getGuestCount() >= GUEST_LIMIT;
}

export function getGuestLimit(): number {
  return GUEST_LIMIT;
}

/** After guest history is claimed to an account, clear fingerprint + local usage count. */
export function clearGuestLocalStorage(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_ID_KEY);
  localStorage.removeItem(GUEST_COUNT_KEY);
}
