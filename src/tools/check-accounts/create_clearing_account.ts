import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const createClearingAccount = defineTool(
    "sevdesk_create_clearing_account",
    "Create clearing account",
    "Create a clearing check account. Name must be unique. accountingNumber is optional; omit it unless the user gave a valid unused DATEV/SKR account number. Do not send 1360 or other guessed numbers — sevdesk returns HTTP 422 \"account number is invalid\". Requires confirm: true.",
    z.object({
      confirm: confirmField,
      name: z.string().min(1).describe("Unique account name. Duplicate names return HTTP 422."),
      accountingNumber: z
        .number()
        .optional()
        .describe(
          "Optional DATEV/SKR account number. Omit unless the user gave a valid unused number. Do not send 1360 or other guessed numbers."
        )
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_clearing_account");
        const result = await ctx.client.checkAccounts.createClearing({
          name: input.name,
          ...(input.accountingNumber === undefined ? {} : { accountingNumber: input.accountingNumber })
        });
        return recordFields(result.data);
      })
  );
