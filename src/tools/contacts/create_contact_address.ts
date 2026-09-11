import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput, staticCountryRef } from "../../sevdesk/ids.js";
import { postalCode } from "../../sevdesk/schemas.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const createContactAddress = defineTool(
    "sevdesk_create_contact_address",
    "Create contact address",
    "Add an address to a contact. countryId comes from sevdesk_find_country. Fill street, zip, and city. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput,
      countryId: idInput.describe("StaticCountry id from sevdesk_find_country (ISO e.g. DE). Do not guess."),
      street: z.string().min(1).optional().describe("Street and house number."),
      zip: postalCode.optional(),
      city: z.string().min(1).optional().describe("City."),
      name: z.string().optional().describe("Optional address label.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_contact_address");
        const address: {
          country: ReturnType<typeof staticCountryRef>;
          category: null;
          street?: string;
          zip?: string;
          city?: string;
          name?: string;
        } = { country: staticCountryRef(input.countryId), category: null };
        if (input.street !== undefined) address.street = input.street;
        if (input.zip !== undefined) address.zip = input.zip;
        if (input.city !== undefined) address.city = input.city;
        if (input.name !== undefined) address.name = input.name;
        const result = await ctx.client.contacts.addresses.create(entityId(input.contactId), address);
        return recordFields(result.data);
      })
  );
