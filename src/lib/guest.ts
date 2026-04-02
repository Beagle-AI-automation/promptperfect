import { nanoid } from 'nanoid'

const GUEST_ID_KEY = 'pp_guest_id'
const GUEST_COUNT_KEY = 'pp_guest_count'
const GUEST_LIMIT = 5

export function getGuestId(): string {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem(GUEST_ID_KEY)
  if (!id) {
    id = `guest_${nanoid(12)}`
    localStorage.setItem(GUEST_ID_KEY, id)
  }
  return id
}

export function getGuestCount(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(GUEST_COUNT_KEY) || '0', 10)
}

export function incrementGuestCount(): number {
  const count = getGuestCount() + 1
  localStorage.setItem(GUEST_COUNT_KEY, count.toString())
  return count
}

export function isGuestLimitReached(): boolean {
  return getGuestCount() >= GUEST_LIMIT
}

export function getGuestLimit(): number {
  return GUEST_LIMIT
}

/** After guest data is migrated to a signed-in account. */
export function clearGuestSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(GUEST_ID_KEY)
  localStorage.removeItem(GUEST_COUNT_KEY)
}
