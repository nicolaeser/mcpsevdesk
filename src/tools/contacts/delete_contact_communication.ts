import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const deleteContactCommunication = defineTool(
    "sevdesk_delete_contact_communication",
    "Delete contact communication way",
    "Remove an email/phone from a contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput,
      communicationWayId: idInput.optional(),
      communicationId: idInput.optional(),
      id: idInput.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_contact_communication");
        const communicationWayId = input.communicationWayId ?? input.communicationId ?? input.id;
        if (communicationWayId === undefined) {
          throw new Error("Pass communicationWayId, communicationId, or id.");
        }
        await ctx.client.contacts.communicationWays.remove(
          entityId(input.contactId),
          entityId(communicationWayId),
          { confirm: true }
        );
        return { id: String(communicationWayId), deleted: true };
      })
  );
