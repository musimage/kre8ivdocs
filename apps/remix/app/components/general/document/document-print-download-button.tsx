import { downloadFile } from '@documenso/lib/client-only/download-file';
import { base64 } from '@documenso/lib/universal/base64';
import { trpc } from '@documenso/trpc/react';
import { cn } from '@documenso/ui/lib/utils';
import { Button } from '@documenso/ui/primitives/button';
import { useToast } from '@documenso/ui/primitives/use-toast';
import { PrinterIcon } from 'lucide-react';

export type DocumentPrintDownloadButtonProps = {
  className?: string;
  envelopeId: string;
};

/**
 * KRE8ivU: download a draft as a printable PDF for paper signing.
 * Typed values are filled in. Signature, initials, date and name spots stay
 * blank. Nothing is sent and the draft stays a draft.
 */
export const DocumentPrintDownloadButton = ({ className, envelopeId }: DocumentPrintDownloadButtonProps) => {
  const { toast } = useToast();

  const { mutateAsync: downloadPrintable, isPending } = trpc.document.downloadPrintable.useMutation();

  const onClick = async () => {
    try {
      // Let any field still being typed save first.
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
        await new Promise((resolve) => setTimeout(resolve, 600));
      }

      const { data, envelopeTitle } = await downloadPrintable({ envelopeId });

      const buffer = new Uint8Array(base64.decode(data));
      const blob = new Blob([buffer], { type: 'application/pdf' });

      downloadFile({
        data: blob,
        filename: `${envelopeTitle} - print.pdf`,
      });
    } catch (error) {
      console.error(error);

      toast({
        title: 'Could not make the print copy',
        description: 'Please try again. If it keeps failing, tell Douglas.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Button
      type="button"
      className={cn('w-full', className)}
      variant="outline"
      loading={isPending}
      onClick={() => void onClick()}
      data-testid="document-print-download-button"
    >
      {!isPending && <PrinterIcon className="mr-2 h-4 w-4" />}
      Download to print
    </Button>
  );
};
