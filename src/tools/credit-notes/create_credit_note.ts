import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, staticCountryRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  mapSalePosition,
  taxRuleField,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate
} from "../../sevdesk/schemas.js";
import {
  assertCreditNoteTax,
  assertOpenSourceInvoice,
  salesTax,
  taxRuleIdFromRecord
} from "../../sevdesk/tax.js";
import { creditNoteId, fullPayload } from "./helpers.js";

export const createCreditNote = defineTool(
    "sevdesk_create_credit_note",
    "Create credit note",
    "Create a draft credit note. Do not send or mark-sent unless the user asked to send or lock. Invoice correction/Gutschrift = bookingCategory UNDERACHIEVEMENT + sourceInvoiceId; taxRule is copied from the source invoice if omitted and MUST match it. Prefer sevdesk_create_credit_note_from_invoice after the invoice is OPEN or PAID. PROVISION is a commission note, not an invoice correction; ROYALTY_* is royalty. taxRule 1 (standard taxable) and 17 (not domestic) are invalid with PROVISION/ROYALTY. taxRule 17/18/19/20/21 require UNDERACHIEVEMENT + sourceInvoiceId. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      creditNoteDate: sevdeskDate,
      contactId: z.union([z.string(), z.number()]),
      contactPersonId: z
        .union([z.string(), z.number()])
        .describe("SevUser id from sevdesk_list_users. Required by the credit-note factory."),
      creditNoteNumber: z
        .string()
        .optional()
        .describe("From sevdesk_next_sequence objectType creditNote; type defaults to GS."),
      bookingCategory: z
        .enum(["PROVISION", "ROYALTY_ASSIGNED", "ROYALTY_UNASSIGNED", "UNDERACHIEVEMENT"])
        .describe(
          "UNDERACHIEVEMENT = Gutschrift/correction of an invoice (requires sourceInvoiceId). PROVISION = commission (not an invoice correction; do not use taxRule 1 or 17). ROYALTY_* = royalties — not invoice corrections. ACCOUNTING_TYPE is not supported on bookkeeping 2.0."
        ),
      sourceInvoiceId: z
        .union([z.string(), z.number()])
        .optional()
        .describe("Required when bookingCategory is UNDERACHIEVEMENT."),
      addressCountryId: z
        .union([z.string(), z.number()])
        .optional()
        .describe("StaticCountry id from sevdesk_find_country."),
      takeDefaultAddress: z
        .boolean()
        .optional()
        .describe("Default true. Copies the contact billing address onto the credit note."),
      taxRule: taxRuleField.describe(
        "Bookkeeping 2.0 TaxRule id. For UNDERACHIEVEMENT, copy from the source invoice (or omit to copy). PROVISION is commission, not a Gutschrift: do not send taxRule 1 or 17. taxRule 17 (not domestic), OSS 18/19/20, and 21 require UNDERACHIEVEMENT + sourceInvoiceId. 1=standard taxable 0/7/19, 2=export 0%, 3=intra-community 0%, 4=§4 UStG 0%, 5=§13b 0%, 11=Kleinunternehmer 0%."
      ),
      positions: z.array(salePositionInput).min(1),
      ...documentTextFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_credit_note");
        const positions = input.positions.map(mapSalePosition);
        const first = positions[0];
        if (first === undefined) throw new Error("sevdesk_create_credit_note requires at least one position.");
        const positionTaxRates = positions.map((position) => position.taxRate);
        if (input.bookingCategory === "UNDERACHIEVEMENT") {
          if (input.sourceInvoiceId === undefined) {
            throw new Error(
              "bookingCategory UNDERACHIEVEMENT requires sourceInvoiceId. Prefer sevdesk_create_credit_note_from_invoice after the invoice is OPEN or PAID."
            );
          }
          const sourceId = entityId(input.sourceInvoiceId);
          const source = (await ctx.client.invoices.get(sourceId)).data;
          assertOpenSourceInvoice(source);
          const sourceTaxRule = taxRuleIdFromRecord(source, 1);
          if (input.taxRule !== undefined && entityId(input.taxRule) !== sourceTaxRule) {
            throw new Error(
              `taxRule must match the source invoice (invoice has taxRule ${sourceTaxRule}, you sent ${entityId(input.taxRule)}).`
            );
          }
          const taxRuleId = assertCreditNoteTax({
            bookingCategory: "UNDERACHIEVEMENT",
            taxRule: sourceTaxRule,
            sourceInvoiceId: sourceId,
            positionTaxRates
          });
          const result = await ctx.client.request<{
            objects?: { creditNote?: unknown };
          }>({
            method: "POST",
            path: "/CreditNote/Factory/saveCreditNote",
            body: {
              creditNote: {
                objectName: "CreditNote",
                mapAll: true,
                status: "100",
                creditNoteDate: input.creditNoteDate,
                contact: contactRef(input.contactId),
                contactPerson: userRef(input.contactPersonId),
                currency: input.currency ?? "EUR",
                bookingCategory: "UNDERACHIEVEMENT",
                refSrcInvoice: { id: sourceId, objectName: "Invoice" },
                taxRule: { id: taxRuleId, objectName: "TaxRule" },
                taxRate: first.taxRate,
                ...(input.header === undefined ? {} : { header: input.header }),
                ...(input.headText === undefined ? {} : { headText: input.headText }),
                ...(input.footText === undefined ? {} : { footText: input.footText }),
                ...(input.address === undefined ? {} : { address: input.address }),
                ...(input.customerInternalNote === undefined
                  ? {}
                  : { customerInternalNote: input.customerInternalNote }),
                ...(input.creditNoteNumber === undefined ? {} : { creditNoteNumber: input.creditNoteNumber }),
                ...(input.addressCountryId === undefined
                  ? {}
                  : { addressCountry: staticCountryRef(input.addressCountryId) })
              },
              creditNotePosSave: positions.map((position) => ({
                ...position,
                objectName: "CreditNotePos",
                mapAll: true
              })),
              creditNotePosDelete: null,
              discountSave: null,
              discountDelete: null,
              takeDefaultAddress: input.takeDefaultAddress ?? true,
              forCashRegister: false
            }
          });
          const created = result.json.objects?.creditNote ?? result.data;
          return recordFields(created);
        }
        const taxRule = assertCreditNoteTax({
          bookingCategory: input.bookingCategory,
          ...(input.taxRule === undefined ? {} : { taxRule: input.taxRule }),
          ...(input.sourceInvoiceId === undefined ? {} : { sourceInvoiceId: input.sourceInvoiceId }),
          positionTaxRates
        });
        const result = await ctx.client.creditNotes.create({
          creditNote: {
            creditNoteDate: input.creditNoteDate,
            contact: contactRef(input.contactId),
            contactPerson: userRef(input.contactPersonId),
            currency: input.currency ?? "EUR",
            tax: salesTax({ taxRule }),
            bookingCategory: input.bookingCategory,
            ...(input.header === undefined ? {} : { header: input.header }),
            ...(input.headText === undefined ? {} : { headText: input.headText }),
            ...(input.footText === undefined ? {} : { footText: input.footText }),
            ...(input.address === undefined ? {} : { address: input.address }),
            ...(input.customerInternalNote === undefined
              ? {}
              : { customerInternalNote: input.customerInternalNote }),
            ...(input.creditNoteNumber === undefined ? {} : { creditNoteNumber: input.creditNoteNumber }),
            ...(input.addressCountryId === undefined
              ? {}
              : { addressCountry: staticCountryRef(input.addressCountryId) })
          },
          positions: [first, ...positions.slice(1)],
          takeDefaultAddress: input.takeDefaultAddress ?? true
        });
        return recordFields(result.data.creditNote);
      })
  );
