import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload } from "../../mcp/format.js";
import { entityId } from "../../sevdesk/ids.js";

export const getDocuments = defineTool(
    "sevdesk_get_documents",
    "Get documents",
    "List sevdesk documents.",
    z.object({
      contact: z
        .object({
          id: z.union([z.string(), z.number()]),
          objectName: z.literal("Contact")
        })
        .optional(),
      countAll: z.boolean().optional(),
      offset: z.number().int().nonnegative().optional(),
      limit: z.number().int().positive().max(1000).optional(),
      embed: z.array(z.string()).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.raw.document.getDocuments({
          query: {
            ...(input.contact === undefined
              ? {}
              : { contact: { id: entityId(input.contact.id), objectName: "Contact" as const } }),
            ...(input.countAll === undefined ? {} : { countAll: input.countAll }),
            ...(input.offset === undefined ? {} : { offset: input.offset }),
            ...(input.limit === undefined ? {} : { limit: input.limit }),
            ...(input.embed === undefined || input.embed.length === 0 ? {} : { embed: input.embed })
          }
        });
        return listPayload(result.data, result.pagination);
      })
  );
