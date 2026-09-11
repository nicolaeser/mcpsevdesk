import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, firstId, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  extraFields,
  mapSalePosition,
  mergeExtra,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate,
  taxRuleField
} from "../../sevdesk/schemas.js";
import { assertSalesDocumentTax, salesTax } from "../../sevdesk/tax.js";

export const createInvoice = defineTool(
    "sevdesk_create_invoice",
    "Create invoice",
    "Create a draft invoice. Do not send or mark-sent unless the user asked to send or lock. Tax: copy taxRule from sevdesk_quote_sale_tax plan.taxRule (simple DE 19% → 1) and put that plan.defaultTaxRate on every position.taxRate. Do not use expense rules 8/9/10/12/13/14. header, headText, footText, and position text are optional: pass them when the user provided wording, never invent filler, never drop user-provided Leistungsbeschreibung. Dates are YYYY-MM-DD. contactPersonId is a SevUser from sevdesk_list_users. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      invoiceDate: sevdeskDate,
      contactId: z.union([z.string(), z.number()]).describe("Contact id from sevdesk_list_contacts or sevdesk_create_contact."),
      contactPersonId: z
        .union([z.string(), z.number()])
        .describe("SevUser id from sevdesk_list_users. Not a contact id."),
      invoiceNumber: z
        .string()
        .optional()
        .describe("Optional tenant invoice number. Omit to let sevdesk assign the next RE number."),
      invoiceType: z
        .enum(["RE", "WKR", "SR", "MA", "TR", "AR", "ER"])
        .optional()
        .describe("RE normal, WKR recurring, SR cancellation, MA reminder, TR partial, AR advance, ER final. Default RE."),
      deliveryDate: sevdeskDate.optional().describe("Optional delivery date YYYY-MM-DD."),
      addressCountryId: z
        .union([z.string(), z.number()])
        .optional()
        .describe("StaticCountry id from sevdesk_find_country (ISO e.g. DE). Do not guess."),
      takeDefaultAddress: z
        .boolean()
        .optional()
        .describe("Default true. Copies the contact billing address onto the invoice."),
      taxRule: taxRuleField,
      bookkeepingSystem: z.enum(["1.0", "2.0"]).optional(),
      positions: z.array(salePositionInput).min(1),
      extra: extraFields,
      ...documentTextFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_invoice");
        const positions = input.positions.map(mapSalePosition);
        const first = positions[0];
        if (first === undefined) throw new Error("sevdesk_create_invoice requires at least one position.");
        const taxRule = assertSalesDocumentTax({
          ...(input.taxRule === undefined ? {} : { taxRule: input.taxRule }),
          ...(input.invoiceType === undefined ? {} : { invoiceType: input.invoiceType }),
          positionTaxRates: positions.map((position) => position.taxRate),
          hasDeliveryOrAddressCountry: input.addressCountryId !== undefined
        });
        const result = await ctx.client.invoices.create({
          invoice: mergeExtra({
            invoiceDate: input.invoiceDate,
            contact: contactRef(input.contactId),
            contactPerson: userRef(input.contactPersonId),
            currency: input.currency ?? "EUR",
            ...(input.header === undefined ? {} : { header: input.header }),
            tax: salesTax({
              ...(input.bookkeepingSystem === undefined ? {} : { bookkeepingSystem: input.bookkeepingSystem }),
              taxRule
            }),
            ...(input.headText === undefined ? {} : { headText: input.headText }),
            ...(input.footText === undefined ? {} : { footText: input.footText }),
            ...(input.address === undefined ? {} : { address: input.address }),
            ...(input.invoiceNumber === undefined ? {} : { invoiceNumber: input.invoiceNumber }),
            ...(input.invoiceType === undefined ? {} : { invoiceType: input.invoiceType }),
            ...(input.deliveryDate === undefined ? {} : { deliveryDate: input.deliveryDate }),
            ...(input.customerInternalNote === undefined
              ? {}
              : { customerInternalNote: input.customerInternalNote }),
            ...(input.addressCountryId === undefined
              ? {}
              : { addressCountry: { id: entityId(input.addressCountryId), objectName: "StaticCountry" as const } })
          }, input.extra),
          positions: [first, ...positions.slice(1)],
          takeDefaultAddress: input.takeDefaultAddress ?? true
        });
        return recordFields(result.data.invoice);
      })
  );
