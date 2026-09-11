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

export const getOrder = defineTool(
    "sevdesk_get_order",
    "Get order",
    "Fetch one sevdesk order by id.",
    z.object({
      orderId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const orderId = input.orderId ?? input.id;
        if (orderId === undefined) throw new Error("sevdesk_get_order requires orderId or id.");
        return recordFields((await ctx.client.orders.get(entityId(orderId))).data);
      })
  );
