import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const getAccountingContactById = defineTool(
    "sevdesk_get_accounting_contact_by_id",
    "Get accounting contact by id",
    "Fetch one DATEV accounting contact by id.",
    z.object({
      accountingContactId: idInput.optional(),
      id: idInput.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const accountingContactId = accountingContactIdOf(input);
        const result = await ctx.client.raw.accountingContact.getAccountingContactById({
          path: { accountingContactId: entityId(accountingContactId) }
        });
        const objects = result.data;
        const record = Array.isArray(objects) ? objects[0] : objects;
        if (record === undefined) {
          throw new Error(`sevdesk returned no AccountingContact for id ${String(accountingContactId)}.`);
        }
        return recordFields(record);
      })
  );
