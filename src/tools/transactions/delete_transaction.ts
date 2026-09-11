import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { sevdeskDate } from "../../sevdesk/schemas.js";
import { idValue, nullableId, transactionStatus, transactionRef } from "./helpers.js";

export const deleteTransaction = defineTool(
    "sevdesk_delete_transaction",
    "Delete transaction",
    "Delete a check-account transaction. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      transactionId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_transaction");
        await ctx.client.transactions.delete(entityId(input.transactionId), { confirm: true });
        return { id: String(input.transactionId), deleted: true };
      })
  );
