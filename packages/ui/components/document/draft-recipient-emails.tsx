import {
  isRecipientEmailMissing,
  isTemplateRecipientEmailPlaceholder,
} from '@documenso/lib/constants/template';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Input } from '@documenso/ui/primitives/input';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { Trans } from '@lingui/react/macro';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type DraftRecipientEmailItem = {
  id: number;
  name: string;
  email: string;
};

export type DraftRecipientEmailsHandle = {
  saveAndAssertReadyToSend: () => Promise<{ ok: true } | { ok: false; missingNames: string[] }>;
};

export type DraftRecipientEmailsProps = {
  envelopeId: string;
  recipients: DraftRecipientEmailItem[];
  disabled?: boolean;
  className?: string;
  showHint?: boolean;
  onSaved?: () => void;
};

const displayEmail = (email: string) => (isTemplateRecipientEmailPlaceholder(email) ? '' : email);

export const DraftRecipientEmails = forwardRef<DraftRecipientEmailsHandle, DraftRecipientEmailsProps>(
  ({ envelopeId, recipients, disabled, className, showHint = true, onSaved }, ref) => {
    const { toast } = useToast();
    const utils = trpc.useUtils();
    const { mutateAsync: updateRecipients, isPending } = trpc.envelope.recipient.updateMany.useMutation();

    const [values, setValues] = useState<Record<number, string>>(() =>
      Object.fromEntries(recipients.map((recipient) => [recipient.id, displayEmail(recipient.email)])),
    );
    const [errors, setErrors] = useState<Record<number, string>>({});
    const [dirty, setDirty] = useState<Record<number, boolean>>({});

    // Keep in-progress typing when the parent refreshes the recipient list.
    // Do not depend on `dirty` or a successful save will briefly flash the old
    // placeholder back into the box before the query returns.
    useEffect(() => {
      setValues((previous) => {
        const next: Record<number, string> = {};

        for (const recipient of recipients) {
          next[recipient.id] = dirty[recipient.id]
            ? (previous[recipient.id] ?? displayEmail(recipient.email))
            : displayEmail(recipient.email);
        }

        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [recipients]);

    const recipientById = useMemo(
      () => new Map(recipients.map((recipient) => [recipient.id, recipient])),
      [recipients],
    );

    const persist = async (ids?: number[]) => {
      const targetIds = ids ?? recipients.map((recipient) => recipient.id);
      const data = targetIds.flatMap((id) => {
        if (errors[id]) {
          return [];
        }

        const value = (values[id] ?? '').trim();

        if (value && !EMAIL_RE.test(value)) {
          return [];
        }

        if (isTemplateRecipientEmailPlaceholder(value)) {
          return [];
        }

        const original = recipientById.get(id)?.email ?? '';
        const originalDisplay = displayEmail(original);

        if (value === originalDisplay && !dirty[id]) {
          return [];
        }

        // Unchanged placeholder still stored as a placeholder until the user types.
        if (!value && isTemplateRecipientEmailPlaceholder(original) && !dirty[id]) {
          return [];
        }

        return [{ id, email: value }];
      });

      if (data.length === 0) {
        return true;
      }

      try {
        await updateRecipients({ envelopeId, data });
        setDirty((previous) => {
          const next = { ...previous };
          for (const row of data) {
            next[row.id] = false;
          }
          return next;
        });
        await utils.envelope.get.invalidate({ envelopeId });
        onSaved?.();
        return true;
      } catch (err) {
        console.error(err);
        toast({
          title: 'Could not save email',
          description: 'Try that email again.',
          variant: 'destructive',
        });
        return false;
      }
    };

    const validateOne = (id: number, raw: string) => {
      const value = raw.trim();

      if (!value) {
        return '';
      }

      if (isTemplateRecipientEmailPlaceholder(value) || !EMAIL_RE.test(value)) {
        return 'Enter a real email address.';
      }

      return '';
    };

    useImperativeHandle(ref, () => ({
      saveAndAssertReadyToSend: async () => {
        const nextErrors: Record<number, string> = {};
        const missingNames: string[] = [];

        for (const recipient of recipients) {
          const value = (values[recipient.id] ?? '').trim();
          const error = validateOne(recipient.id, value);

          if (error) {
            nextErrors[recipient.id] = error;
            missingNames.push(recipient.name || 'recipient');
            continue;
          }

          if (isRecipientEmailMissing(value)) {
            nextErrors[recipient.id] = 'Enter a real email address.';
            missingNames.push(recipient.name || 'recipient');
          }
        }

        setErrors(nextErrors);

        if (missingNames.length > 0) {
          return { ok: false, missingNames };
        }

        const saved = await persist(recipients.map((recipient) => recipient.id));

        if (!saved) {
          return { ok: false, missingNames: recipients.map((recipient) => recipient.name || 'recipient') };
        }

        return { ok: true };
      },
    }));

    const busy = disabled || isPending;

    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {showHint && (
          <p className="text-muted-foreground text-sm">
            <Trans>Type a real email for each person. You can do this now or when you send.</Trans>
          </p>
        )}

        {recipients.map((recipient) => {
          const error = errors[recipient.id];

          return (
            <label key={recipient.id} className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">{recipient.name || 'Recipient'}</span>
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="Email"
                maxLength={254}
                disabled={busy}
                value={values[recipient.id] ?? ''}
                aria-label={`${recipient.name || 'Recipient'} email`}
                aria-invalid={Boolean(error)}
                data-testid={`draft-recipient-email-${recipient.id}`}
                onChange={(event) => {
                  const value = event.target.value;
                  setValues((previous) => ({ ...previous, [recipient.id]: value }));
                  setDirty((previous) => ({ ...previous, [recipient.id]: true }));
                  setErrors((previous) => ({ ...previous, [recipient.id]: validateOne(recipient.id, value) }));
                }}
                onBlur={() => {
                  if (errors[recipient.id]) {
                    return;
                  }

                  void persist([recipient.id]);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    (event.currentTarget as HTMLInputElement).blur();
                  }
                }}
              />
              {error ? <span className="text-destructive text-xs">{error}</span> : null}
            </label>
          );
        })}
      </div>
    );
  },
);

DraftRecipientEmails.displayName = 'DraftRecipientEmails';
