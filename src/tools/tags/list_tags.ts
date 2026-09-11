import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { embed } from "./helpers.js";

export const listTags = defineTool(
    "sevdesk_list_tags",
    "List tags",
    "List sevdesk tags.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      countAll: z.boolean().optional(),
      id: z.union([z.string(), z.number()]).optional().describe("Filter by tag id."),
      name: z.string().optional(),
      embed
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const countAll = input.countAll ?? true;
        if (input.embed !== undefined && input.embed.length > 0) {
          const result = await ctx.client.raw.tag.getTags({
            query: {
              countAll,
              ...(input.limit === undefined ? {} : { limit: input.limit }),
              ...(input.offset === undefined ? {} : { offset: input.offset }),
              ...(input.id === undefined ? {} : { id: entityId(input.id) }),
              ...(input.name === undefined ? {} : { name: input.name }),
              embed: input.embed
            }
          });
          return listPayload(result.data, result.pagination);
        }
        const result = await ctx.client.tags.list({
          countAll,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.id === undefined ? {} : { id: entityId(input.id) }),
          ...(input.name === undefined ? {} : { name: input.name })
        });
        return listPayload(result.data, result.pagination);
      })
  );
