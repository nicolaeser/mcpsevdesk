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

export const listCreditNotes = defineTool(
    "sevdesk_list_credit_notes",
    "List credit notes",
    "List sevdesk credit notes.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      status: z.enum(["draft", "open", "paid", "partially_paid"]).optional(),
      creditNoteNumber: z.string().optional(),
      contactId: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.creditNotes.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.creditNoteNumber === undefined ? {} : { creditNoteNumber: input.creditNoteNumber }),
          ...(input.contactId === undefined ? {} : { contact: contactRef(input.contactId) })
        });
        return listPayload(result.data, result.pagination);
      })
  );
