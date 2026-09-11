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

export const listOrders = defineTool(
    "sevdesk_list_orders",
    "List orders",
    "List sevdesk orders.",
    z.object({
      ...page,
      status: z.enum(["draft", "delivered", "accepted", "rejected"]).optional(),
      orderNumber: z.string().optional(),
      contactId: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.orders.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.orderNumber === undefined ? {} : { orderNumber: input.orderNumber }),
          ...(input.contactId === undefined ? {} : { contact: contactRef(input.contactId) })
        });
        return listPayload(result.data, result.pagination);
      })
  );
