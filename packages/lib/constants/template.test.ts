import { describe, expect, it } from 'vitest';

import {
  isOptionalSendRecipient,
  isRecipientEmailMissing,
  isRecipientEmailRequiredForSend,
  isTemplateRecipientEmailPlaceholder,
} from './template';

describe('isTemplateRecipientEmailPlaceholder', () => {
  it('matches official Documenso placeholders', () => {
    expect(isTemplateRecipientEmailPlaceholder('recipient.1@documenso.com')).toBe(true);
    expect(isTemplateRecipientEmailPlaceholder('Recipient.2@Documenso.com')).toBe(true);
  });

  it('matches KRE8ivU placeholder addresses', () => {
    expect(isTemplateRecipientEmailPlaceholder('guardian@placeholder.kre8ivu.org')).toBe(true);
    expect(isTemplateRecipientEmailPlaceholder('student@placeholder.kre8ivu.org')).toBe(true);
    expect(isTemplateRecipientEmailPlaceholder('staff@placeholder.kre8ivu.org')).toBe(true);
    expect(isTemplateRecipientEmailPlaceholder('ed@placeholder.kre8ivu.org')).toBe(true);
    expect(isTemplateRecipientEmailPlaceholder('  Guardian@Placeholder.kre8ivu.org  ')).toBe(true);
  });

  it('does not match real emails', () => {
    expect(isTemplateRecipientEmailPlaceholder('tysha@kre8ivu.org')).toBe(false);
    expect(isTemplateRecipientEmailPlaceholder('douglas@kre8ivu.org')).toBe(false);
    expect(isTemplateRecipientEmailPlaceholder('parent@gmail.com')).toBe(false);
    expect(isTemplateRecipientEmailPlaceholder('')).toBe(false);
  });
});

describe('isRecipientEmailMissing', () => {
  it('treats blank and placeholder emails as missing', () => {
    expect(isRecipientEmailMissing('')).toBe(true);
    expect(isRecipientEmailMissing('   ')).toBe(true);
    expect(isRecipientEmailMissing(null)).toBe(true);
    expect(isRecipientEmailMissing(undefined)).toBe(true);
    expect(isRecipientEmailMissing('guardian@placeholder.kre8ivu.org')).toBe(true);
    expect(isRecipientEmailMissing('recipient.1@documenso.com')).toBe(true);
  });

  it('treats real emails as present', () => {
    expect(isRecipientEmailMissing('parent@gmail.com')).toBe(false);
    expect(isRecipientEmailMissing('tysha@kre8ivu.org')).toBe(false);
  });
});

describe('isOptionalSendRecipient', () => {
  it('matches the Student recipient name only', () => {
    expect(isOptionalSendRecipient('Student')).toBe(true);
    expect(isOptionalSendRecipient('student')).toBe(true);
    expect(isOptionalSendRecipient('  Student  ')).toBe(true);
    expect(isOptionalSendRecipient('Guardian')).toBe(false);
    expect(isOptionalSendRecipient('KRE8ivU Staff')).toBe(false);
    expect(isOptionalSendRecipient('Executive Director')).toBe(false);
    expect(isOptionalSendRecipient('')).toBe(false);
    expect(isOptionalSendRecipient(null)).toBe(false);
  });
});

describe('isRecipientEmailRequiredForSend', () => {
  it('requires guardian, staff and ED emails, but not the student', () => {
    expect(isRecipientEmailRequiredForSend('Guardian')).toBe(true);
    expect(isRecipientEmailRequiredForSend('KRE8ivU Staff')).toBe(true);
    expect(isRecipientEmailRequiredForSend('Executive Director')).toBe(true);
    expect(isRecipientEmailRequiredForSend('Student')).toBe(false);
  });
});
