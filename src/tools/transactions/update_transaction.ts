import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { sevdeskDate } from "../../sevdesk/schemas.js";
import { idValue, nullableId, transactionStatus, transactionRef } from "./helpers.js";

export const updateTransaction = defineTool(
    "sevdesk_update_transaction",
    "Update transaction",
    "Update a check-account transaction. Dates are YYYY-MM-DD. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      transactionId: idValue,
      valueDate: sevdeskDate.optional(),
      entryDate: sevdeskDate.nullable().optional(),
      paymtPurpose: z.string().optional().describe("Payment purpose / Verwendungszweck."),
      amount: z.number().nullable().optional(),
      payeePayerName: z.string().nullable().optional(),
      checkAccountId: idValue.optional().describe("CheckAccount id from sevdesk_list_check_accounts."),
      status: transactionStatus.optional(),
      sourceTransactionId: nullableId
        .optional()
        .describe("Linked source CheckAccountTransaction id, or null."),
      targetTransactionId: nullableId
        .optional()
        .describe("Linked target CheckAccountTransaction id, or null.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_transaction");
        const patch = {
          ...(input.valueDate === undefined ? {} : { valueDate: input.valueDate }),
          ...(input.entryDate === undefined ? {} : { entryDate: input.entryDate }),
          ...(input.paymtPurpose === undefined ? {} : { paymtPurpose: input.paymtPurpose }),
          ...(input.amount === undefined ? {} : { amount: input.amount }),
          ...(input.payeePayerName === undefined ? {} : { payeePayerName: input.payeePayerName }),
          ...(input.checkAccountId === undefined
            ? {}
            : { checkAccount: checkAccountRef(input.checkAccountId) }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.sourceTransactionId === undefined
            ? {}
            : { sourceTransaction: transactionRef(input.sourceTransactionId) }),
          ...(input.targetTransactionId === undefined
            ? {}
            : { targetTransaction: transactionRef(input.targetTransactionId) })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_transaction requires at least one field to change.");
        }
        const result = await ctx.client.transactions.update(entityId(input.transactionId), patch as never);
        return recordFields(result.data);
      })
  );
