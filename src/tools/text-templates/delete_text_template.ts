import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { objectType } from "./helpers.js";

export const deleteTextTemplate = defineTool(
    "sevdesk_delete_text_template",
    "Delete text template",
    "Delete a text template. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      templateId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_text_template");
        await ctx.client.textTemplates.delete(entityId(input.templateId), { confirm: true });
        return { id: String(input.templateId), deleted: true };
      })
  );
