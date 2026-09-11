import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { requireEmailFields, sevdeskDate } from "../../sevdesk/schemas.js";
import { reminderDelivery } from "./helpers.js";

export const getLastReminder = defineTool(
    "sevdesk_get_last_reminder",
    "Last reminder for invoice",
    "Return the last dunning/reminder for an invoice.",
    z.object({ invoiceId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.reminders.getLastForInvoice(entityId(input.invoiceId));
        return { id: String(input.invoiceId), lastReminder: result.data ?? null };
      })
  );
