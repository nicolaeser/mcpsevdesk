import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const checkAccountBalance = defineTool(
    "sevdesk_check_account_balance",
    "Check account balance",
    "Balance of a check account at a date (YYYY-MM-DD).",
    z.object({
      checkAccountId: z.union([z.string(), z.number()]),
      date: z.string()
    }),
    (ctx, input) =>
      runTool(ctx, async () => ({
        id: String(input.checkAccountId),
        date: input.date,
        balance: (await ctx.client.checkAccounts.balanceAt(entityId(input.checkAccountId), input.date))
          .data
      }))
  );
