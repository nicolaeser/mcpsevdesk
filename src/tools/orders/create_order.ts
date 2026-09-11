import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { filePayload, listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, staticCountryRef, userRef } from "../../sevdesk/ids.js";
import {
  documentTextFields,
  mapSalePosition,
  requireEmailFields,
  salePositionInput,
  sendChannelFields,
  sevdeskDate,
  taxRuleField
} from "../../sevdesk/schemas.js";
import { assertSalesDocumentTax, salesTax } from "../../sevdesk/tax.js";
import { page } from "./helpers.js";

export const createOrder = defineTool(
    "sevdesk_create_order",
    "Create order",
    "Create a draft order. Do not send or mark-sent unless the user asked to send or lock. Tax: copy taxRule from sevdesk_quote_sale_tax plan.taxRule (simple DE 19% → 1) and that plan.defaultTaxRate onto every position.taxRate. header is the PDF title (required by sevdesk). headText, footText, and position text are optional: pass them when the user provided wording, never invent filler, never drop user-provided Leistungsbeschreibung. Get orderNumber from sevdesk_next_sequence (objectType order, type AN/AB/LI). contactPersonId is a SevUser from sevdesk_list_users. addressCountryId comes from sevdesk_find_country. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      orderDate: sevdeskDate,
      orderNumber: z
        .string()
        .min(1)
        .describe("Unique order number. Call sevdesk_next_sequence with objectType order first."),
      contactId: z.union([z.string(), z.number()]),
      contactPersonId: z
        .union([z.string(), z.number()])
        .describe("SevUser id from sevdesk_list_users. Not a contact id."),
      orderType: z.enum(["AN", "AB", "LI"]).optional().describe("AN estimate, AB confirmation, LI delivery note. Default AN."),
      addressCountryId: z
        .union([z.string(), z.number()])
        .describe("StaticCountry id from sevdesk_find_country (ISO e.g. DE). Do not guess."),
      taxRule: taxRuleField,
      positions: z.array(salePositionInput).min(1),
      ...documentTextFields,
      header: z
        .string()
        .min(1)
        .describe("PDF title. Required by sevdesk for orders, e.g. Angebot.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_order");
        const positions = input.positions.map(mapSalePosition);
        const first = positions[0];
        if (first === undefined) throw new Error("sevdesk_create_order requires at least one position.");
        const taxRule = assertSalesDocumentTax({
          ...(input.taxRule === undefined ? {} : { taxRule: input.taxRule }),
          positionTaxRates: positions.map((position) => position.taxRate),
          hasDeliveryOrAddressCountry: true
        });
        const result = await ctx.client.orders.create({
          order: {
            orderDate: input.orderDate,
            orderNumber: input.orderNumber,
            header: input.header,
            version: 1,
            contact: contactRef(input.contactId),
            contactPerson: userRef(input.contactPersonId),
            currency: input.currency ?? "EUR",
            orderType: input.orderType ?? "AN",
            addressCountry: staticCountryRef(input.addressCountryId),
            tax: salesTax({ taxRule }),
            ...(input.headText === undefined ? {} : { headText: input.headText }),
            ...(input.footText === undefined ? {} : { footText: input.footText }),
            ...(input.address === undefined ? {} : { address: input.address }),
            ...(input.customerInternalNote === undefined
              ? {}
              : { customerInternalNote: input.customerInternalNote })
          },
          positions: [first, ...positions.slice(1)]
        });
        return recordFields(result.data.order);
      })
  );
