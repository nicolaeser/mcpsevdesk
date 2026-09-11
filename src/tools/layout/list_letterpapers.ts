import type { DocumentLayoutInput } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, omitUndefined } from "../../sevdesk/ids.js";
import { documentLayoutFields, getAsPdfField, toDocumentLayout, layoutOptions } from "./helpers.js";

export const listLetterpapers = defineTool(
    "sevdesk_list_letterpapers",
    "List letterpapers",
    "List letterpapers.",
    z.object({}),
    (ctx) =>
      runTool(ctx, async () => {
        const result = await ctx.client.layout.listLetterpapers();
        return { items: result.data };
      })
  );
