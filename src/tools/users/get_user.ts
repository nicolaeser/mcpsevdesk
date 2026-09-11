import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields } from "../../mcp/format.js";
import { entityId, firstId } from "../../sevdesk/ids.js";
import { ignoreRoles, ignoreRolesQuery } from "./helpers.js";

export const getUser = defineTool(
    "sevdesk_get_user",
    "Get user",
    "Fetch one sevdesk user by id.",
    z.object({
      id: z.union([z.string(), z.number()]).optional(),
      userId: z.union([z.string(), z.number()]).optional(),
      embed: z.array(z.string()).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const id = firstId(input, "userId");
        if (input.embed === undefined || input.embed.length === 0) {
          return recordFields((await ctx.client.users.get(entityId(id))).data);
        }
        const result = await ctx.client.raw.sevUser.getSevUserById({
          path: { sevUserId: entityId(id) },
          query: { embed: input.embed }
        });
        const objects = result.data;
        const record = Array.isArray(objects) ? objects[0] : objects;
        if (record === undefined) {
          throw new Error(`sevdesk returned no SevUser for id ${String(id)}.`);
        }
        return recordFields(record);
      })
  );
