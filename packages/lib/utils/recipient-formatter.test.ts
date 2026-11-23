import { describe, expect, it } from 'vitest';

import { extractInitials, getSigningFullName, isGenericRecipientName } from './recipient-formatter';

describe('isGenericRecipientName', () => {
  it('treats template role labels as generic', () => {
    expect(isGenericRecipientName('Guardian')).toBe(true);
    expect(isGenericRecipientName('guardian')).toBe(true);
    expect(isGenericRecipientName('Student')).toBe(true);
    expect(isGenericRecipientName('KRE8ivU Staff')).toBe(true);
    expect(isGenericRecipientName('Executive Director')).toBe(true);
  });

  it('treats a real person name as not generic', () => {
    expect(isGenericRecipientName('Jamie Example')).toBe(false);
    expect(isGenericRecipientName('Tysha Talavera')).toBe(false);
    expect(isGenericRecipientName('')).toBe(false);
  });
});

describe('getSigningFullName', () => {
  it('returns an empty string for role labels so they are not prefills', () => {
    expect(getSigningFullName('Guardian')).toBe('');
    expect(getSigningFullName('  Student  ')).toBe('');
    expect(getSigningFullName('KRE8ivU Staff')).toBe('');
    expect(getSigningFullName('Executive Director')).toBe('');
    expect(getSigningFullName('')).toBe('');
    expect(getSigningFullName(null)).toBe('');
  });

  it('returns a real name trimmed', () => {
    expect(getSigningFullName('  Jamie Example  ')).toBe('Jamie Example');
  });
});

describe('extractInitials', () => {
  it('uses the first letters of a real name', () => {
    expect(extractInitials('Jamie Example')).toBe('JE');
  });

  it('turns the role label Guardian into G, which is why it must not be used as a legal name', () => {
    expect(extractInitials('Guardian')).toBe('G');
  });
});
