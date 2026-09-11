import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, unityRef } from "../../sevdesk/ids.js";
import { extraPartFields, wrapExtraPartFields } from "./helpers.js";

export const deletePart = defineTool(
    "sevdesk_delete_part",
    "Delete part",
    "Delete a part/article you created. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      partId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_part");
        const partId = input.partId ?? input.id;
        if (partId === undefined) throw new Error("partId is required");
        await ctx.client.request({
          method: "DELETE",
          path: `/Part/${entityId(partId)}`
        });
        return { id: String(partId), deleted: true };
      })
  );
