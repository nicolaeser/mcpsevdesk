import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { sevdeskDate } from "../../sevdesk/schemas.js";
import { idValue, nullableId, transactionStatus, transactionRef } from "./helpers.js";

export const createTransaction = defineTool(
    "sevdesk_create_transaction",
    "Create transaction",
    "Create a check-account transaction. Dates are YYYY-MM-DD. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      valueDate: sevdeskDate,
      amount: z.number(),
      payeePayerName: z.string().nullable().describe("Counterparty name. Null when unknown."),
      checkAccountId: idValue.describe("CheckAccount id from sevdesk_list_check_accounts."),
      status: transactionStatus.optional(),
      entryDate: sevdeskDate.nullable().optional(),
      paymtPurpose: z.string().nullable().optional().describe("Payment purpose / Verwendungszweck."),
      payeePayerAcctNo: z.string().nullable().optional().describe("Counterparty account number or IBAN."),
      payeePayerBankCode: z.string().nullable().optional().describe("Counterparty bank code or BIC."),
      sourceTransactionId: nullableId
        .optional()
        .describe("Linked source CheckAccountTransaction id, or null."),
      targetTransactionId: nullableId
        .optional()
        .describe("Linked target CheckAccountTransaction id, or null.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_transaction");
        const result = await ctx.client.transactions.create({
          valueDate: input.valueDate,
          amount: input.amount,
          payeePayerName: input.payeePayerName,
          checkAccount: checkAccountRef(input.checkAccountId),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.entryDate === undefined ? {} : { entryDate: input.entryDate }),
          ...(input.paymtPurpose === undefined ? {} : { paymtPurpose: input.paymtPurpose }),
          ...(input.payeePayerAcctNo === undefined ? {} : { payeePayerAcctNo: input.payeePayerAcctNo }),
          ...(input.payeePayerBankCode === undefined
            ? {}
            : { payeePayerBankCode: input.payeePayerBankCode }),
          ...(input.sourceTransactionId === undefined
            ? {}
            : { sourceTransaction: transactionRef(input.sourceTransactionId) }),
          ...(input.targetTransactionId === undefined
            ? {}
            : { targetTransaction: transactionRef(input.targetTransactionId) })
        });
        return recordFields(result.data);
      })
  );
