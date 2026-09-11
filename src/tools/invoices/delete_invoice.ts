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

export const deleteInvoice = defineTool(
    "sevdesk_delete_invoice",
    "Delete invoice",
    "Delete a draft invoice. Requires confirm: true.",
    z.object({ confirm: confirmField, invoiceId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_invoice");
        await ctx.client.invoices.delete(entityId(input.invoiceId), { confirm: true });
        return { id: String(input.invoiceId), deleted: true };
      })
  );
