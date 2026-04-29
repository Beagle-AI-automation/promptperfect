/** Map Postgres unique violations on public profile constraints to user-facing copy. */
const PROFILE_DISPLAY_NAME_KEY = ['pp', '_user_profiles_display_name'].join('');
const PROFILE_AVATAR_KEY = ['pp', '_user_profiles_avatar'].join('');

export function mapProfileUniqueViolation(dbMessage: string): string {
  const m = dbMessage.toLowerCase();
  if (
    m.includes(PROFILE_DISPLAY_NAME_KEY) ||
    (m.includes('display_name') && m.includes('unique'))
  ) {
    return 'That display name is already taken. Choose a different name.';
  }
  if (
    m.includes(PROFILE_AVATAR_KEY) ||
    (m.includes('avatar_url') && m.includes('unique'))
  ) {
    return 'Another account already uses this avatar image URL. Use a different link.';
  }
  return 'That profile value is already used by another account.';
}

export function isUniqueViolation(message: string): boolean {
  return /23505|duplicate key|unique constraint/i.test(message);
}
