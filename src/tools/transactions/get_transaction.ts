import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { sevdeskDate } from "../../sevdesk/schemas.js";
import { idValue, nullableId, transactionStatus, transactionRef } from "./helpers.js";

export const getTransaction = defineTool(
    "sevdesk_get_transaction",
    "Get transaction",
    "Fetch one check-account transaction by id.",
    z.object({
      transactionId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () =>
        recordFields((await ctx.client.transactions.get(entityId(firstId(input, "transactionId")))).data)
      )
  );
