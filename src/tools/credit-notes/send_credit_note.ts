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

export const sendCreditNote = defineTool(
    "sevdesk_send_credit_note",
    "Send credit note",
    "Email a credit note or mark it sent. Only when the user asked to send or lock. email and mark-sent lock the credit note; reset and delete then fail. channel=email requires toEmail, subject, and text. Requires confirm: true.",
    z.object({
      ...sendChannelFields,
      creditNoteId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_send_credit_note");
        if (input.channel === "email") {
          const email = requireEmailFields(input, "sevdesk_send_credit_note");
          const result = await ctx.client.creditNotes.sendByEmail(entityId(input.creditNoteId), {
            channel: "email",
            toEmail: email.toEmail,
            subject: email.subject,
            text: email.text
          });
          return {
            id: String(input.creditNoteId),
            channel: "email",
            sent: true,
            data: recordFields(result.data)
          };
        }
        const result = await ctx.client.creditNotes.markAsSent(entityId(input.creditNoteId), {
          channel: "mark-sent",
          ...(input.sendType === undefined ? {} : { sendType: input.sendType })
        });
        return recordFields(result.data);
      })
  );
