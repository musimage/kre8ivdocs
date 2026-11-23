import { AppError } from '@documenso/lib/errors/app-error';
import type { TEnvelope } from '@documenso/lib/types/envelope';
import { formatDocumentsPath } from '@documenso/lib/utils/teams';
import { trpc } from '@documenso/trpc/react';
import {
  DraftRecipientEmails,
  type DraftRecipientEmailsHandle,
} from '@documenso/ui/components/document/draft-recipient-emails';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@documenso/ui/primitives/dialog';
import { Tabs, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';
import { DocumentDistributionMethod, DocumentStatus } from '@prisma/client';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { getDistributeErrorMessage } from '~/utils/toast-error-messages';

export type DocumentPageViewSendDialogProps = {
  envelope: TEnvelope;
};

export const DocumentPageViewSendDialog = ({ envelope }: DocumentPageViewSendDialogProps) => {
  const { toast } = useToast();
  const { _ } = useLingui();
  const navigate = useNavigate();
  const draftEmailsRef = useRef<DraftRecipientEmailsHandle>(null);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [distributionMethod, setDistributionMethod] = useState<DocumentDistributionMethod>(
    envelope.documentMeta?.distributionMethod ?? DocumentDistributionMethod.EMAIL,
  );
  const utils = trpc.useUtils();
  const { mutateAsync: distributeEnvelope } = trpc.envelope.distribute.useMutation();

  if (envelope.status !== DocumentStatus.DRAFT) {
    return null;
  }

  const documentRootPath = formatDocumentsPath(envelope.team.url);
  const isLinkOnly = distributionMethod === DocumentDistributionMethod.NONE;

  const onSend = async () => {
    if (sending) {
      return;
    }

    setSending(true);

    try {
      if (draftEmailsRef.current) {
        const result = await draftEmailsRef.current.saveAndAssertReadyToSend();

        if (!result.ok) {
          toast({
            title: 'Add recipient emails',
            description: `Fill in a real email for every required recipient before sending (missing: ${result.missingNames.join(', ')}). Placeholder or blank emails cannot be sent.`,
            variant: 'destructive',
            duration: 7500,
          });
          return;
        }
      }

      await distributeEnvelope({
        envelopeId: envelope.id,
        meta: {
          distributionMethod,
        },
      });

      await utils.envelope.get.invalidate({ envelopeId: envelope.id });
      setOpen(false);

      const nextPath = isLinkOnly
        ? `${documentRootPath}/${envelope.id}?action=view-signing-links`
        : `${documentRootPath}/${envelope.id}`;

      await navigate(nextPath);
    } catch (err) {
      const error = AppError.parseError(err);
      const errorMessage = getDistributeErrorMessage(error.code);

      toast({
        title: _(errorMessage.title),
        description:
          error.code === 'MISSING_RECIPIENT_EMAIL' && error.message ? error.message : _(errorMessage.description),
        variant: 'destructive',
        duration: 7500,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-primary" size="lg" data-testid="document-page-send-button">
          <Trans>Send</Trans>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            <Trans>Send Document</Trans>
          </DialogTitle>
          <DialogDescription>
            {isLinkOnly ? (
              <Trans>
                No emails will be sent. After you send, you can copy the signing links and share them yourself.
              </Trans>
            ) : (
              <Trans>
                Check the emails, then send. The student email can be left blank if the student has no email.
              </Trans>
            )}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={distributionMethod}
          onValueChange={(value) => setDistributionMethod(value as DocumentDistributionMethod)}
          className="mb-2"
        >
          <TabsList className="w-full">
            <TabsTrigger
              className="w-full"
              value={DocumentDistributionMethod.EMAIL}
              data-testid="document-page-send-method-email"
            >
              <Trans>Email</Trans>
            </TabsTrigger>
            <TabsTrigger
              className="w-full"
              value={DocumentDistributionMethod.NONE}
              data-testid="document-page-send-method-none"
            >
              <Trans>None</Trans>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <DraftRecipientEmails
          ref={draftEmailsRef}
          envelopeId={envelope.id}
          recipients={envelope.recipients.map((recipient) => ({
            id: recipient.id,
            name: recipient.name,
            email: recipient.email,
          }))}
        />

        <DialogFooter className="mt-4 gap-2 sm:gap-2">
          <Button type="button" variant="secondary" onClick={() => setOpen(false)} disabled={sending}>
            <Trans>Cancel</Trans>
          </Button>
          <Button
            type="button"
            className="bg-primary"
            onClick={() => void onSend()}
            loading={sending}
            data-testid="document-page-send-confirm"
          >
            {isLinkOnly ? <Trans>Create signing links</Trans> : <Trans>Send</Trans>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
