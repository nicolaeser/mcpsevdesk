import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields } from "../../mcp/format.js";
import { contactRef, entityId, firstId } from "../../sevdesk/ids.js";

export const getInvoicePdf = defineTool(
    "sevdesk_get_invoice_pdf",
    "Get invoice PDF",
    "Download an invoice PDF.",
    z.object({
      invoiceId: z.union([z.string(), z.number()]),
      download: z.boolean().optional(),
      markAsDownloaded: z.boolean().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.invoices.getPdf(entityId(input.invoiceId), {
          ...(input.download === undefined ? {} : { download: input.download }),
          ...(input.markAsDownloaded === undefined ? {} : { markAsDownloaded: input.markAsDownloaded })
        });
        return filePayload(result.data, { id: String(input.invoiceId) });
      })
  );
