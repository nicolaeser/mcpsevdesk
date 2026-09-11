import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { objectType } from "./helpers.js";

export const listTextTemplates = defineTool(
    "sevdesk_list_text_templates",
    "List text templates",
    "List sevdesk text templates.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      objectType: objectType.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.textTemplates.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.objectType === undefined ? {} : { objectType: input.objectType })
        });
        return listPayload(result.data, result.pagination);
      })
  );
