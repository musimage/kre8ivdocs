// sort-imports-ignore
import '../konva/skia-backend';

import type { Canvas } from '@documenso/skia-canvas';
import { PDF } from '@libpdf/core';
import type { Field, Recipient } from '@prisma/client';
import { FieldType } from '@prisma/client';
import Konva from 'konva';
import { groupBy } from 'remeda';

import type { TFieldMetaSchema } from '../../types/field-meta';
import { konvaTextFontFamily } from '../../universal/field-renderer/field-generic-items';
import { calculateFieldPosition } from '../../universal/field-renderer/field-renderer';
import { renderField } from '../../universal/field-renderer/render-field';
import { toCheckboxCustomText } from '../../utils/fields';
import { ensureFontLibrary } from './helpers';

/**
 * Field types a person fills by pen on the printed copy. Always left blank
 * with a line and a small label, even if a value exists.
 */
const PEN_FIELD_TYPES = new Set<FieldType>([
  FieldType.SIGNATURE,
  FieldType.FREE_SIGNATURE,
  FieldType.INITIALS,
  FieldType.DATE,
  FieldType.NAME,
  FieldType.EMAIL,
]);

const PEN_FIELD_LABEL: Partial<Record<FieldType, string>> = {
  [FieldType.SIGNATURE]: 'signature',
  [FieldType.FREE_SIGNATURE]: 'signature',
  [FieldType.INITIALS]: 'initials',
  [FieldType.DATE]: 'date',
  [FieldType.NAME]: 'printed name',
  [FieldType.EMAIL]: 'email',
};

export type PrintableField = Field;

export type PrintableRecipient = Pick<Recipient, 'id' | 'name' | 'signingOrder'>;

type PrintableItem = {
  pdfData: Uint8Array;
  fields: PrintableField[];
};

type GeneratePrintableDraftPdfOptions = {
  items: PrintableItem[];
  recipients: PrintableRecipient[];
};

const getMeta = (field: PrintableField) => (field.fieldMeta as TFieldMetaSchema | null) ?? null;

/**
 * Turn a draft field into what the export renderer should draw: the value staff
 * typed on the draft (stored in fieldMeta) becomes an inserted value. Returns
 * null when there is nothing to draw.
 */
export const toPrintableValueField = (field: PrintableField): PrintableField | null => {
  const meta = getMeta(field);

  if (field.type === FieldType.TEXT) {
    const text = meta?.type === 'text' ? (meta.text ?? '') : '';
    const value = field.inserted && field.customText ? field.customText : text;

    return value ? { ...field, inserted: true, customText: value } : null;
  }

  if (field.type === FieldType.NUMBER) {
    const value =
      field.inserted && field.customText ? field.customText : meta?.type === 'number' ? (meta.value ?? '') : '';

    return value ? { ...field, inserted: true, customText: String(value) } : null;
  }

  if (field.type === FieldType.CHECKBOX) {
    if (meta?.type !== 'checkbox') {
      return null;
    }

    const checked = (meta.values ?? []).flatMap((v, index) => (v.checked ? [index] : []));

    // Always draw checkboxes so empty boxes print for pen ticks.
    return { ...field, inserted: true, customText: toCheckboxCustomText(checked) };
  }

  if (field.type === FieldType.RADIO) {
    if (meta?.type !== 'radio') {
      return null;
    }

    const checkedIndex = (meta.values ?? []).findIndex((v) => v.checked);

    return { ...field, inserted: true, customText: checkedIndex >= 0 ? String(checkedIndex) : '' };
  }

  if (field.type === FieldType.DROPDOWN) {
    const value = meta?.type === 'dropdown' ? (meta.defaultValue ?? '') : '';

    return value ? { ...field, inserted: true, customText: value } : null;
  }

  return null;
};

const getSimpleCheckbox = (field: PrintableField) => {
  if (field.type !== FieldType.CHECKBOX) {
    return null;
  }

  const meta = getMeta(field);

  if (meta?.type !== 'checkbox' || (meta.values ?? []).length !== 1 || meta.values?.[0]?.value) {
    return null;
  }

  return { checked: Boolean(meta.values?.[0]?.checked) };
};

export const getPenFieldLabel = (field: PrintableField, recipients: PrintableRecipient[]) => {
  const meta = getMeta(field);

  if (meta && 'label' in meta && meta.label) {
    return meta.label;
  }

  const recipient = recipients.find((r) => r.id === field.recipientId);
  const who = recipient?.name?.trim() || (recipient?.signingOrder ? `Signer ${recipient.signingOrder}` : 'Signer');

  return `${who} ${PEN_FIELD_LABEL[field.type] ?? ''}`.trim();
};

