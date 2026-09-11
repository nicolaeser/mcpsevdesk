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

export const listCreditNotePositions = defineTool(
    "sevdesk_list_credit_note_positions",
    "List credit note positions",
    "List positions on a credit note.",
    z.object({
      creditNoteId: z.union([z.string(), z.number()]),
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      embed: z.array(z.string()).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.raw.creditNotePos.getcreditNotePositions({
          query: {
            "creditNote[id]": entityId(input.creditNoteId),
            "creditNote[objectName]": "CreditNote",
            countAll: true,
            ...(input.limit === undefined ? {} : { limit: input.limit }),
            ...(input.offset === undefined ? {} : { offset: input.offset }),
            ...(input.embed === undefined || input.embed.length === 0 ? {} : { embed: input.embed })
          }
        });
        return listPayload(result.data, result.pagination);
      })
  );
