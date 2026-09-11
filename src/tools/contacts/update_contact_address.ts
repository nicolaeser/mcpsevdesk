import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput, staticCountryRef } from "../../sevdesk/ids.js";
import { postalCode } from "../../sevdesk/schemas.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const updateContactAddress = defineTool(
    "sevdesk_update_contact_address",
    "Update contact address",
    "Update a contact address. countryId comes from sevdesk_find_country. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput,
      addressId: idInput,
      street: z.string().nullable().optional(),
      zip: postalCode.nullable().optional(),
      city: z.string().nullable().optional(),
      name: z.string().nullable().optional(),
      name2: z.string().optional(),
      name3: z.string().nullable().optional(),
      name4: z.string().nullable().optional(),
      countryId: idInput.nullable().optional(),
      categoryId: idInput.nullable().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_contact_address");
        const patch = {
          ...(input.street === undefined ? {} : { street: input.street }),
          ...(input.zip === undefined ? {} : { zip: input.zip }),
          ...(input.city === undefined ? {} : { city: input.city }),
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.name2 === undefined ? {} : { name2: input.name2 }),
          ...(input.name3 === undefined ? {} : { name3: input.name3 }),
          ...(input.name4 === undefined ? {} : { name4: input.name4 }),
          ...(input.countryId === undefined
            ? {}
            : { country: input.countryId === null ? null : staticCountryRef(input.countryId) }),
          ...(input.categoryId === undefined
            ? {}
            : { category: input.categoryId === null ? null : refs.category(entityId(input.categoryId)) })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error(
            "sevdesk_update_contact_address requires at least one of street, zip, city, name, name2, name3, name4, countryId, categoryId."
          );
        }
        const result = await ctx.client.contacts.addresses.update(
          entityId(input.contactId),
          entityId(input.addressId),
          patch
        );
        return recordFields(result.data.address);
      })
  );
