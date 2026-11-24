import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { getEnvelopeWhereInput } from '@documenso/lib/server-only/envelope/get-envelope-by-id';
import { generatePrintableDraftPdf } from '@documenso/lib/server-only/pdf/generate-printable-draft-pdf';
import { getFileServerSide } from '@documenso/lib/universal/upload/get-file.server';
import { prisma } from '@documenso/prisma';
import { DocumentStatus, EnvelopeType } from '@prisma/client';

import { authenticatedProcedure } from '../trpc';
import {
  ZDownloadDocumentPrintableRequestSchema,
  ZDownloadDocumentPrintableResponseSchema,
} from './download-document-printable.types';

/**
 * KRE8ivU: printable PDF of a DRAFT for paper signing. Read-only. Uses the same
 * visibility rules as viewing the document. Nothing is sent or changed.
 */
export const downloadDocumentPrintableRoute = authenticatedProcedure
  .input(ZDownloadDocumentPrintableRequestSchema)
  .output(ZDownloadDocumentPrintableResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { teamId } = ctx;
    const { envelopeId } = input;

    ctx.logger.info({ input: { envelopeId } });

    const { envelopeWhereInput } = await getEnvelopeWhereInput({
      id: { type: 'envelopeId', id: envelopeId },
      type: EnvelopeType.DOCUMENT,
      userId: ctx.user.id,
      teamId,
    });

    const envelope = await prisma.envelope.findFirst({
      where: envelopeWhereInput,
      include: {
        recipients: { select: { id: true, name: true, signingOrder: true } },
        fields: true,
        envelopeItems: {
          include: { documentData: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!envelope) {
      throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Envelope not found' });
    }

    if (envelope.status !== DocumentStatus.DRAFT) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, {
        message: 'Download to print is only available for drafts',
      });
    }

    const items = await Promise.all(
      envelope.envelopeItems.map(async (item) => ({
        pdfData: await getFileServerSide({ type: item.documentData.type, data: item.documentData.data }),
        fields: envelope.fields.filter((field) => field.envelopeItemId === item.id),
      })),
    );

    const pdf = await generatePrintableDraftPdf({ items, recipients: envelope.recipients });

    return {
      data: Buffer.from(pdf).toString('base64'),
      envelopeTitle: envelope.title,
    };
  });
