import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, buildCreatePayload, buildMergeContact, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const upsertContact = defineTool(
    "sevdesk_upsert_contact",
    "Upsert contact",
    "Create or merge a contact by customerNumber. organisation requires name. person requires firstName and lastName. Nested addresses, communicationWays, and accounting apply on create only. Dates are YYYY-MM-DD. Requires confirm: true.",
    upsertInput,
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_upsert_contact");
        if (input.customerNumber === "next" || input.customerNumber.trim() === "") {
          throw new Error('sevdesk_upsert_contact requires a concrete customerNumber; "next" is not allowed.');
        }
        const create = buildCreatePayload(input);
        const merge = buildMergeContact(input);
        const match = { customerNumber: input.customerNumber };
        if (merge === undefined) {
          return recordFields((await ctx.client.contacts.upsert({ match, create })).data);
        }
        return recordFields(
          (await ctx.client.contacts.upsert({ match, create, merge } as never)).data
        );
      })
  );
