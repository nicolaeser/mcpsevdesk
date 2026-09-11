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

export const resetCreditNoteToOpen = defineTool(
    "sevdesk_reset_credit_note_to_open",
    "Reset credit note to open",
    "Reset a credit note to open. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      creditNoteId
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_reset_credit_note_to_open");
        return fullPayload(
          await ctx.client.creditNotes.resetToOpen(entityId(input.creditNoteId), {
            confirmUnlinkTransactions: true
          })
        );
      })
  );
