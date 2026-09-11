import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, staticCountryRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  extraFields,
  mapSalePosition,
  mergeExtra,
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

export const deleteCreditNote = defineTool(
    "sevdesk_delete_credit_note",
    "Delete credit note",
    "Delete a credit note via raw deletecreditNote. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      creditNoteId,
      extra: extraFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_credit_note");
        const result = await ctx.client.raw.creditNote.deletecreditNote(
          mergeExtra({ path: { creditNoteId: entityId(input.creditNoteId) } }, input.extra)
        );
        return fullPayload(result);
      })
  );
