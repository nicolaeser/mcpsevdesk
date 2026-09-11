import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { embed } from "./helpers.js";

export const listTagRelations = defineTool(
    "sevdesk_list_tag_relations",
    "List tag relations",
    "List tag relations.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      countAll: z.boolean().optional(),
      embed
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const countAll = input.countAll ?? true;
        if (input.embed !== undefined && input.embed.length > 0) {
          const result = await ctx.client.raw.tag.getTagRelations({
            query: {
              countAll,
              ...(input.limit === undefined ? {} : { limit: input.limit }),
              ...(input.offset === undefined ? {} : { offset: input.offset }),
              embed: input.embed
            }
          });
          return listPayload(result.data, result.pagination);
        }
        const result = await ctx.client.tags.relations({
          countAll,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset })
        });
        return listPayload(result.data, result.pagination);
      })
  );
