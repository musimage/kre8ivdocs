import type { Recipient } from '@prisma/client';

export const extractInitials = (text: string) =>
  text
    .split(' ')
    .map((name: string) => name.slice(0, 1).toUpperCase())
    .slice(0, 2)
    .join('');

export const recipientAbbreviation = (recipient: Pick<Recipient, 'name' | 'email'>) => {
  return extractInitials(recipient.name) || recipient.email.slice(0, 1).toUpperCase();
};

/**
 * Role labels used as the recipient "name" on KRE8ivDocs templates.
 * These are not a person's legal name and must not prefill name, initials, or
 * typed signature, or be used by the auto-sign dialog.
 */
export const GENERIC_RECIPIENT_NAME_REGEX =
  /^(guardian|student|parent|signer|recipient|staff|kre8ivu staff|executive director|director)$/i;

export const isGenericRecipientName = (name: string | null | undefined) => {
  return GENERIC_RECIPIENT_NAME_REGEX.test((name ?? '').trim());
};

/** The name to prefill on the signing page. Empty when the recipient name is a role label. */
export const getSigningFullName = (name: string | null | undefined) => {
  const trimmed = (name ?? '').trim();

  if (!trimmed || isGenericRecipientName(trimmed)) {
    return '';
  }

  return trimmed;
};
