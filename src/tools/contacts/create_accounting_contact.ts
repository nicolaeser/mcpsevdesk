import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const createAccountingContact = defineTool(
    "sevdesk_create_accounting_contact",
    "Create accounting contact",
    "Create a DATEV accounting contact (debitorNumber, creditorNumber) for an existing contact. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      contactId: idInput.describe("Existing sevdesk contact id (Model_AccountingContact.contact)."),
      ...accountingFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_accounting_contact");
        const result = await ctx.client.raw.accountingContact.createAccountingContact({
          body: {
            contact: contactRef(input.contactId),
            ...accountingBody(input)
          }
        });
        return recordFields(result.data);
      })
  );
