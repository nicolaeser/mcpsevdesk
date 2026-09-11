import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { requireEmailFields, sevdeskDate } from "../../sevdesk/schemas.js";
import { mapReminderDelivery, reminderDelivery } from "./helpers.js";

export const createReminder = defineTool(
    "sevdesk_create_reminder",
    "Create reminder",
    "Create a reminder for an invoice. Leave without delivery unless the user asked to send or lock. Optional asOf is YYYY-MM-DD. Optional delivery uses channel=email (toEmail, subject, text, copy, sendXml, ccEmail, bccEmail, additionalAttachments) or channel=mark-sent (sendType). Requires confirm: true.",
    z.object({
      confirm: confirmField,
      invoiceId: z.union([z.string(), z.number()]),
      asOf: sevdeskDate.optional().describe("Eligibility as-of date YYYY-MM-DD. Defaults to now."),
      delivery: reminderDelivery.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_reminder");
        const delivery = input.delivery === undefined ? undefined : mapReminderDelivery(input.delivery);
        const result = await ctx.client.reminders.create({
          invoiceId: entityId(input.invoiceId),
          ...(input.asOf === undefined ? {} : { asOf: new Date(input.asOf) }),
          ...(delivery === undefined ? {} : { delivery })
        });
        return {
          eligibility: recordFields(result.data.eligibility),
          reminder: recordFields(result.data.reminder),
          ...(result.data.delivery === undefined ? {} : { delivery: recordFields(result.data.delivery) })
        };
      })
  );
