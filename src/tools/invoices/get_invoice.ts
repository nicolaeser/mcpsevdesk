import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields } from "../../mcp/format.js";
import { contactRef, entityId, firstId } from "../../sevdesk/ids.js";

export const getInvoice = defineTool(
    "sevdesk_get_invoice",
    "Get invoice",
    "Fetch one sevdesk invoice by id.",
    z.object({
      invoiceId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional(),
      embed: z.array(z.string()).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () =>
        recordFields(
          (
            await ctx.client.invoices.get(
              entityId(firstId(input, "invoiceId")),
              input.embed === undefined || input.embed.length === 0 ? ["contact", "total"] : (input.embed as never)
            )
          ).data
        )
      )
  );
