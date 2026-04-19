import { describe, it, expect } from 'vitest';
import { validatePassword, validateEmail } from './validation';

describe('validatePassword', () => {
  it('rejects passwords shorter than 8 chars', () => {
    const result = validatePassword('Short1');
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Password must be at least 8 characters');
  });

  it('rejects passwords without uppercase', () => {
    const result = validatePassword('password123');
    expect(result.isValid).toBe(false);
  });

  it('rejects passwords without numbers', () => {
    const result = validatePassword('PasswordOnly');
    expect(result.isValid).toBe(false);
  });

  it('accepts valid passwords', () => {
    const result = validatePassword('StrongPass1');
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateEmail', () => {
  it('validates correct emails', () => {
    expect(validateEmail('user@example.com')).toBe(true);
  });

  it('rejects invalid emails', () => {
    expect(validateEmail('notanemail')).toBe(false);
    expect(validateEmail('@missing.com')).toBe(false);
  });
});
