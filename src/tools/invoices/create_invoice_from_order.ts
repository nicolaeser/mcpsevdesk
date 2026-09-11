import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, firstId, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  extraFields,
  mapSalePosition,
  mergeExtra,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate,
  taxRuleField
} from "../../sevdesk/schemas.js";
import { assertSalesDocumentTax, salesTax } from "../../sevdesk/tax.js";

export const createInvoiceFromOrder = defineTool(
    "sevdesk_create_invoice_from_order",
    "Create invoice from order",
    "Create a draft invoice from an order. Do not send or mark-sent unless the user asked to send or lock. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      orderId: z.union([z.string(), z.number()]),
      type: z.enum(["percentage", "net", "gross"]).optional().describe("Partial invoice amount type."),
      amount: z.number().optional(),
      partialType: z.enum(["RE", "TR", "AR"]).optional().describe("RE final, TR partial, AR advance.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_invoice_from_order");
        const result = await ctx.client.invoices.createFromOrder({
          orderId: entityId(input.orderId),
          ...(input.type === undefined ? {} : { type: input.type }),
          ...(input.amount === undefined ? {} : { amount: input.amount }),
          ...(input.partialType === undefined ? {} : { partialType: input.partialType })
        });
        return recordFields(result.data.created);
      })
  );
