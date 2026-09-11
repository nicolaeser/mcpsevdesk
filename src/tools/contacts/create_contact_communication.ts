import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const createContactCommunication = defineTool(
    "sevdesk_create_contact_communication",
    "Create contact communication way",
    "Add email, phone, mobile, web, or fax to a contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput,
      type: commType,
      value: z.string(),
      key: commKey.optional(),
      main: z.boolean().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_contact_communication");
        const result = await ctx.client.contacts.communicationWays.create(entityId(input.contactId), {
          type: input.type,
          value: input.value,
          key: communicationKey(input.key),
          ...(input.main === undefined ? {} : { main: input.main })
        });
        return recordFields(result.data.communicationWay);
      })
  );
