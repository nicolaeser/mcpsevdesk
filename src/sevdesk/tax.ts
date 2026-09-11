import { taxes, TaxRule } from "npmsevdesk";
import { entityId } from "./ids.js";

export interface TaxInput {
  readonly bookkeepingSystem?: "1.0" | "2.0";
  readonly taxRule?: number | string;
  readonly taxType?: string;
}

export const SALES_TAX_RULE_IDS = [1, 2, 3, 4, 5, 11, 17, 18, 19, 20, 21] as const;
export const EXPENSE_TAX_RULE_IDS = [8, 9, 10, 12, 13, 14] as const;
export const VOUCHER_REVENUE_TAX_RULE_IDS = [1, 2, 3, 4, 5, 11, 17] as const;
export const OSS_TAX_RULE_IDS = [18, 19, 20] as const;
export const ZERO_RATE_SALES_RULE_IDS = [2, 4, 5, 11, 17, 21] as const;
export const GERMAN_VAT_RATES = [0, 7, 19] as const;

export const SALES_TAX_RULE_HELP =
  "Bookkeeping 2.0 TaxRule id. Copy from sevdesk_quote_sale_tax plan.taxRule (or the source invoice). 1=standard taxable (position taxRate 0/7/19), 2=export 0%, 3=intra-community EU B2B goods 0%, 4=§4 UStG 0%, 5=reverse charge §13b 0%, 11=Kleinunternehmer §19 0%, 17=not domestic 0% (credit notes only with UNDERACHIEVEMENT). OSS 18=goods/19=electronic/20=other (destination rate; needs addressCountryId). 21=reverse charge §18b 0% (credit notes only with UNDERACHIEVEMENT). Expense ids 8/9/10/12/13/14 are voucher-only.";

export const VOUCHER_TAX_RULE_HELP =
  "Bookkeeping 2.0 TaxRule id. Expense (creditDebit expense/C): 8 intra-community acquisition, 9 deductible Vorsteuer 0/7/19 (default), 10 non-deductible, 12/13/14 §13b input. Revenue (revenue/D): 1, 2, 3, 4, 5, 11, or 17 (default 1). OSS 18/19/20 and 21 are not valid on vouchers. Take accountDatevId from sevdesk_list_tax_guidance — do not guess DATEV accounts.";

export function salesTax(input: TaxInput = {}) {
  if ((input.bookkeepingSystem ?? "2.0") === "1.0") {
    return taxes.manual.sales({
      bookkeepingSystem: "1.0",
      taxType: (input.taxType ?? "default") as "default"
    });
  }
  return taxes.manual.sales({
    bookkeepingSystem: "2.0",
    taxRule: (input.taxRule ?? TaxRule.STANDARD_TAXABLE) as 1
  });
}

export function expenseTax(input: TaxInput = {}) {
  if ((input.bookkeepingSystem ?? "2.0") === "1.0") {
    return taxes.manual.expense({
      bookkeepingSystem: "1.0",
      taxType: (input.taxType ?? "default") as "default"
    });
  }
  return taxes.manual.expense({
    bookkeepingSystem: "2.0",
    taxRule: (input.taxRule ?? TaxRule.DEDUCTIBLE_INPUT_TAX) as 9
  });
}

export function voucherRevenueTax(input: TaxInput = {}) {
  if ((input.bookkeepingSystem ?? "2.0") === "1.0") {
    return taxes.manual.voucherRevenue({
      bookkeepingSystem: "1.0",
      taxType: (input.taxType ?? "default") as "default"
    });
  }
  return taxes.manual.voucherRevenue({
    bookkeepingSystem: "2.0",
    taxRule: (input.taxRule ?? TaxRule.STANDARD_TAXABLE) as 1
  });
}

export function taxRuleIdFromRecord(record: unknown, fallback = 1): number {
  if (record === null || typeof record !== "object") return fallback;
  const taxRule = (record as { taxRule?: unknown }).taxRule;
  if (typeof taxRule === "number" || typeof taxRule === "string") return entityId(taxRule);
  if (taxRule !== null && typeof taxRule === "object" && "id" in taxRule) {
    const id = (taxRule as { id?: unknown }).id;
    if (typeof id === "number" || typeof id === "string") return entityId(id);
  }
  return fallback;
}

