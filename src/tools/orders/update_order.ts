import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, staticCountryRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  mapSalePosition,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate,
  taxRuleField
} from "../../sevdesk/schemas.js";
import { assertSalesDocumentTax, salesTax } from "../../sevdesk/tax.js";
import { page } from "./helpers.js";

export const updateOrder = defineTool(
    "sevdesk_update_order",
    "Update order",
    "Update a draft order header, texts, address, or date. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      orderId: z.union([z.string(), z.number()]),
      header: z.string().min(1).optional(),
      headText: z.string().optional(),
      footText: z.string().optional(),
      address: z.string().optional(),
      orderDate: sevdeskDate.optional(),
      currency: z.string().regex(/^[A-Z]{3}$/).optional(),
      customerInternalNote: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_order");
        const patch = {
          ...(input.header === undefined ? {} : { header: input.header }),
          ...(input.headText === undefined ? {} : { headText: input.headText }),
          ...(input.footText === undefined ? {} : { footText: input.footText }),
          ...(input.address === undefined ? {} : { address: input.address }),
          ...(input.orderDate === undefined ? {} : { orderDate: input.orderDate }),
          ...(input.currency === undefined ? {} : { currency: input.currency }),
          ...(input.customerInternalNote === undefined
            ? {}
            : { customerInternalNote: input.customerInternalNote })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_order requires at least one field to change.");
        }
        const result = await ctx.client.orders.update(entityId(input.orderId), patch);
        return recordFields(result.data.order);
      })
  );
