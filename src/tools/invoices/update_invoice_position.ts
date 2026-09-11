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

export const updateInvoicePosition = defineTool(
    "sevdesk_update_invoice_position",
    "Update invoice position",
    "Update a draft invoice line (name, description text, quantity, price, tax). Requires confirm: true.",
    z.object({
      confirm: confirmField,
      positionId: z.union([z.string(), z.number()]).describe("Invoice position id from sevdesk_list_invoice_positions."),
      name: z.string().min(1).optional(),
      text: z.string().optional().describe("Line description printed under the title."),
      quantity: z.number().positive().optional(),
      price: z.number().optional(),
      taxRate: z.number().nonnegative().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_invoice_position");
        const patch = {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.text === undefined ? {} : { text: input.text }),
          ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
          ...(input.price === undefined ? {} : { price: input.price }),
          ...(input.taxRate === undefined ? {} : { taxRate: input.taxRate })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_invoice_position requires at least one of name, text, quantity, price, taxRate.");
        }
        const result = await ctx.client.invoices.updatePosition(entityId(input.positionId), patch as never);
        return recordFields(result.data.position);
      })
  );
