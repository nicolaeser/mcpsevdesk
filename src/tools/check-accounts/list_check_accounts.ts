import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const listCheckAccounts = defineTool(
    "sevdesk_list_check_accounts",
    "List check accounts",
    "List sevdesk bank/clearing accounts.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.checkAccounts.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset })
        });
        return listPayload(result.data, result.pagination);
      })
  );
