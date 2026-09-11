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

export const renderInvoice = defineTool(
    "sevdesk_render_invoice",
    "Render invoice",
    "Render an invoice. This is a write and does not send or lock. getAsPdf=true returns the PDF. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      invoiceId: z.union([z.string(), z.number()]),
      forceReload: z.boolean().optional().describe("When true, force sevdesk to re-render."),
      getAsPdf: z.boolean().optional().describe("When true, return the rendered PDF.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_render_invoice");
        const invoiceId = entityId(input.invoiceId);
        if (input.getAsPdf === true) {
          const result = await ctx.client.invoices.render(invoiceId, {
            getAsPdf: true,
            ...(input.forceReload === undefined ? {} : { forceReload: input.forceReload })
          });
          return filePayload(
            {
              filename: `invoice-${invoiceId}.pdf`,
              mimeType: "application/pdf",
              base64Encoded: true,
              content: result.data.pdf
            },
            {
              id: String(input.invoiceId),
              kind: result.data.kind,
              ...(result.data.docId === undefined ? {} : { docId: result.data.docId }),
              ...(result.data.parameters === undefined ? {} : { parameters: result.data.parameters })
            }
          );
        }
        if (input.getAsPdf === false) {
          const result = await ctx.client.invoices.render(invoiceId, {
            getAsPdf: false,
            ...(input.forceReload === undefined ? {} : { forceReload: input.forceReload })
          });
          return recordFields(result.data);
        }
        const result =
          input.forceReload === undefined
            ? await ctx.client.invoices.render(invoiceId)
            : await ctx.client.invoices.render(invoiceId, { forceReload: input.forceReload });
        return recordFields(result.data);
      })
  );
