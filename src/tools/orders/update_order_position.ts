import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, partRef, staticCountryRef, unityRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  extraFields,
  mapSalePosition,
  mergeExtra,
  positionText,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate,
  taxRuleField
} from "../../sevdesk/schemas.js";
import { assertSalesDocumentTax, salesTax } from "../../sevdesk/tax.js";
import { page } from "./helpers.js";

export const updateOrderPosition = defineTool(
    "sevdesk_update_order_position",
    "Update order position",
    "Update a draft order line. Fill name plus text/description (Leistungsbeschreibung), quantity, price, and taxRate. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      positionId: z.union([z.string(), z.number()]).describe("Order position id from sevdesk_list_order_positions."),
      name: z.string().min(1).optional().describe("Short line title printed on the PDF."),
      text: z
        .string()
        .min(1)
        .optional()
        .describe(
          "Optional Leistungsbeschreibung. Pass it when the user provided line details. Do not invent filler. Do not drop user-provided text."
        ),
      description: z
        .string()
        .min(1)
        .optional()
        .describe("Alias for text. Copied to text when text is omitted."),
      quantity: z.number().positive().optional().describe("Quantity. Must be greater than 0."),
      price: z.number().optional().describe("Unit price as a finite number."),
      priceNet: z.number().optional(),
      priceTax: z.number().optional(),
      priceGross: z.number().optional(),
      taxRate: z
        .number()
        .nonnegative()
        .optional()
        .describe("VAT percent for this line, e.g. 19, 7, or 0. Do not omit."),
      unityId: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Unity id. Default 1 is Stück/piece. Do not invent other ids."),
      partId: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Optional Part id from sevdesk_list_parts / sevdesk_find_part."),
      positionNumber: z.number().int().optional(),
      discount: z.number().optional(),
      optional: z.boolean().optional(),
      sumDiscount: z.number().optional(),
      extra: extraFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_order_position");
        const text =
          input.text === undefined && input.description === undefined
            ? undefined
            : positionText({ text: input.text, description: input.description });
        const body = mergeExtra(
          {
            ...(input.name === undefined ? {} : { name: input.name }),
            ...(text === undefined ? {} : { text }),
            ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
            ...(input.price === undefined ? {} : { price: input.price }),
            ...(input.priceNet === undefined ? {} : { priceNet: input.priceNet }),
            ...(input.priceTax === undefined ? {} : { priceTax: input.priceTax }),
            ...(input.priceGross === undefined ? {} : { priceGross: input.priceGross }),
            ...(input.taxRate === undefined ? {} : { taxRate: input.taxRate }),
            ...(input.unityId === undefined ? {} : { unity: unityRef(input.unityId) }),
            ...(input.partId === undefined ? {} : { part: partRef(input.partId) }),
            ...(input.positionNumber === undefined ? {} : { positionNumber: input.positionNumber }),
            ...(input.discount === undefined ? {} : { discount: input.discount }),
            ...(input.optional === undefined ? {} : { optional: input.optional }),
            ...(input.sumDiscount === undefined ? {} : { sumDiscount: input.sumDiscount })
          },
          input.extra
        );
        if (Object.keys(body).length === 0) {
          throw new Error("sevdesk_update_order_position requires at least one field to change.");
        }
        const result = await ctx.client.raw.orderPos.updateOrderPosition({
          path: { orderPosId: entityId(input.positionId) },
          body
        });
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        return recordFields(row);
      })
  );
