import { formatDocumentsPath } from '@documenso/lib/utils/teams';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import { useToast } from '@documenso/ui/primitives/use-toast';
import type { TEnvelope } from '@documenso/lib/types/envelope';
import { useNavigate } from 'react-router';

export type DocumentRejectedFixButtonProps = {
  envelope: TEnvelope;
};

export const DocumentRejectedFixButton = ({ envelope }: DocumentRejectedFixButtonProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { mutateAsync: duplicateEnvelope, isPending } = trpc.envelope.duplicate.useMutation();

  const note = envelope.recipients.find((r) => r.rejectionReason)?.rejectionReason;
  const documentsPath = formatDocumentsPath(envelope.team.url);

  return (
    <div className="space-y-3" data-testid="rejected-fix-panel">
      <p className="font-medium text-sm">What the guardian said:</p>
      <p className="whitespace-pre-wrap rounded-lg border bg-background p-3 text-sm">
        {note || '(no note)'}
      </p>
      <Button
        className="w-full"
        loading={isPending}
        onClick={async () => {
          try {
            const { id } = await duplicateEnvelope({ envelopeId: envelope.id });
            toast({
              title: 'Copy ready',
              description: 'Change the boxes on the PDF, then send again.',
            });
            await navigate(`${documentsPath}/${id}`);
          } catch (err) {
            console.error(err);
            toast({
              title: 'Could not copy',
              description: 'Try again.',
              variant: 'destructive',
            });
          }
        }}
      >
        Fix it
      </Button>
      <p className="text-muted-foreground text-xs">
        Makes a new draft with the answers. Click boxes on the PDF to change them.
      </p>
    </div>
  );
};
