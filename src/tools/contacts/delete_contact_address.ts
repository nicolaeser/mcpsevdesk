import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const deleteContactAddress = defineTool(
    "sevdesk_delete_contact_address",
    "Delete contact address",
    "Remove an address from a contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput,
      addressId: idInput
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_contact_address");
        await ctx.client.contacts.addresses.remove(entityId(input.contactId), entityId(input.addressId), {
          confirm: true
        });
        return { id: String(input.addressId), deleted: true };
      })
  );