export function invoiceStatusCode(record: unknown): number | undefined {
  if (record === null || typeof record !== "object") return undefined;
  const row = record as { status?: unknown; statusCode?: unknown };
  if (typeof row.statusCode === "number") return row.statusCode;
  if (typeof row.status === "number") return row.status;
  if (typeof row.status === "string" && /^\d+$/.test(row.status)) return Number(row.status);
  return undefined;
}

function includesId(ids: readonly number[], value: number): boolean {
  return ids.includes(value);
}

function assertPositionRates(taxRuleId: number, rates: readonly number[]): void {
  for (const rate of rates) {
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      throw new Error(`position taxRate must be a percentage from 0 to 100 (got ${rate}).`);
    }
    if (includesId(ZERO_RATE_SALES_RULE_IDS, taxRuleId) && rate !== 0) {
      throw new Error(`taxRule ${taxRuleId} requires position taxRate 0 (got ${rate}).`);
    }
    if ((taxRuleId === 1 || taxRuleId === 3 || taxRuleId === 8 || taxRuleId === 9) && !includesId(GERMAN_VAT_RATES, rate)) {
      throw new Error(`taxRule ${taxRuleId} accepts only position taxRate 0, 7, or 19 (got ${rate}).`);
    }
  }
}

export function assertSalesDocumentTax(input: {
  readonly taxRule?: number | string | undefined;
  readonly invoiceType?: string | undefined;
  readonly positionTaxRates: readonly number[];
  readonly propertyIsEInvoice?: boolean | undefined;
  readonly hasCustomRevenueAccount?: boolean | undefined;
  readonly hasDeliveryOrAddressCountry?: boolean | undefined;
}): number {
  const taxRuleId = input.taxRule === undefined ? TaxRule.STANDARD_TAXABLE : entityId(input.taxRule);
  if (includesId(EXPENSE_TAX_RULE_IDS, taxRuleId)) {
    throw new Error(
      `taxRule ${taxRuleId} is an expense/voucher rule. Invoices and orders need a sales taxRule (1, 2, 3, 4, 5, 11, 17, 18, 19, 20, 21). Call sevdesk_quote_sale_tax.`
    );
  }
  if (!includesId(SALES_TAX_RULE_IDS, taxRuleId)) {
    throw new Error(`Unknown sales taxRule ${taxRuleId}. Call sevdesk_quote_sale_tax and copy plan.taxRule.`);
  }
  const invoiceType = input.invoiceType;
  const advanceOrPartial = invoiceType === "AR" || invoiceType === "TR";
  const restricted = advanceOrPartial || invoiceType === "ER";
  if (advanceOrPartial && taxRuleId !== 1 && taxRuleId !== 11) {
    throw new Error(`Invoice type ${invoiceType} supports only taxRule 1 or 11.`);
  }
  if (restricted && (taxRuleId === 17 || taxRuleId === 21)) {
    throw new Error(`taxRule ${taxRuleId} cannot be used on advance, partial, or final invoices (AR/TR/ER). Use a normal RE invoice.`);
  }
  if (includesId(OSS_TAX_RULE_IDS, taxRuleId)) {
    if (restricted) {
      throw new Error(`OSS taxRule ${taxRuleId} cannot be used on AR/TR/ER. Create a normal RE invoice.`);
    }
    if (input.propertyIsEInvoice === true) {
      throw new Error("OSS tax rules cannot be used on e-invoices.");
    }
    if (input.hasCustomRevenueAccount === true) {
      throw new Error("OSS tax rules cannot be combined with a custom DATEV revenue account.");
    }
    if (input.hasDeliveryOrAddressCountry === false) {
      throw new Error(
        `OSS taxRule ${taxRuleId} requires addressCountryId or deliveryAddressCountryId from sevdesk_find_country.`
      );
    }
  }
  assertPositionRates(taxRuleId, input.positionTaxRates);
  return taxRuleId;
}

