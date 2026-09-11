import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const updateCheckAccount = defineTool(
    "sevdesk_update_check_account",
    "Update check account",
    "Update a check account. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      checkAccountId: z.union([z.string(), z.number()]),
      name: z.string().optional(),
      status: z.union([z.number(), z.string()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_check_account");
        const result = await ctx.client.checkAccounts.update(entityId(input.checkAccountId), {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.status === undefined ? {} : { status: input.status as never })
        } as never);
        return recordFields(result.data);
      })
  );
