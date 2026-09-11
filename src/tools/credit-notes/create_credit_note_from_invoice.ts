import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, staticCountryRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  mapSalePosition,
  taxRuleField,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate
} from "../../sevdesk/schemas.js";
import {
  assertCreditNoteTax,
  assertOpenSourceInvoice,
  salesTax,
  taxRuleIdFromRecord
} from "../../sevdesk/tax.js";
import { creditNoteId, fullPayload } from "./helpers.js";

export const createCreditNoteFromInvoice = defineTool(
    "sevdesk_create_credit_note_from_invoice",
    "Create credit note from invoice",
    "Preferred Gutschrift: copy taxRule and positions from an OPEN or PAID invoice (not draft). Leaves a draft. Do not send or mark-sent unless the user asked to send or lock. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      id: z.union([z.string(), z.number()]).optional(),
      invoiceId: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_credit_note_from_invoice");
        const invoiceId = input.invoiceId ?? input.id;
        if (invoiceId === undefined) throw new Error("Pass invoiceId or id.");
        const result = await ctx.client.creditNotes.createFromInvoice({
          invoiceId: entityId(invoiceId)
        });
        return recordFields(result.data);
      })
  );
