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

export const getCreditNote = defineTool(
    "sevdesk_get_credit_note",
    "Get credit note",
    "Fetch one sevdesk credit note by id.",
    z.object({
      creditNoteId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const creditNoteId = input.creditNoteId ?? input.id;
        if (creditNoteId === undefined) throw new Error("sevdesk_get_credit_note requires creditNoteId or id.");
        return recordFields((await ctx.client.creditNotes.get(entityId(creditNoteId))).data);
      })
  );
