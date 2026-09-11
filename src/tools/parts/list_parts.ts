import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, unityRef } from "../../sevdesk/ids.js";
import { extraPartFields, wrapExtraPartFields } from "./helpers.js";

export const listParts = defineTool(
    "sevdesk_list_parts",
    "List parts",
    "List sevdesk parts/articles.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      name: z.string().optional(),
      partNumber: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.parts.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.partNumber === undefined ? {} : { partNumber: input.partNumber })
        });
        return listPayload(result.data, result.pagination);
      })
  );
