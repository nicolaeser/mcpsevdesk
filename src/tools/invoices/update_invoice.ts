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

export const updateInvoice = defineTool(
    "sevdesk_update_invoice",
    "Update invoice",
    "Update a draft invoice header, texts, address, or dates. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      invoiceId: z.union([z.string(), z.number()]),
      header: z.string().min(1).optional(),
      headText: z.string().optional(),
      footText: z.string().optional(),
      address: z.string().optional(),
      invoiceDate: sevdeskDate.optional(),
      deliveryDate: sevdeskDate.optional(),
      currency: z.string().regex(/^[A-Z]{3}$/).optional(),
      customerInternalNote: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_invoice");
        const patch = {
          ...(input.header === undefined ? {} : { header: input.header }),
          ...(input.headText === undefined ? {} : { headText: input.headText }),
          ...(input.footText === undefined ? {} : { footText: input.footText }),
          ...(input.address === undefined ? {} : { address: input.address }),
          ...(input.invoiceDate === undefined ? {} : { invoiceDate: input.invoiceDate }),
          ...(input.deliveryDate === undefined ? {} : { deliveryDate: input.deliveryDate }),
          ...(input.currency === undefined ? {} : { currency: input.currency }),
          ...(input.customerInternalNote === undefined
            ? {}
            : { customerInternalNote: input.customerInternalNote })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_invoice requires at least one field to change.");
        }
        const result = await ctx.client.invoices.update(entityId(input.invoiceId), patch);
        return recordFields(result.data.invoice);
      })
  );