const renderPageOverlay = async ({
  pageWidth,
  pageHeight,
  fields,
  recipients,
}: {
  pageWidth: number;
  pageHeight: number;
  fields: PrintableField[];
  recipients: PrintableRecipient[];
}) => {
  ensureFontLibrary();

  const stage = new Konva.Stage({ width: pageWidth, height: pageHeight });
  const layer = new Konva.Layer();

  for (const field of fields) {
    if (PEN_FIELD_TYPES.has(field.type)) {
      const { fieldX, fieldY, fieldWidth, fieldHeight } = calculateFieldPosition(
        {
          width: Number(field.width),
          height: Number(field.height),
          positionX: Number(field.positionX),
          positionY: Number(field.positionY),
        },
        pageWidth,
        pageHeight,
      );
      const labelSize = Math.max(5, Math.min(7, fieldHeight * 0.3));

      layer.add(
        new Konva.Rect({
          x: fieldX,
          y: fieldY,
          width: fieldWidth,
          height: fieldHeight,
          stroke: '#9ca3af',
          strokeWidth: 0.5,
          dash: [2, 2],
        }),
      );

      layer.add(
        new Konva.Line({
          points: [fieldX + 2, fieldY + fieldHeight - 2, fieldX + fieldWidth - 2, fieldY + fieldHeight - 2],
          stroke: '#111827',
          strokeWidth: 0.8,
        }),
      );

      layer.add(
        new Konva.Text({
          x: fieldX + 3,
          y: fieldY + 2,
          width: Math.max(fieldWidth - 6, 1),
          text: getPenFieldLabel(field, recipients),
          fontSize: labelSize,
          fontFamily: konvaTextFontFamily,
          fill: '#6b7280',
          wrap: 'none',
          ellipsis: true,
        }),
      );

      continue;
    }

    const simpleBox = getSimpleCheckbox(field);

    if (simpleBox) {
      // A single unlabeled checkbox sits on a box printed in the form. Draw a
      // box of the same size and a check mark, so no form text is covered.
      const { fieldX, fieldY, fieldWidth, fieldHeight } = calculateFieldPosition(
        {
          width: Number(field.width),
          height: Number(field.height),
          positionX: Number(field.positionX),
          positionY: Number(field.positionY),
        },
        pageWidth,
        pageHeight,
      );
      const size = Math.min(fieldWidth, fieldHeight) * 0.85;
      const x = fieldX + (fieldWidth - size) / 2;
      const y = fieldY + (fieldHeight - size) / 2;

      layer.add(new Konva.Rect({ x, y, width: size, height: size, stroke: '#111827', strokeWidth: 0.7 }));

      if (simpleBox.checked) {
        layer.add(
          new Konva.Line({
            points: [
              x + size * 0.2,
              y + size * 0.55,
              x + size * 0.42,
              y + size * 0.78,
              x + size * 0.82,
              y + size * 0.2,
            ],
            stroke: '#111827',
            strokeWidth: Math.max(1, size * 0.14),
            lineCap: 'round',
            lineJoin: 'round',
          }),
        );
      }

      continue;
    }

    const printable = toPrintableValueField(field);

    if (!printable) {
      continue;
    }

    renderField({
      scale: 1,
      field: {
        renderId: printable.id.toString(),
        ...printable,
        width: Number(printable.width),
        height: Number(printable.height),
        positionX: Number(printable.positionX),
        positionY: Number(printable.positionY),
      },
      translations: null,
      pageLayer: layer,
      pageWidth,
      pageHeight,
      mode: 'export',
    });
  }

  stage.add(layer);
  layer.draw();

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  const canvas = layer.canvas._canvas as unknown as Canvas;
  const pdf = await canvas.toBuffer('pdf');

  stage.destroy();

  return pdf;
};

const buildItemPdf = async ({ pdfData, fields }: PrintableItem, recipients: PrintableRecipient[]) => {
  const pdfDoc = await PDF.load(pdfData);

  pdfDoc.flattenAll();
  pdfDoc.upgradeVersion('1.7');

  const fieldsByPage = groupBy(fields, (field) => field.page);

  for (const [pageNumber, pageFields] of Object.entries(fieldsByPage)) {
    const page = pdfDoc.getPage(Number(pageNumber) - 1);

    if (!page) {
      continue;
    }

    const pageWidth = page.width;
    const pageHeight = page.height;

    const overlayBytes = await renderPageOverlay({ pageWidth, pageHeight, fields: pageFields, recipients });
    const overlayPdf = await PDF.load(overlayBytes);
    const embeddedPage = await pdfDoc.embedPage(overlayPdf, 0);

    let translateX = 0;
    let translateY = 0;

    switch (page.rotation) {
      case 90:
        translateX = pageHeight;
        break;
      case 180:
        translateX = pageWidth;
        translateY = pageHeight;
        break;
      case 270:
        translateY = pageWidth;
        break;
    }

    page.drawPage(embeddedPage, {
      x: translateX,
      y: translateY,
      rotate: { angle: page.rotation },
    });
  }

  pdfDoc.flattenAll();

  return await pdfDoc.save({ useXRefStream: true });
};

/**
 * KRE8ivU: printable copy of a DRAFT for paper signing. Staff-typed values are
 * burned in. Signature, initials, date, name and email spots stay blank with a
 * line and a small label. Read-only: nothing is saved or sent.
 */
export const generatePrintableDraftPdf = async ({ items, recipients }: GeneratePrintableDraftPdfOptions) => {
  const itemPdfs: Uint8Array[] = [];

  for (const item of items) {
    itemPdfs.push(await buildItemPdf(item, recipients));
  }

  if (itemPdfs.length === 1) {
    return itemPdfs[0];
  }

  const merged = await PDF.merge(itemPdfs);

  return await merged.save({ useXRefStream: true });
};
