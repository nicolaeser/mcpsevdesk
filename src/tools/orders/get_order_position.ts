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

export const getOrderPosition = defineTool(
    "sevdesk_get_order_position",
    "Get order position",
    "Fetch one order position by id.",
    z.object({
      positionId: z.union([z.string(), z.number()]).describe("Order position id from sevdesk_list_order_positions.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.raw.orderPos.getOrderPositionById({
          path: { orderPosId: entityId(input.positionId) }
        });
        const row = Array.isArray(result.data) ? result.data[0] : result.data;
        return recordFields(row);
      })
  );
