import { nanoid } from 'nanoid';

const GUEST_ID_KEY = 'pp_guest_id';
const GUEST_COUNT_KEY = 'pp_guest_count';

/** Stable id for anonymous flows (e.g. migration on signup). */
export function getGuestId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(GUEST_ID_KEY);
  if (!id) {
    id = `guest_${nanoid(12)}`;
    localStorage.setItem(GUEST_ID_KEY, id);
  }
  return id;
}

export function clearGuestSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GUEST_ID_KEY);
  localStorage.removeItem(GUEST_COUNT_KEY);
}
