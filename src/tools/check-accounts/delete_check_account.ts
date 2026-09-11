import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const deleteCheckAccount = defineTool(
    "sevdesk_delete_check_account",
    "Delete check account",
    "Delete a check account. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      checkAccountId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_check_account");
        await ctx.client.checkAccounts.delete(entityId(input.checkAccountId), { confirm: true });
        return { id: String(input.checkAccountId), deleted: true };
      })
  );
