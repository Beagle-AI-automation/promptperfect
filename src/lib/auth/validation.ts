const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain an uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain a number');
  }
  return { isValid: errors.length === 0, errors };
}

export function validateEmail(email: string): boolean {
  const t = email.trim();
  if (!t || !EMAIL_RE.test(t)) return false;
  const [local, domain] = t.split('@');
  if (!local || !domain || local.startsWith('.') || !domain.includes('.')) {
    return false;
  }
  return true;
}
