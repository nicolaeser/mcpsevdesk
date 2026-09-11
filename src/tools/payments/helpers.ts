import { refs, type PaymentInput, type SevdeskClient } from "npmsevdesk";
import { z } from "zod";
import { checkAccountRef, entityId } from "../../sevdesk/ids.js";
import { parseBookingDate, parseVoucherDate } from "../../sevdesk/schemas.js";

export const bookingType = z.enum(["FULL_PAYMENT", "N", "CB", "CF", "O", "OF", "MTC"]);

export const accountSelector = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  name: z.string().optional(),
  iban: z.string().optional(),
  accountingNumber: z.string().optional(),
  default: z.boolean().optional()
});

export async function bookByKind(
  client: SevdeskClient,
  kind: "invoice" | "voucher" | "creditNote",
  id: number,
  date: string | number,
  payment: PaymentInput
) {
  if (kind === "voucher") {
    return client.payments.book({ kind: "voucher", id, date: parseVoucherDate(date) }, payment);
  }
  if (kind === "invoice") {
    return client.payments.book({ kind: "invoice", id, date: parseBookingDate(date) }, payment);
  }
  return client.payments.book({ kind: "creditNote", id, date: parseBookingDate(date) }, payment);
}

export function toPaymentInput(input: {
  readonly amount: number;
  readonly type?: z.infer<typeof bookingType>;
  readonly account: string | number | z.infer<typeof accountSelector>;
  readonly transaction?: string | number;
  readonly createFeed?: boolean;
}): PaymentInput {
  return {
    amount: input.amount,
    account: resolveAccount(input.account),
    ...(input.type === undefined ? {} : { type: input.type }),
    ...(input.transaction === undefined
      ? {}
      : { transaction: refs.checkAccountTransaction(entityId(input.transaction)) }),
    ...(input.createFeed === undefined ? {} : { createFeed: input.createFeed })
  };
}

function resolveAccount(
  account: string | number | z.infer<typeof accountSelector>
): PaymentInput["account"] {
  if (typeof account !== "object") return checkAccountRef(account);
  if (
    account.id !== undefined &&
    account.name === undefined &&
    account.iban === undefined &&
    account.accountingNumber === undefined &&
    account.default !== true
  ) {
    return checkAccountRef(account.id);
  }
  if (account.id !== undefined) {
    return {
      id: entityId(account.id),
      ...(account.name === undefined ? {} : { name: account.name }),
      ...(account.iban === undefined ? {} : { iban: account.iban }),
      ...(account.accountingNumber === undefined ? {} : { accountingNumber: account.accountingNumber }),
      ...(account.default === true ? { default: true as const } : {})
    };
  }
  if (account.name !== undefined) {
    return {
      name: account.name,
      ...(account.iban === undefined ? {} : { iban: account.iban }),
      ...(account.accountingNumber === undefined ? {} : { accountingNumber: account.accountingNumber }),
      ...(account.default === true ? { default: true as const } : {})
    };
  }
  if (account.iban !== undefined) {
    return {
      iban: account.iban,
      ...(account.accountingNumber === undefined ? {} : { accountingNumber: account.accountingNumber }),
      ...(account.default === true ? { default: true as const } : {})
    };
  }
  if (account.accountingNumber !== undefined) {
    return {
      accountingNumber: account.accountingNumber,
      ...(account.default === true ? { default: true as const } : {})
    };
  }
  if (account.default === true) return { default: true };
  throw new Error("account requires id, name, iban, accountingNumber, or default.");
}
