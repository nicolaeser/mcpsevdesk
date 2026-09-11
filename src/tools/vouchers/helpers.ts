import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { recordFields } from "../../mcp/format.js";
import { accountDatevRef, accountingTypeRef, contactRef, omitUndefined } from "../../sevdesk/ids.js";
import { assertVoucherTax, expenseTax, voucherRevenueTax } from "../../sevdesk/tax.js";

export const binaryBytes = z
  .union([z.string(), z.array(z.number().int().min(0).max(255))])
  .describe(
    "Base64 string, data URL, utf8 when base64Encoded is false, raw byte array, or a filesystem path in data when using path semantics."
  );

export const attachmentFields = {
  filename: z.string().optional().describe("Original filename, e.g. receipt.pdf."),
  contentType: z.string().optional().describe("MIME type, e.g. application/pdf."),
  mimeType: z.string().optional().describe("Alias for contentType."),
  content: z.string().optional().describe("File bytes as base64, or a data URL."),
  base64: z.string().optional().describe("Alias for content."),
  data: binaryBytes.optional().describe("Base64, data URL, utf8 bytes, byte array, or filesystem path."),
  path: z.string().optional().describe("Local filesystem path. Passed through as npmsevdesk BinaryUpload string."),
  base64Encoded: z
    .boolean()
    .optional()
    .describe("Default true for string content/base64/data. false treats a string as utf8 bytes.")
};

export const attachmentInput = z.object(attachmentFields);

export const voucherPositionInput = z.object({
  taxRate: z.number().nonnegative().describe("VAT percent for this line, e.g. 19, 7, or 0."),
  net: z.boolean().describe("true = amount is net (sumNet required). false = amount is gross (sumGross required)."),
  sumNet: z.number().optional().describe("Required when net=true."),
  sumGross: z.number().optional().describe("Required when net=false."),
  accountDatevId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Required for bookkeeping 2.0 (the default). DATEV account id."),
  accountingTypeId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Required when bookkeepingSystem is 1.0."),
  comment: z.string().optional().describe("Line comment / description on the voucher.")
});

export function toBinaryUpload(input: z.infer<typeof attachmentInput>): BinaryUpload {
  const filename = input.filename;
  const contentType = input.contentType ?? input.mimeType ?? mimeFromDataUrl(stringPayload(input));
  const payload = input.content ?? input.base64 ?? input.data;
  if (payload === undefined) {
    if (input.path === undefined || input.path.length === 0) {
      throw new Error("Attachment requires content, base64, data, or path.");
    }
    return input.path;
  }
  if (Array.isArray(payload)) {
    return namedUpload(Uint8Array.from(payload), filename, contentType);
  }
  if (payload.length === 0) {
    throw new Error("Attachment content is empty.");
  }
  if (input.base64Encoded === false && !payload.startsWith("data:")) {
    return namedUpload(new TextEncoder().encode(payload), filename, contentType);
  }
  return namedUpload(decodeAttachmentBytes(payload, input.base64Encoded), filename, contentType);
}

function namedUpload(
  data: Uint8Array,
  filename: string | undefined,
  contentType: string | undefined
): BinaryUpload {
  return {
    data,
    ...(filename === undefined ? {} : { filename }),
    ...(contentType === undefined ? {} : { contentType })
  };
}

function stringPayload(input: z.infer<typeof attachmentInput>): string | undefined {
  if (typeof input.content === "string") return input.content;
  if (typeof input.base64 === "string") return input.base64;
  if (typeof input.data === "string") return input.data;
  return undefined;
}

function mimeFromDataUrl(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const match = /^data:([^;,]+)/i.exec(value);
  return match?.[1];
}

function decodeAttachmentBytes(value: string, base64Encoded: boolean | undefined): Uint8Array {
  const dataUrl = /^data:([^;,]+)?(;base64)?,([\s\S]*)$/i.exec(value);
  if (dataUrl !== null) {
    const payload = dataUrl[3] ?? "";
    if (dataUrl[2] !== undefined || base64Encoded !== false) return decodeBase64(payload);
    return new TextEncoder().encode(decodeURIComponent(payload));
  }
  if (base64Encoded === false) return new TextEncoder().encode(value);
  return decodeBase64(value);
}

export function buildVoucherFactory(
  input: {
    readonly voucherDate: string;
    readonly creditDebit: "expense" | "revenue" | "C" | "D";
    readonly description: string;
    readonly supplierName?: string | undefined;
    readonly supplierId?: string | number | undefined;
    readonly taxRule?: number | string | undefined;
    readonly bookkeepingSystem?: "1.0" | "2.0" | undefined;
    readonly positions: readonly z.infer<typeof voucherPositionInput>[];
  },
  toolName: string
) {
  const [first, ...rest] = input.positions;
  if (first === undefined) throw new Error(`${toolName} requires at least one position.`);
  const direction = input.creditDebit === "expense" || input.creditDebit === "C" ? "C" : "D";
  const system = input.bookkeepingSystem ?? "2.0";
  const taxRule = assertVoucherTax({
    direction,
    ...(input.taxRule === undefined ? {} : { taxRule: input.taxRule }),
    positionTaxRates: [first, ...rest].map((position) => position.taxRate)
  });
  return {
    voucher: omitUndefined({
      voucherDate: input.voucherDate,
      creditDebit: direction,
      description: input.description,
      supplierName: input.supplierName,
      supplier: input.supplierId === undefined ? undefined : contactRef(input.supplierId),
      tax:
        direction === "C"
          ? expenseTax({
              bookkeepingSystem: system,
              taxRule
            })
          : voucherRevenueTax({
              bookkeepingSystem: system,
              taxRule
            })
    }),
    positions: [first, ...rest].map((position) => mapPosition(position, system))
  };
}

function mapPosition(position: z.infer<typeof voucherPositionInput>, system: "1.0" | "2.0") {
  if (position.net === true && position.sumNet === undefined) {
    throw new Error("Bookkeeping voucher positions with net=true require sumNet.");
  }
  if (position.net === false && position.sumGross === undefined) {
    throw new Error("Bookkeeping voucher positions with net=false require sumGross.");
  }
  const amount =
    position.net === true
      ? { net: true as const, sumNet: position.sumNet ?? 0 }
      : { net: false as const, sumGross: position.sumGross ?? 0 };
  if (system === "1.0") {
    if (position.accountingTypeId === undefined) {
      throw new Error("Bookkeeping 1.0 voucher positions require accountingTypeId.");
    }
    return omitUndefined({
      taxRate: position.taxRate,
      comment: position.comment,
      accountingType: accountingTypeRef(position.accountingTypeId),
      ...amount
    });
  }
  if (position.accountDatevId === undefined) {
    throw new Error("Bookkeeping 2.0 voucher positions require accountDatevId.");
  }
  return omitUndefined({
    taxRate: position.taxRate,
    comment: position.comment,
    accountDatev: accountDatevRef(position.accountDatevId),
    ...amount
  });
}

export function voucherCreatedPayload(
  created: { readonly voucher: unknown; readonly filename?: string },
  upload: unknown
) {
  return {
    ...recordFields(created.voucher),
    ...(created.filename === undefined ? {} : { filename: created.filename }),
    ...(upload === undefined ? {} : { upload: recordFields(upload) })
  };
}
