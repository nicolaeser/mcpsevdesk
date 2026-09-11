import { describe, expect, it } from "vitest";
import { z } from "zod";
import { TOOL_CATALOG, TOOL_NAMES } from "../mcp/catalog.js";
import { coercePositionText } from "../sevdesk/schemas.js";

function schemaOf(name: string): Record<string, unknown> {
  const tool = TOOL_CATALOG.find((entry) => entry.name === name);
  expect(tool, name).toBeTruthy();
  return z.toJSONSchema(tool!.inputSchema) as Record<string, unknown>;
}

function dumped(name: string): string {
  return JSON.stringify(schemaOf(name));
}

describe("document tool schemas", () => {
  it("exposes header, headText, footText, and position text on create tools", () => {
    for (const name of ["sevdesk_create_invoice", "sevdesk_create_order", "sevdesk_create_credit_note"]) {
      const raw = dumped(name);
      expect(raw, name).toContain('"header"');
      expect(raw, name).toContain('"headText"');
      expect(raw, name).toContain('"footText"');
      expect(raw, name).toContain("Leistungsbeschreibung");
      expect(raw, name).toContain("YYYY-MM-DD");
    }
  });

  it("requires API keys but keeps wording fields optional", () => {
    const invoice = schemaOf("sevdesk_create_invoice");
    const required = invoice.required as string[];
    expect(required).toContain("invoiceDate");
    expect(required).toContain("positions");
    expect(required).toContain("contactPersonId");
    expect(required).not.toContain("header");
    expect(required).not.toContain("headText");
    expect(dumped("sevdesk_create_invoice")).toContain("VAT percent");
    expect(dumped("sevdesk_create_invoice")).toContain("Do not invent filler");
  });

  it("accepts a position without text and maps description when the user supplied one", () => {
    const tool = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_create_invoice");
    expect(tool).toBeTruthy();
    const withoutText = tool!.inputSchema.parse({
      confirm: true,
      invoiceDate: "2026-09-07",
      contactId: 1,
      contactPersonId: 1,
      positions: [{ name: "A", quantity: 1, price: 10, taxRate: 19 }]
    }) as { positions: Array<{ text?: string }> };
    expect(withoutText.positions[0]?.text).toBeUndefined();
    const withDescription = tool!.inputSchema.parse(
      coercePositionText({
        confirm: true,
        invoiceDate: "2026-09-07",
        contactId: 1,
        contactPersonId: 1,
        positions: [{ name: "A", description: "User wording", quantity: 1, price: 10, taxRate: 19 }]
      })
    ) as { positions: Array<{ text?: string }> };
    expect(withDescription.positions[0]?.text).toBe("User wording");
  });

  it("rejects German calendar dates before they reach sevdesk", () => {
    const tool = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_create_invoice");
    expect(tool).toBeTruthy();
    expect(() =>
      tool!.inputSchema.parse({
        confirm: true,
        invoiceDate: "06.09.2026",
        contactId: 1,
        contactPersonId: 1,
        header: "Rechnung",
        positions: [{ name: "A", quantity: 1, price: 10, taxRate: 19 }]
      })
    ).toThrow();
  });

  it("adds update tools for draft document texts", () => {
    expect(TOOL_NAMES).toContain("sevdesk_update_invoice");
    expect(TOOL_NAMES).toContain("sevdesk_update_invoice_position");
    expect(TOOL_NAMES).toContain("sevdesk_update_order");
    expect(TOOL_NAMES).toContain("sevdesk_update_credit_note");
    expect(dumped("sevdesk_update_invoice")).toContain("headText");
    expect(dumped("sevdesk_update_invoice_position")).toContain("description");
  });

  it("requires email fields in the schema description for send tools", () => {
    for (const name of ["sevdesk_send_invoice", "sevdesk_send_order", "sevdesk_send_credit_note"]) {
      const raw = dumped(name);
      expect(raw, name).toContain("toEmail");
      expect(raw, name).toContain("channel=email");
    }
  });

  it("does not default order country to Germany in the schema", () => {
    const order = schemaOf("sevdesk_create_order");
    const required = order.required as string[];
    expect(required).toContain("addressCountryId");
    expect(required).toContain("orderNumber");
  });

  it("accepts next_sequence without type for invoice, order, creditNote, and part", () => {
    const tool = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_next_sequence");
    expect(tool).toBeTruthy();
    expect(tool!.inputSchema.safeParse({ objectType: "creditNote" }).success).toBe(true);
    expect(tool!.inputSchema.safeParse({ objectType: "invoice" }).success).toBe(true);
    expect(tool!.inputSchema.safeParse({ objectType: "order" }).success).toBe(true);
    expect(tool!.inputSchema.safeParse({ objectType: "part" }).success).toBe(true);
    expect(schemaOf("sevdesk_next_sequence").required as string[]).not.toContain("type");
  });

  it("keeps text-template name and text required and leaves category and textType optional", () => {
    const required = schemaOf("sevdesk_create_text_template").required as string[];
    expect(required).toContain("name");
    expect(required).toContain("text");
    expect(required).not.toContain("category");
    expect(required).not.toContain("textType");
  });

  it("exposes credit-note bookingCategory and cleanup deletes", () => {
    const required = schemaOf("sevdesk_create_credit_note").required as string[];
    const raw = dumped("sevdesk_create_credit_note");
    expect(raw).toContain("bookingCategory");
    expect(raw).toContain("UNDERACHIEVEMENT");
    expect(raw).toContain("1=standard taxable");
    expect(raw).toContain("not invoice corrections");
    expect(required).toContain("bookingCategory");
    expect(TOOL_NAMES).toContain("sevdesk_delete_part");
    expect(TOOL_NAMES).toContain("sevdesk_delete_voucher");
    expect(TOOL_NAMES).toContain("sevdesk_delete_accounting_contact");
  });

  it("tells agents to copy quote_sale_tax onto documents", () => {
    const quote = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_quote_sale_tax");
    const invoice = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_create_invoice");
    const credit = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_create_credit_note");
    expect(quote?.description).toContain("plan.taxRule");
    expect(quote?.description).toContain("Kleinunternehmer");
    expect(quote?.description).not.toContain("sevdesk_resolve_sale_tax");
    expect(dumped("sevdesk_quote_sale_tax")).toContain("euConsumerTaxation");
    expect(dumped("sevdesk_create_voucher")).toContain("attachment");
    expect(invoice?.description).toContain("sevdesk_quote_sale_tax");
    expect(invoice?.description).toContain("Do not send or mark-sent unless the user asked");
    expect(credit?.description).toContain("UNDERACHIEVEMENT");
    const send = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_send_invoice");
    expect(send?.description).toContain("Only when the user asked to send or lock");
    expect(send?.description).toContain("lock the invoice");
    expect(dumped("sevdesk_create_voucher")).toContain("deductible Vorsteuer");
  });

  it("exposes userId and id on get_user", () => {
    const raw = dumped("sevdesk_get_user");
    expect(raw).toContain("userId");
    expect(raw).toContain('"id"');
  });

  it("accepts vatId as well as raw on VAT helpers", () => {
    for (const name of ["sevdesk_parse_vat_id", "sevdesk_validate_vat_id"]) {
      const tool = TOOL_CATALOG.find((entry) => entry.name === name);
      expect(tool, name).toBeTruthy();
      const parsed = tool!.inputSchema.parse({ vatId: "DE 123 456 789" }) as { vatId?: string };
      expect(parsed.vatId, name).toBe("DE123456789");
    }
    expect(TOOL_NAMES).not.toContain("sevdesk_normalize_vat_id");
    expect(TOOL_NAMES).not.toContain("sevdesk_is_valid_vat_id_format");
  });

  it("accepts a numeric postal code on contact address tools", () => {
    const update = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_update_contact_address");
    const create = TOOL_CATALOG.find((entry) => entry.name === "sevdesk_create_contact_address");
    expect(update).toBeTruthy();
    expect(create).toBeTruthy();
    const updated = update!.inputSchema.parse({
      confirm: true,
      contactId: 1,
      addressId: 2,
      zip: 10115
    }) as { zip?: string };
    expect(updated.zip).toBe("10115");
    const created = create!.inputSchema.parse({
      confirm: true,
      contactId: 1,
      countryId: 1,
      zip: 10115
    }) as { zip?: string };
    expect(created.zip).toBe("10115");
  });
});
