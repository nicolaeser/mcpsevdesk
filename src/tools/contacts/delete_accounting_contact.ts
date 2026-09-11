import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const deleteAccountingContact = defineTool(
    "sevdesk_delete_accounting_contact",
    "Delete accounting contact",
    "Delete a DATEV accounting contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      id: idInput.optional(),
      accountingContactId: idInput.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_accounting_contact");
        const accountingContactId = accountingContactIdOf(input);
        await ctx.client.raw.accountingContact.deleteAccountingContact({
          path: { accountingContactId: entityId(accountingContactId) }
        });
        return { id: String(accountingContactId), deleted: true };
      })
  );
