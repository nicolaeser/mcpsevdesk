import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { embed } from "./helpers.js";

export const updateTag = defineTool(
    "sevdesk_update_tag",
    "Update tag",
    "Rename a tag. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      tagId: z.union([z.string(), z.number()]),
      name: z.string()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_tag");
        const result = await ctx.client.tags.update(entityId(input.tagId), { name: input.name });
        return recordFields(result.data);
      })
  );
