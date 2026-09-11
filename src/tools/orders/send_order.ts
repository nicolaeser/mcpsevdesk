import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, staticCountryRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  mapSalePosition,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate,
  taxRuleField
} from "../../sevdesk/schemas.js";
import { assertSalesDocumentTax, salesTax } from "../../sevdesk/tax.js";
import { page } from "./helpers.js";

export const sendOrder = defineTool(
    "sevdesk_send_order",
    "Send order",
    "Email an order or mark it sent. Only when the user asked to send or lock. email and mark-sent lock the order; delete then fails. channel=email requires toEmail, subject, and text. Requires confirm: true.",
    z.object({
      ...sendChannelFields,
      orderId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_send_order");
        if (input.channel === "email") {
          const email = requireEmailFields(input, "sevdesk_send_order");
          const result = await ctx.client.orders.sendByEmail(entityId(input.orderId), {
            channel: "email",
            toEmail: email.toEmail,
            subject: email.subject,
            text: email.text
          });
          return { id: String(input.orderId), channel: "email", sent: true, data: recordFields(result.data) };
        }
        const result = await ctx.client.orders.markAsSent(entityId(input.orderId), {
          channel: "mark-sent",
          ...(input.sendType === undefined ? {} : { sendType: input.sendType })
        });
        return recordFields(result.data);
      })
  );
