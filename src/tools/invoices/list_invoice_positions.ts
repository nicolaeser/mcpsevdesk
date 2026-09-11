import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields } from "../../mcp/format.js";
import { contactRef, entityId, firstId } from "../../sevdesk/ids.js";

export const listInvoicePositions = defineTool(
    "sevdesk_list_invoice_positions",
    "List invoice positions",
    "List positions on an invoice.",
    z.object({
      invoiceId: z.union([z.string(), z.number()]),
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.invoices.listPositions(entityId(input.invoiceId), {
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset })
        });
        return listPayload(result.data, result.pagination);
      })
  );
