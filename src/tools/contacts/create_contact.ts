import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, buildCreateContact, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const createContact = defineTool(
    "sevdesk_create_contact",
    "Create contact",
    "Create a person or organisation. organisation requires name. person requires firstName and lastName. Set description and vatNumber when known. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      kind: z
        .enum(["organisation", "person"])
        .describe("organisation requires name. person requires firstName and lastName."),
      name: z.string().min(1).optional().describe("Required when kind=organisation. Company name."),
      firstName: z.string().min(1).optional().describe("Required when kind=person."),
      lastName: z.string().min(1).optional().describe("Required when kind=person."),
      customerNumber: z
        .string()
        .optional()
        .describe("Tenant customer number, or 'next' to assign the next sequence value."),
      category: z
        .enum(["customer", "supplier", "partner", "prospect_customer"])
        .optional()
        .describe("Defaults to customer."),
      description: z.string().optional().describe("Free-text notes on the contact."),
      vatNumber: z
        .string()
        .optional()
        .describe("USt-IdNr. Use a value that passes sevdesk_validate_vat_id, e.g. DE123456789.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_contact");
        const result = await ctx.client.contacts.create({ contact: buildCreateContact(input) });
        return recordFields(result.data.contact);
      })
  );
