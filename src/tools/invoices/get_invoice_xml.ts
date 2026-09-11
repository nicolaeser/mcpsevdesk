import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields } from "../../mcp/format.js";
import { contactRef, entityId, firstId } from "../../sevdesk/ids.js";

export const getInvoiceXml = defineTool(
    "sevdesk_get_invoice_xml",
    "Get invoice XML",
    "Download invoice XML.",
    z.object({ invoiceId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.invoices.getXml(entityId(input.invoiceId));
        return { id: String(input.invoiceId), xml: result.data };
      })
  );
