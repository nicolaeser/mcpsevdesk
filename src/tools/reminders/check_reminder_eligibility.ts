import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { requireEmailFields, sevdeskDate } from "../../sevdesk/schemas.js";
import { reminderDelivery } from "./helpers.js";

export const checkReminderEligibility = defineTool(
    "sevdesk_check_reminder_eligibility",
    "Check reminder eligibility",
    "Check whether an invoice is eligible for a reminder. Optional asOf is YYYY-MM-DD.",
    z.object({
      invoiceId: z.union([z.string(), z.number()]),
      asOf: sevdeskDate.optional().describe("Eligibility as-of date YYYY-MM-DD. Defaults to now.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.reminders.checkEligibility(
          entityId(input.invoiceId),
          input.asOf === undefined ? {} : { asOf: new Date(input.asOf) }
        );
        return result.data;
      })
  );
