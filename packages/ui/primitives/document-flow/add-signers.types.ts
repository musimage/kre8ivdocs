import { isOptionalSendRecipient, isRecipientEmailMissing } from '@documenso/lib/constants/template';
import { ZRecipientActionAuthTypesSchema } from '@documenso/lib/types/document-auth';
import { zEmail } from '@documenso/lib/utils/zod';
import { msg } from '@lingui/core/macro';
import { DocumentSigningOrder, RecipientRole } from '@prisma/client';
import { z } from 'zod';

const ZAddSignersSignerSchema = z
  .object({
    formId: z.string().min(1),
    nativeId: z.number().optional(),
    email: z.string(),
    name: z.string(),
    role: z.nativeEnum(RecipientRole),
    signingOrder: z.number().optional(),
    actionAuth: z.array(ZRecipientActionAuthTypesSchema).optional().default([]),
  })
  .superRefine((signer, ctx) => {
    if (isOptionalSendRecipient(signer.name) && isRecipientEmailMissing(signer.email)) {
      return;
    }

    const parsed = zEmail(msg`Invalid email`.id).min(1).safeParse(signer.email);

    if (!parsed.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: parsed.error.issues[0]?.message ?? 'Invalid email',
      });
    }
  });

export const ZAddSignersFormSchema = z.object({
  signers: z.array(ZAddSignersSignerSchema),
  signingOrder: z.nativeEnum(DocumentSigningOrder),
  allowDictateNextSigner: z.boolean().default(false),
});

export type TAddSignersFormSchema = z.infer<typeof ZAddSignersFormSchema>;