export function assertCreditNoteTax(input: {
  readonly bookingCategory: "PROVISION" | "ROYALTY_ASSIGNED" | "ROYALTY_UNASSIGNED" | "UNDERACHIEVEMENT";
  readonly taxRule?: number | string | undefined;
  readonly sourceInvoiceId?: number | string | undefined;
  readonly positionTaxRates: readonly number[];
}): number {
  const isCorrection = input.bookingCategory === "UNDERACHIEVEMENT";
  if (input.sourceInvoiceId !== undefined && !isCorrection) {
    throw new Error(
      "sourceInvoiceId requires bookingCategory UNDERACHIEVEMENT. PROVISION/ROYALTY are not invoice corrections."
    );
  }
  if (isCorrection && input.sourceInvoiceId === undefined) {
    throw new Error(
      "bookingCategory UNDERACHIEVEMENT requires sourceInvoiceId. Prefer sevdesk_create_credit_note_from_invoice after the invoice is OPEN or PAID."
    );
  }
  if (!isCorrection) {
    if (input.taxRule === undefined || entityId(input.taxRule) === 1) {
      throw new Error(
        "PROVISION/ROYALTY is not a Gutschrift of an invoice. taxRule 1 (standard taxable) is invalid with this bookingCategory. For an invoice correction use bookingCategory UNDERACHIEVEMENT and sourceInvoiceId, or sevdesk_create_credit_note_from_invoice after the invoice is OPEN or PAID."
      );
    }
  }
  const taxRuleId = input.taxRule === undefined ? 1 : entityId(input.taxRule);
  if ((includesId(OSS_TAX_RULE_IDS, taxRuleId) || taxRuleId === 17 || taxRuleId === 21) && !isCorrection) {
    throw new Error(
      `Credit-note taxRule ${taxRuleId} requires bookingCategory UNDERACHIEVEMENT and sourceInvoiceId. Prefer sevdesk_create_credit_note_from_invoice after the invoice is OPEN or PAID.`
    );
  }
  if (includesId(EXPENSE_TAX_RULE_IDS, taxRuleId)) {
    throw new Error(`taxRule ${taxRuleId} is expense-only. Credit notes use sales tax rules.`);
  }
  assertPositionRates(taxRuleId, input.positionTaxRates);
  return taxRuleId;
}

export function assertVoucherTax(input: {
  readonly direction: "C" | "D";
  readonly taxRule?: number | string | undefined;
  readonly positionTaxRates: readonly number[];
}): number {
  const fallback = input.direction === "C" ? TaxRule.DEDUCTIBLE_INPUT_TAX : TaxRule.STANDARD_TAXABLE;
  const taxRuleId = input.taxRule === undefined ? fallback : entityId(input.taxRule);
  if (input.direction === "C") {
    if (!includesId(EXPENSE_TAX_RULE_IDS, taxRuleId)) {
      throw new Error(
        `taxRule ${taxRuleId} is not an expense rule. Expense vouchers use 8, 9, 10, 12, 13, or 14. Default 9 = deductible Vorsteuer.`
      );
    }
  } else {
    if (includesId(OSS_TAX_RULE_IDS, taxRuleId) || taxRuleId === 21) {
      throw new Error(`taxRule ${taxRuleId} is not valid on vouchers. Revenue vouchers use 1, 2, 3, 4, 5, 11, or 17.`);
    }
    if (!includesId(VOUCHER_REVENUE_TAX_RULE_IDS, taxRuleId)) {
      throw new Error(`taxRule ${taxRuleId} is not valid on a revenue voucher. Use 1, 2, 3, 4, 5, 11, or 17.`);
    }
  }
  assertPositionRates(taxRuleId, input.positionTaxRates);
  return taxRuleId;
}

export function assertOpenSourceInvoice(record: unknown): void {
  const status = invoiceStatusCode(record);
  if (status === 100) {
    throw new Error(
      "Cannot credit a draft invoice (status 100). Send or mark it sent so it is OPEN (200) or PAID (1000), then prefer sevdesk_create_credit_note_from_invoice."
    );
  }
}
