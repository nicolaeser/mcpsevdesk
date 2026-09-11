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

export const resetInvoiceToDraft = defineTool(
    "sevdesk_reset_invoice_to_draft",
    "Reset invoice to draft",
    "Reset an invoice to draft. Requires confirm: true.",
    z.object({ confirm: confirmField, invoiceId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_reset_invoice_to_draft");
        return recordFields((await ctx.client.invoices.resetToDraft(entityId(input.invoiceId))).data);
      })
  );
