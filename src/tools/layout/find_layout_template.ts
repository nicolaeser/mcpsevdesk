import type { DocumentLayoutInput } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, omitUndefined } from "../../sevdesk/ids.js";
import { documentLayoutFields, getAsPdfField, toDocumentLayout, layoutOptions } from "./helpers.js";

export const findLayoutTemplate = defineTool(
    "sevdesk_find_layout_template",
    "Find layout template",
    "Find a layout template by exact name.",
    z.object({
      name: z.string(),
      type: z
        .enum(["Invoice", "Order", "Creditnote", "Letter", "Contractnote", "Packinglist", "invoicereminder"])
        .optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const found = await ctx.client.layout.findTemplate({
          name: input.name,
          ...(input.type === undefined ? {} : { type: input.type })
        });
        return { template: found ?? null };
      })
  );
