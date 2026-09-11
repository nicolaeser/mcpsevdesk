import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const updateAccountingContact = defineTool(
    "sevdesk_update_accounting_contact",
    "Update accounting contact",
    "Update DATEV debitorNumber/creditorNumber on an accounting contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      accountingContactId: idInput.optional(),
      id: idInput.optional(),
      ...accountingFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_accounting_contact");
        const body = accountingBody(input);
        if (Object.keys(body).length === 0) {
          throw new Error(
            "sevdesk_update_accounting_contact requires at least one of debitorNumber, creditorNumber."
          );
        }
        const result = await ctx.client.raw.accountingContact.updateAccountingContact({
          path: { accountingContactId: entityId(accountingContactIdOf(input)) },
          body
        });
        return recordFields(result.data);
      })
  );
