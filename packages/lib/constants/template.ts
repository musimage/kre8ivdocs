import { msg } from '@lingui/core/macro';

/**
 * Official Documenso placeholders plus KRE8ivU template placeholders.
 * The Use dialog clears emails that match this so staff can type real addresses.
 */
export const TEMPLATE_RECIPIENT_EMAIL_PLACEHOLDER_REGEX =
  /^(?:recipient\.\d+@documenso\.com|[^@\s]+@placeholder\.kre8ivu\.org)$/i;
export const TEMPLATE_RECIPIENT_NAME_PLACEHOLDER_REGEX = /Recipient \d+/i;

export const isTemplateRecipientEmailPlaceholder = (email: string) => {
  return TEMPLATE_RECIPIENT_EMAIL_PLACEHOLDER_REGEX.test(email.trim());
};

/** True when an email is blank or a template placeholder (not sendable). */
export const isRecipientEmailMissing = (email: string | null | undefined) => {
  const value = email?.trim() ?? '';

  return value === '' || isTemplateRecipientEmailPlaceholder(value);
};

/** Guardian-form drafts use the recipient name "Student". A blank student email is allowed. */
export const OPTIONAL_SEND_RECIPIENT_NAME_REGEX = /^student$/i;

export const isOptionalSendRecipient = (name: string | null | undefined) => {
  return OPTIONAL_SEND_RECIPIENT_NAME_REGEX.test((name ?? '').trim());
};

/** True when this recipient must have a real email before Send. */
export const isRecipientEmailRequiredForSend = (name: string | null | undefined) => {
  return !isOptionalSendRecipient(name);
};

export const DIRECT_TEMPLATE_DOCUMENTATION = [
  {
    title: msg`Enable Direct Link Signing`,
    description: msg`Once enabled, you can select any active recipient to be a direct link signing recipient, or create a new one. This recipient type cannot be edited or deleted.`,
  },
  {
    title: msg`Configure Direct Recipient`,
    description: msg`Update the role and add fields as required for the direct recipient. The individual who uses the direct link will sign the document as the direct recipient.`,
  },
  {
    title: msg`Share the Link`,
    description: msg`Once your template is set up, share the link anywhere you want. The person who opens the link will be able to enter their information in the direct link recipient field and complete any other fields assigned to them.`,
  },
  {
    title: msg`Document Creation`,
    description: msg`After submission, a document will be automatically generated and added to your documents page. You will also receive a notification via email.`,
  },
];
