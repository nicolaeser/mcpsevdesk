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

export const sendInvoice = defineTool(
    "sevdesk_send_invoice",
    "Send invoice",
    "Email an invoice or mark it sent. Only when the user asked to send or lock. email and mark-sent lock the invoice; reset and delete then fail. channel=email requires toEmail, subject, and text. Requires confirm: true.",
    z.object({
      ...sendChannelFields,
      invoiceId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_send_invoice");
        if (input.channel === "email") {
          const email = requireEmailFields(input, "sevdesk_send_invoice");
          const result = await ctx.client.invoices.sendByEmail(entityId(input.invoiceId), {
            channel: "email",
            toEmail: email.toEmail,
            subject: email.subject,
            text: email.text
          });
          return { id: String(input.invoiceId), channel: "email", sent: true, data: recordFields(result.data) };
        }
        const result = await ctx.client.invoices.markAsSent(entityId(input.invoiceId), {
          channel: "mark-sent",
          ...(input.sendType === undefined ? {} : { sendType: input.sendType })
        });
        return recordFields(result.data);
      })
  );
