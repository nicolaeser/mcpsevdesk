import { describe, expect, it } from "vitest";
import {
  assertCreditNoteTax,
  assertOpenSourceInvoice,
  assertSalesDocumentTax,
  assertVoucherTax,
  invoiceStatusCode,
  taxRuleIdFromRecord
} from "../sevdesk/tax.js";
import { MCP_INSTRUCTIONS } from "../mcp/server.js";

describe("tax helpers", () => {
  it("accepts DE standard sales tax and rejects expense rules on invoices", () => {
    expect(
      assertSalesDocumentTax({ taxRule: 1, positionTaxRates: [19, 7] })
    ).toBe(1);
    expect(() => assertSalesDocumentTax({ taxRule: 9, positionTaxRates: [19] })).toThrow(/expense/);
    expect(() => assertSalesDocumentTax({ taxRule: 11, positionTaxRates: [19] })).toThrow(/taxRate 0/);
    expect(() =>
      assertSalesDocumentTax({
        taxRule: 18,
        positionTaxRates: [20],
        hasDeliveryOrAddressCountry: false
      })
    ).toThrow(/addressCountryId/);
    expect(() =>
      assertSalesDocumentTax({ taxRule: 2, invoiceType: "AR", positionTaxRates: [0] })
    ).toThrow(/AR/);
  });

  it("rejects PROVISION with taxRule 1 and requires UNDERACHIEVEMENT for a source invoice", () => {
    expect(() =>
      assertCreditNoteTax({
        bookingCategory: "PROVISION",
        taxRule: 1,
        positionTaxRates: [19]
      })
    ).toThrow(/not a Gutschrift/);
    expect(() =>
      assertCreditNoteTax({
        bookingCategory: "UNDERACHIEVEMENT",
        taxRule: 1,
        positionTaxRates: [19]
      })
    ).toThrow(/sourceInvoiceId/);
    expect(
      assertCreditNoteTax({
        bookingCategory: "UNDERACHIEVEMENT",
        taxRule: 1,
        sourceInvoiceId: 99,
        positionTaxRates: [19]
      })
    ).toBe(1);
    expect(() =>
      assertCreditNoteTax({
        bookingCategory: "PROVISION",
        taxRule: 18,
        positionTaxRates: [20]
      })
    ).toThrow(/UNDERACHIEVEMENT/);
    expect(() =>
      assertCreditNoteTax({
        bookingCategory: "PROVISION",
        taxRule: 17,
        positionTaxRates: [0]
      })
    ).toThrow(/UNDERACHIEVEMENT.*sourceInvoiceId.*create_credit_note_from_invoice/s);
  });

  it("splits voucher tax rules by expense vs revenue", () => {
    expect(assertVoucherTax({ direction: "C", positionTaxRates: [19] })).toBe(9);
    expect(assertVoucherTax({ direction: "D", positionTaxRates: [19] })).toBe(1);
    expect(() => assertVoucherTax({ direction: "C", taxRule: 1, positionTaxRates: [19] })).toThrow(
      /expense rule/
    );
    expect(() => assertVoucherTax({ direction: "D", taxRule: 18, positionTaxRates: [20] })).toThrow(
      /not valid on vouchers/
    );
  });

  it("reads taxRule and status from sevdesk records", () => {
    expect(taxRuleIdFromRecord({ taxRule: { id: "3", objectName: "TaxRule" } })).toBe(3);
    expect(taxRuleIdFromRecord({ taxRule: 11 })).toBe(11);
    expect(invoiceStatusCode({ status: "200" })).toBe(200);
    expect(() => assertOpenSourceInvoice({ status: 100 })).toThrow(/draft invoice/);
    expect(() => assertOpenSourceInvoice({ status: 200 })).not.toThrow();
  });
});

describe("MCP tax instructions", () => {
  it("briefs the agent on TaxRule ids, Gutschrift, confirm, and dates", () => {
    expect(MCP_INSTRUCTIONS).toContain("sevdesk_quote_sale_tax");
    expect(MCP_INSTRUCTIONS).toContain("euConsumerTaxation");
    expect(MCP_INSTRUCTIONS).toContain("UNDERACHIEVEMENT");
    expect(MCP_INSTRUCTIONS).toContain("PROVISION");
    expect(MCP_INSTRUCTIONS).toContain("1=standard taxable");
    expect(MCP_INSTRUCTIONS).toContain("Kleinunternehmer");
    expect(MCP_INSTRUCTIONS).toContain("accountDatevId");
    expect(MCP_INSTRUCTIONS).toContain("confirm: true");
    expect(MCP_INSTRUCTIONS).toContain("YYYY-MM-DD");
    expect(MCP_INSTRUCTIONS).toContain("as drafts");
    expect(MCP_INSTRUCTIONS).toContain("send_*");
    expect(MCP_INSTRUCTIONS).toContain("lock the document");
    expect(MCP_INSTRUCTIONS).toContain("customerNumber next");
    expect(MCP_INSTRUCTIONS).not.toContain("sevdesk_resolve_sale_tax");
    expect(MCP_INSTRUCTIONS).not.toContain("sevdesk_export_datev_csv");
    expect(MCP_INSTRUCTIONS).not.toContain("sevdesk_export_datev_xml");
  });
});
