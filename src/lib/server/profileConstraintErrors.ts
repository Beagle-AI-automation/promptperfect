/** Map Postgres unique violations on `pp_user_profiles` to user-facing copy. */
export function mapProfileUniqueViolation(dbMessage: string): string {
  const m = dbMessage.toLowerCase();
  if (
    m.includes('pp_user_profiles_display_name') ||
    (m.includes('display_name') && m.includes('unique'))
  ) {
    return 'That display name is already taken. Choose a different name.';
  }
  if (
    m.includes('pp_user_profiles_avatar') ||
    (m.includes('avatar_url') && m.includes('unique'))
  ) {
    return 'Another account already uses this avatar image URL. Use a different link.';
  }
  return 'That profile value is already used by another account.';
}

export function isUniqueViolation(message: string): boolean {
  return /23505|duplicate key|unique constraint/i.test(message);
}
