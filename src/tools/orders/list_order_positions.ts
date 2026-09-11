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

export const listOrderPositions = defineTool(
    "sevdesk_list_order_positions",
    "List order positions",
    "List positions on an order.",
    z.object({
      orderId: z.union([z.string(), z.number()]),
      ...page
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.raw.order.getOrderPositionsById({
          path: { orderId: entityId(input.orderId) },
          query: {
            countAll: true,
            ...(input.limit === undefined ? {} : { limit: input.limit }),
            ...(input.offset === undefined ? {} : { offset: input.offset })
          }
        });
        return listPayload(result.data, result.pagination);
      })
  );
