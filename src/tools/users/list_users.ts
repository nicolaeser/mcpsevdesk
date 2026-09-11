import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields } from "../../mcp/format.js";
import { entityId, firstId } from "../../sevdesk/ids.js";
import { ignoreRoles, ignoreRolesQuery } from "./helpers.js";

export const listUsers = defineTool(
    "sevdesk_list_users",
    "List users",
    "List sevdesk users (SevUser). Use an id as contactPersonId when creating invoices, orders, or credit notes.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      countAll: z.boolean().optional(),
      embed: z.array(z.string()).optional(),
      ignoreRoles
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const roles = ignoreRolesQuery(input.ignoreRoles);
        const embed = input.embed !== undefined && input.embed.length > 0;
        if (embed || Object.keys(roles).length > 0) {
          const result = await ctx.client.raw.sevUser.getSevUsers({
            query: {
              countAll: input.countAll ?? true,
              ...(input.limit === undefined ? {} : { limit: input.limit }),
              ...(input.offset === undefined ? {} : { offset: input.offset }),
              ...(embed ? { embed: input.embed } : {}),
              ...roles
            }
          });
          return listPayload(result.data ?? [], result.pagination);
        }
        const result = await ctx.client.users.list({
          countAll: input.countAll ?? true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset })
        });
        return listPayload(result.data, result.pagination);
      })
  );
