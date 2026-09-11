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

export const getCreditNotePdf = defineTool(
    "sevdesk_get_credit_note_pdf",
    "Get credit note PDF",
    "Download a credit note PDF.",
    z.object({ creditNoteId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.creditNotes.getPdf(entityId(input.creditNoteId));
        return filePayload(result.data, { id: String(input.creditNoteId) });
      })
  );
