import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields } from "../../mcp/format.js";
import { contactRef, entityId, firstId } from "../../sevdesk/ids.js";

export const listInvoices = defineTool(
    "sevdesk_list_invoices",
    "List invoices",
    "List sevdesk invoices.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      status: z.enum(["draft", "open", "paid", "partially_paid"]).optional(),
      invoiceNumber: z.string().optional(),
      contactId: z.union([z.string(), z.number()]).optional(),
      headerOrNumber: z.string().optional(),
      embed: z.array(z.string()).optional().describe("Invoice embed paths, e.g. contact, total, taxRule")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.invoices.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.invoiceNumber === undefined ? {} : { invoiceNumber: input.invoiceNumber }),
          ...(input.headerOrNumber === undefined ? {} : { headerOrNumber: input.headerOrNumber }),
          ...(input.contactId === undefined ? {} : { contact: contactRef(input.contactId) }),
          ...(input.embed === undefined || input.embed.length === 0
            ? {}
            : { embed: input.embed as never })
        });
        return listPayload(result.data, result.pagination);
      })
  );
