import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { embed } from "./helpers.js";

export const deleteTag = defineTool(
    "sevdesk_delete_tag",
    "Delete tag",
    "Delete a tag. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      tagId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_tag");
        await ctx.client.tags.delete(entityId(input.tagId), { confirm: true });
        return { id: String(input.tagId), deleted: true };
      })
  );
