import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const deleteContact = defineTool(
    "sevdesk_delete_contact",
    "Delete contact",
    "Delete a sevdesk contact. Requires confirm: true.",
    z.object({ confirm: confirmField, contactId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_contact");
        const result = await ctx.client.contacts.delete(entityId(input.contactId), { confirm: true });
        return { id: String(input.contactId), deleted: true, ...recordFields(result) };
      })
  );
