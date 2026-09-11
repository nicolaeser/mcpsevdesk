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

export const updateCreditNote = defineTool(
    "sevdesk_update_credit_note",
    "Update credit note",
    "Update a draft credit note header, texts, address, or date. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      creditNoteId: z.union([z.string(), z.number()]),
      header: z.string().min(1).optional(),
      headText: z.string().optional(),
      footText: z.string().optional(),
      address: z.string().optional(),
      creditNoteDate: sevdeskDate.optional(),
      currency: z.string().regex(/^[A-Z]{3}$/).optional(),
      customerInternalNote: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_credit_note");
        const patch = {
          ...(input.header === undefined ? {} : { header: input.header }),
          ...(input.headText === undefined ? {} : { headText: input.headText }),
          ...(input.footText === undefined ? {} : { footText: input.footText }),
          ...(input.address === undefined ? {} : { address: input.address }),
          ...(input.creditNoteDate === undefined ? {} : { creditNoteDate: input.creditNoteDate }),
          ...(input.currency === undefined ? {} : { currency: input.currency }),
          ...(input.customerInternalNote === undefined
            ? {}
            : { customerInternalNote: input.customerInternalNote })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_credit_note requires at least one field to change.");
        }
        const result = await ctx.client.creditNotes.update(entityId(input.creditNoteId), patch as never);
        return recordFields(result.data.creditNote);
      })
  );
