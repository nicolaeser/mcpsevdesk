import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { sevdeskDate } from "../../sevdesk/schemas.js";
import { idValue, nullableId, transactionStatus, transactionRef } from "./helpers.js";

export const listTransactions = defineTool(
    "sevdesk_list_transactions",
    "List transactions",
    "List check-account transactions.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      checkAccountId: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.transactions.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.checkAccountId === undefined
            ? {}
            : { checkAccount: checkAccountRef(input.checkAccountId) })
        });
        return listPayload(result.data, result.pagination);
      })
  );
