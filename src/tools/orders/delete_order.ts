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

export const deleteOrder = defineTool(
    "sevdesk_delete_order",
    "Delete order",
    "Delete an order. Draft preferred; delivered session orders are deleted via the raw endpoint. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      orderId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_order");
        const orderId = input.orderId ?? input.id;
        if (orderId === undefined) throw new Error("Pass orderId or id.");
        const id = entityId(orderId);
        try {
          await ctx.client.orders.delete(id, { confirm: true });
        } catch {
          await ctx.client.raw.order.deleteOrder({ path: { orderId: id } });
        }
        return { id: String(id), deleted: true };
      })
  );
