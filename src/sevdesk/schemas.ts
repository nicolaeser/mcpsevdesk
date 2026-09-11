import { z } from "zod";
import { confirmField, partRef, unityRef } from "./ids.js";
import { SALES_TAX_RULE_HELP, VOUCHER_TAX_RULE_HELP } from "./tax.js";

export const sevdeskDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .describe("Calendar date as YYYY-MM-DD. Do not send DD.MM.YYYY or a timestamp.");

export const isoCurrency = z
  .string()
  .regex(/^[A-Z]{3}$/, "Use ISO 4217, e.g. EUR")
  .describe("ISO 4217 currency code. Default EUR.");

export const extraFields = z
  .record(z.string(), z.unknown())
  .optional()
  .describe("Additional npmsevdesk/sevdesk fields not listed above. Merged into the payload.");

export const taxRuleField = z.union([z.number(), z.string()]).optional().describe(SALES_TAX_RULE_HELP);

export const voucherTaxRuleField = z
  .union([z.number(), z.string()])
  .optional()
  .describe(VOUCHER_TAX_RULE_HELP);

export const postalCode = z
  .union([z.string().min(1), z.number().finite()])
  .transform((value) => (typeof value === "number" ? String(Math.trunc(value)) : value.trim()))
  .describe("Postal code. String or number, e.g. 10115.");

export const vatIdValue = z
  .string()
  .min(1)
  .transform((value) => value.replace(/\s+/g, "").toUpperCase())
  .describe("VAT ID, e.g. DE123456789. Spaces are stripped.");

export const vatIdFields = z.object({
  vatId: vatIdValue.optional(),
  raw: vatIdValue.optional(),
  value: vatIdValue.optional()
});

export function pickVatId(input: {
  readonly vatId?: string | undefined;
  readonly raw?: string | undefined;
  readonly value?: string | undefined;
}): string {
  const picked = input.vatId ?? input.raw ?? input.value;
  if (picked === undefined || picked.length === 0) {
    throw new Error("Pass vatId or raw.");
  }
  return picked;
}

export const salePositionInput = z.object({
  name: z.string().min(1).describe("Short line title printed on the PDF."),
  text: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional Leistungsbeschreibung under the title. If the user gave a description, period, or line details, you MUST pass them here. Do not invent filler. Do not drop user-provided text."
    ),
  description: z
    .string()
    .min(1)
    .optional()
    .describe("Alias for text. Used when the user said description instead of text."),
  quantity: z.number().positive().describe("Quantity. Must be greater than 0."),
  price: z.number().describe("Unit price as a finite number."),
  taxRate: z
    .number()
    .nonnegative()
    .describe("VAT percent for this line, e.g. 19, 7, or 0. Do not omit."),
  unityId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Unity id. Default 1 is Stück/piece. Do not invent other ids."),
  partId: z
    .union([z.string(), z.number()])
    .optional()
    .describe("Optional Part id from sevdesk_list_parts / sevdesk_find_part."),
  extra: extraFields
});

export const documentTextFields = {
  header: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional PDF title (Rechnung, Angebot, Gutschrift). Pass it when the user named the document. Do not invent a title."
    ),
  headText: z
    .string()
    .optional()
    .describe(
      "Optional Anschreiben above the line items. Pass it when the user provided intro/greeting text. Do not invent it; do not drop it if given."
    ),
  footText: z
    .string()
    .optional()
    .describe(
      "Optional Schlusstext (payment terms, closing). Pass it when the user provided it. Do not invent it; do not drop it if given."
    ),
  address: z
    .string()
    .optional()
    .describe("Full billing address block. Omit to use the contact default address."),
  currency: isoCurrency.optional(),
  customerInternalNote: z
    .string()
    .optional()
    .describe("Internal note. Not printed on the PDF.")
};

export const sendChannelFields = {
  confirm: confirmField,
  channel: z
    .enum(["email", "mark-sent"])
    .describe(
      "email sends via sevdesk and requires toEmail, subject, and text. mark-sent records the send type. Both lock the document; only use when the user asked to send or lock."
    ),
  toEmail: z.string().email().optional().describe("Required when channel=email."),
  subject: z
    .string()
    .min(1)
    .optional()
    .describe("Email subject. Required when channel=email. Do not use a placeholder."),
  text: z
    .string()
    .min(1)
    .optional()
    .describe("Email body. Required when channel=email."),
  sendType: z
    .enum(["print", "postal", "email", "downloaded_pdf"])
    .optional()
    .describe("Used with channel=mark-sent.")
};

export function mergeExtra<T extends object>(base: T, extra: Record<string, unknown> | undefined): T {
  if (extra === undefined) return base;
  return { ...base, ...extra };
}

export function positionText(
  position: { readonly text?: string | undefined; readonly description?: string | undefined }
): string | undefined {
  const text = position.text?.trim() || position.description?.trim() || "";
  return text.length > 0 ? text : undefined;
}

export function mapSalePosition(position: z.infer<typeof salePositionInput>) {
  const text = positionText(position);
  const mapped = {
    name: position.name,
    quantity: position.quantity,
    price: position.price,
    taxRate: position.taxRate,
    unity: unityRef(position.unityId ?? 1),
    ...(text === undefined ? {} : { text }),
    ...(position.partId === undefined ? {} : { part: partRef(position.partId) })
  };
  return mergeExtra(mapped, position.extra);
}

export function coercePositionText(args: unknown): unknown {
  if (args === null || typeof args !== "object" || Array.isArray(args)) return args;
  const body = args as Record<string, unknown>;
  if (!Array.isArray(body.positions)) return args;
  return {
    ...body,
    positions: body.positions.map((item) => {
      if (item === null || typeof item !== "object" || Array.isArray(item)) return item;
      const row = item as Record<string, unknown>;
      const fromText = typeof row.text === "string" ? row.text.trim() : "";
      const fromDescription = typeof row.description === "string" ? row.description.trim() : "";
      const text = fromText.length > 0 ? fromText : fromDescription;
      return text.length > 0 ? { ...row, text } : row;
    })
  };
}

export function requireEmailFields(
  input: {
    readonly channel: "email" | "mark-sent";
    readonly toEmail?: string | undefined;
    readonly subject?: string | undefined;
    readonly text?: string | undefined;
  },
  toolName: string
): { readonly toEmail: string; readonly subject: string; readonly text: string } {
  if (input.channel !== "email") {
    throw new Error(`${toolName} expected channel=email.`);
  }
  if (input.toEmail === undefined || input.subject === undefined || input.text === undefined) {
    throw new Error(`${toolName} channel=email requires toEmail, subject, and text.`);
  }
  return { toEmail: input.toEmail, subject: input.subject, text: input.text };
}

export function parseBookingDate(value: string | number): number | Date {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || !Number.isNaN(Date.parse(trimmed))) {
    const asDate = new Date(trimmed);
    if (!Number.isNaN(asDate.getTime())) return asDate;
  }
  throw new Error(`Invalid booking date "${trimmed}". Use YYYY-MM-DD, ISO-8601, or unix seconds.`);
}

export function parseVoucherDate(value: string | number): string | Date {
  if (typeof value === "number") return new Date(value * (value < 10_000_000_000 ? 1000 : 1));
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const asDate = new Date(trimmed);
  if (!Number.isNaN(asDate.getTime())) return asDate;
  throw new Error(`Invalid voucher date "${trimmed}". Use YYYY-MM-DD or ISO-8601.`);
}
