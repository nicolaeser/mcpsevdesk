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

export const getOrderPdf = defineTool(
    "sevdesk_get_order_pdf",
    "Get order PDF",
    "Download an order PDF. Only when the user asked for the PDF. sevdesk may lock the order. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      orderId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_get_order_pdf");
        const result = await ctx.client.orders.getPdf(entityId(input.orderId), { confirmCommit: true });
        return filePayload(result.data, { id: String(input.orderId) });
      }),
    { readOnlyHint: false, destructiveHint: false, idempotentHint: false }
  );
