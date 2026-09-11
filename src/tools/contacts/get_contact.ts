import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const getContact = defineTool(
    "sevdesk_get_contact",
    "Get contact",
    "Fetch one sevdesk contact by id. Use embed for category, mainAddress, parent.",
    z.object({
      contactId: idInput.optional().describe("Contact id from sevdesk_list_contacts or sevdesk_create_contact."),
      id: idInput.optional(),
      embed: contactEmbed
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const contactId = input.contactId ?? input.id;
        if (contactId === undefined) throw new Error("sevdesk_get_contact requires contactId or id.");
        return recordFields(
          (await ctx.client.contacts.get(entityId(contactId), input.embed ?? ["category", "mainAddress"])).data
        );
      })
  );
