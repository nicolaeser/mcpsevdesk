import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const getCheckAccount = defineTool(
    "sevdesk_get_check_account",
    "Get check account",
    "Fetch one check account by id.",
    z.object({ checkAccountId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () =>
        recordFields((await ctx.client.checkAccounts.get(entityId(input.checkAccountId))).data)
      )
  );
