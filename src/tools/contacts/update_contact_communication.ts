import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const updateContactCommunication = defineTool(
    "sevdesk_update_contact_communication",
    "Update contact communication way",
    "Update a contact email, phone, mobile, web, or fax. Set type, value, key, and/or main. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput,
      communicationWayId: idInput.optional(),
      communicationId: idInput.optional(),
      id: idInput.optional(),
      type: commType.optional(),
      value: z.string().optional(),
      key: commKey.nullable().optional(),
      main: z.boolean().nullable().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_contact_communication");
        const patch = {
          ...(input.type === undefined ? {} : { type: input.type }),
          ...(input.value === undefined ? {} : { value: input.value }),
          ...(input.key === undefined
            ? {}
            : { key: input.key === null ? null : communicationKey(input.key) }),
          ...(input.main === undefined ? {} : { main: input.main })
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_contact_communication requires at least one of type, value, key, main.");
        }
        const communicationWayId = input.communicationWayId ?? input.communicationId ?? input.id;
        if (communicationWayId === undefined) {
          throw new Error("Pass communicationWayId, communicationId, or id.");
        }
        const result = await ctx.client.contacts.communicationWays.update(
          entityId(input.contactId),
          entityId(communicationWayId),
          patch
        );
        return recordFields(result.data.communicationWay);
      })
  );
