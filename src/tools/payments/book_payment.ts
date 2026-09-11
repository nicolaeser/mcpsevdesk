import { refs, type PaymentInput, type SevdeskClient } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId } from "../../sevdesk/ids.js";
import { parseBookingDate, parseVoucherDate, sevdeskDate } from "../../sevdesk/schemas.js";
import { accountSelector, bookByKind, bookingType, toPaymentInput } from "./helpers.js";

export const bookPayment = defineTool(
    "sevdesk_book_payment",
    "Book payment",
    "Book a payment against an invoice, voucher, or credit note. Pass account as a check-account id or selector { id, name, iban, accountingNumber, default }; checkAccountId is an id alias. Optional transaction links a CheckAccountTransaction. Optional createFeed writes a sevdesk feed entry. Voucher date is YYYY-MM-DD or ISO-8601; invoice and credit note date is YYYY-MM-DD, ISO-8601, or unix seconds. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      kind: z.enum(["invoice", "voucher", "creditNote"]),
      id: z.union([z.string(), z.number()]),
      date: z
        .union([sevdeskDate, z.string(), z.number()])
        .describe("Voucher: YYYY-MM-DD or ISO-8601. Invoice/credit note: YYYY-MM-DD, ISO-8601, or unix seconds."),
      amount: z.number(),
      type: bookingType.optional(),
      account: z
        .union([z.string(), z.number(), accountSelector])
        .optional()
        .describe("Check account id, or selector { id, name, iban, accountingNumber, default }."),
      checkAccountId: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Check account id. Alias for account when account is an id."),
      transaction: z
        .union([z.string(), z.number()])
        .optional()
        .describe("CheckAccountTransaction id to link this booking."),
      createFeed: z.boolean().optional().describe("When true, create a sevdesk feed entry for this booking.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_book_payment");
        const account = input.account ?? input.checkAccountId;
        if (account === undefined) {
          throw new Error("sevdesk_book_payment requires account or checkAccountId.");
        }
        const payment = toPaymentInput({
          amount: input.amount,
          account,
          ...(input.type === undefined ? {} : { type: input.type }),
          ...(input.transaction === undefined ? {} : { transaction: input.transaction }),
          ...(input.createFeed === undefined ? {} : { createFeed: input.createFeed })
        });
        const result = await bookByKind(ctx.client, input.kind, entityId(input.id), input.date, payment);
        return {
          id: String(input.id),
          kind: input.kind,
          booked: true,
          account: recordFields(result.data.account),
          booking: recordFields(result.data.booking)
        };
      })
  );
