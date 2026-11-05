import { PDF_VIEWER_PAGE_SELECTOR } from '@documenso/lib/constants/pdf-viewer';
import { trpc } from '@documenso/trpc/react';
import { FieldRootContainer } from '@documenso/ui/components/field/field';
import { cn } from '@documenso/ui/lib/utils';
import { FieldContent } from '@documenso/ui/primitives/document-flow/field-content';
import { ElementVisible } from '@documenso/ui/primitives/element-visible';
import { useToast } from '@documenso/ui/primitives/use-toast';
import type { DocumentMeta, Field } from '@prisma/client';
import { FieldType } from '@prisma/client';
import { CheckIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

type FillableField = Field & {
  fieldMeta: Record<string, unknown> | null;
};

export type DocumentDraftFillFieldsProps = {
  envelopeId: string;
  fields: Field[];
  documentMeta?: Pick<DocumentMeta, 'dateFormat'>;
};

const FILLABLE = new Set<FieldType>([FieldType.TEXT, FieldType.CHECKBOX]);

const isChecked = (field: FillableField): boolean => {
  const meta = field.fieldMeta as { values?: { checked?: boolean }[] } | null;
  return Boolean(meta?.values?.[0]?.checked);
};

const textValue = (field: FillableField): string => {
  const meta = field.fieldMeta as { text?: string; label?: string; type?: string } | null;
  if (meta?.type === 'text' && typeof meta.text === 'string') return meta.text;
  return '';
};

const textLabel = (field: FillableField): string => {
  const meta = field.fieldMeta as { label?: string } | null;
  return meta?.label || 'Text';
};

/**
 * Draft-only: click TEXT/CHECKBOX overlays on the PDF to type or toggle.
 * Saves fieldMeta via envelope.field.updateMany. Signature/initials stay read-only.
 */
export const DocumentDraftFillFields = ({
  envelopeId,
  fields: initialFields,
  documentMeta,
}: DocumentDraftFillFieldsProps) => {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const { mutateAsync: updateFields } = trpc.envelope.field.updateMany.useMutation();

  const [fields, setFields] = useState<FillableField[]>(
    () => initialFields.map((f) => ({ ...f, fieldMeta: (f.fieldMeta as Record<string, unknown>) ?? null })),
  );
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftText, setDraftText] = useState('');
  const [savingId, setSavingId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  useEffect(() => {
    setFields(
      initialFields.map((f) => ({ ...f, fieldMeta: (f.fieldMeta as Record<string, unknown>) ?? null })),
    );
  }, [initialFields]);

  useEffect(() => {
    if (editingId !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select?.();
    }
  }, [editingId]);

  const persist = useCallback(
    async (field: FillableField, nextMeta: Record<string, unknown>) => {
      setSavingId(field.id);
      try {
        await updateFields({
          envelopeId,
          data: [
            {
              id: field.id,
              type: field.type,
              fieldMeta: nextMeta,
            },
          ],
        });
        setFields((prev) =>
          prev.map((f) => (f.id === field.id ? { ...f, fieldMeta: nextMeta } : f)),
        );
        void utils.envelope.get.invalidate({ envelopeId });
      } catch (err) {
        console.error(err);
        toast({
          title: 'Could not save',
          description: 'Try that box again.',
          variant: 'destructive',
        });
      } finally {
        setSavingId(null);
      }
    },
    [envelopeId, toast, updateFields, utils.envelope.get],
  );

  const saveText = useCallback(
    async (field: FillableField, value: string) => {
      const meta = { ...(field.fieldMeta ?? {}) };
      const next = {
        ...meta,
        type: 'text',
        text: value,
        readOnly: true,
      };
      setEditingId(null);
      await persist(field, next);
    },
    [persist],
  );

  const toggleCheckbox = useCallback(
    async (field: FillableField) => {
      const meta = (field.fieldMeta ?? {}) as {
        values?: { id: number; value: string; checked: boolean }[];
        direction?: string;
      };
      const values = meta.values?.length
        ? meta.values
        : [{ id: 1, value: '', checked: false }];
      const nextChecked = !Boolean(values[0]?.checked);
      const next = {
        ...meta,
        type: 'checkbox',
        values: values.map((x, i) => (i === 0 ? { ...x, checked: nextChecked } : x)),
        readOnly: true,
      };
      // Optimistic
      setFields((prev) =>
        prev.map((f) => (f.id === field.id ? { ...f, fieldMeta: next } : f)),
      );
      await persist(field, next);
    },
    [persist],
  );

  const startEditText = (field: FillableField) => {
    setDraftText(textValue(field));
    setEditingId(field.id);
  };

  return (
    <ElementVisible target={PDF_VIEWER_PAGE_SELECTOR}>
      {fields.map((field) => {
        const fillable = FILLABLE.has(field.type);
        const isEditing = editingId === field.id;
        const busy = savingId === field.id;

        if (field.type === FieldType.TEXT && isEditing) {
          const tall = Number(field.height) > 4;
          return (
            <FieldRootContainer
              key={field.id}
              field={field}
              readonly={false}
              className="!ring-primary cursor-text bg-white"
            >
              {tall ? (
                <textarea
                  ref={(el) => {
                    inputRef.current = el;
                  }}
                  className="h-full w-full resize-none bg-transparent text-[clamp(0.07rem,25cqw,0.825rem)] text-foreground outline-none"
                  value={draftText}
                  disabled={busy}
                  onChange={(e) => setDraftText(e.target.value)}
                  onBlur={() => void saveText(field, draftText)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  data-testid={`draft-fill-text-${field.id}`}
                />
              ) : (
                <input
                  ref={(el) => {
                    inputRef.current = el;
                  }}
                  className="h-full w-full bg-transparent text-[clamp(0.07rem,25cqw,0.825rem)] text-foreground outline-none"
                  value={draftText}
                  disabled={busy}
                  onChange={(e) => setDraftText(e.target.value)}
                  onBlur={() => void saveText(field, draftText)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void saveText(field, draftText);
                    }
                    if (e.key === 'Escape') {
                      setEditingId(null);
                    }
                  }}
                  data-testid={`draft-fill-text-${field.id}`}
                />
              )}
            </FieldRootContainer>
          );
        }

        if (field.type === FieldType.CHECKBOX && fillable) {
          const on = isChecked(field);
          return (
            <FieldRootContainer
              key={field.id}
              field={field}
              readonly={false}
              className={cn(
                'cursor-pointer hover:ring-primary',
                on && 'ring-primary bg-primary/10',
                busy && 'opacity-70',
              )}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={busy}
                className="flex h-full w-full items-center gap-1 px-0.5"
                onClick={() => void toggleCheckbox(field)}
                data-testid={`draft-fill-check-${field.id}`}
                title="Click to check or uncheck"
              >
                <span
                  className={cn(
                    'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border-2',
                    on
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-muted-foreground bg-white',
                  )}
                >
                  {on && <CheckIcon className="h-2.5 w-2.5" />}
                </span>
              </button>
            </FieldRootContainer>
          );
        }

        if (field.type === FieldType.TEXT && fillable) {
          const value = textValue(field);
          return (
            <FieldRootContainer
              key={field.id}
              field={field}
              readonly={false}
              className={cn('cursor-text hover:ring-primary', busy && 'opacity-70')}
            >
              <button
                type="button"
                className="flex h-full w-full items-center overflow-hidden text-left"
                onClick={() => startEditText(field)}
                data-testid={`draft-fill-text-btn-${field.id}`}
                title="Click to type"
              >
                <p
                  className={cn(
                    'w-full whitespace-pre-wrap text-[clamp(0.07rem,25cqw,0.825rem)]',
                    value ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {value || textLabel(field)}
                </p>
              </button>
            </FieldRootContainer>
          );
        }

        // Signature, initials, name, date, etc. stay display-only.
        return (
          <FieldRootContainer key={field.id} field={field} readonly={true}>
            <FieldContent field={field} documentMeta={documentMeta} />
          </FieldRootContainer>
        );
      })}
    </ElementVisible>
  );
};
