import type { DocumentLayoutInput } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, omitUndefined } from "../../sevdesk/ids.js";
import { documentLayoutFields, getAsPdfField, toDocumentLayout, layoutOptions } from "./helpers.js";

export const setLayout = defineTool(
    "sevdesk_set_layout",
    "Set document layout",
    "Set template, letterpaper, language, and/or PayPal display on an invoice, order, or credit note identified by objectType and id. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      objectType: z
        .enum(["invoice", "order", "creditNote"])
        .describe("Document kind: invoice, order, or creditNote."),
      id: z.union([z.string(), z.number()]).describe("Invoice, order, or credit note id."),
      getAsPdf: getAsPdfField,
      ...documentLayoutFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_set_layout");
        const result = await ctx.client.layout.setLayout(
          input.objectType,
          entityId(input.id),
          toDocumentLayout(input),
          layoutOptions(input.getAsPdf)
        );
        return recordFields(result.data);
      })
  );
