import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { embed } from "./helpers.js";

export const getTag = defineTool(
    "sevdesk_get_tag",
    "Get tag",
    "Fetch one tag by id.",
    z.object({
      tagId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => recordFields((await ctx.client.tags.get(entityId(firstId(input, "tagId")))).data))
  );
