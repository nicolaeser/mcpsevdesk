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

export const deleteOrderPosition = defineTool(
    "sevdesk_delete_order_position",
    "Delete order position",
    "Delete an order position. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      positionId: z.union([z.string(), z.number()]).describe("Order position id from sevdesk_list_order_positions.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_order_position");
        await ctx.client.raw.orderPos.deleteOrderPos({
          path: { orderPosId: entityId(input.positionId) }
        });
        return { id: String(input.positionId), deleted: true };
      })
  );
