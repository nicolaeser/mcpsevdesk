import type { DocumentLayoutInput } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, omitUndefined } from "../../sevdesk/ids.js";
import { documentLayoutFields, getAsPdfField, toDocumentLayout, layoutOptions } from "./helpers.js";

export const listLayoutTemplates = defineTool(
    "sevdesk_list_layout_templates",
    "List layout templates",
    "List document layout templates.",
    z.object({
      type: z
        .enum(["Invoice", "Order", "Creditnote", "Letter", "Contractnote", "Packinglist", "invoicereminder"])
        .optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.layout.listTemplates(
          input.type === undefined ? {} : { type: input.type }
        );
        return { items: result.data };
      })
  );
