import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, buildUpdateContact, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const updateContact = defineTool(
    "sevdesk_update_contact",
    "Update contact",
    "Update a sevdesk contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: z.union([z.string(), z.number()]),
      kind: z.enum(["organisation", "person"]),
      name: z.string().min(1).optional(),
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      description: z.string().optional(),
      vatNumber: z.string().optional(),
      status: z.enum(["lead", "pending", "active"]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_contact");
        const result = await ctx.client.contacts.update(entityId(input.contactId), buildUpdateContact(input));
        return recordFields(result.data.contact);
      })
  );
