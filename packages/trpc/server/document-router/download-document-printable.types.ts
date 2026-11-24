import { z } from 'zod';

export const ZDownloadDocumentPrintableRequestSchema = z.object({
  envelopeId: z.string(),
});

export const ZDownloadDocumentPrintableResponseSchema = z.object({
  data: z.string(),
  envelopeTitle: z.string(),
});

export type TDownloadDocumentPrintableRequest = z.infer<typeof ZDownloadDocumentPrintableRequestSchema>;
export type TDownloadDocumentPrintableResponse = z.infer<typeof ZDownloadDocumentPrintableResponseSchema>;
