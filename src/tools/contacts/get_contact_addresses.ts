import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const getContactAddresses = defineTool(
    "sevdesk_get_contact_addresses",
    "Get contact addresses",
    "List contact addresses. Optional contactId is sent as a contact filter.",
    z.object({
      contactId: idInput.optional().describe("Contact id to filter addresses."),
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      embed: z.array(z.string()).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.raw.contactAddress.getContactAddresses({
          query: {
            countAll: true,
            ...(input.limit === undefined ? {} : { limit: input.limit }),
            ...(input.offset === undefined ? {} : { offset: input.offset }),
            ...(input.embed === undefined || input.embed.length === 0 ? {} : { embed: input.embed })
          },
          ...(input.contactId === undefined
            ? {}
            : {
                extraQuery: {
                  contact: {
                    id: String(entityId(input.contactId)),
                    objectName: "Contact"
                  }
                }
              })
        });
        return listPayload(result.data ?? [], result.pagination);
      })
  );
