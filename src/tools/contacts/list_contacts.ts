import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { postalCode } from "../../sevdesk/schemas.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const listContacts = defineTool(
    "sevdesk_list_contacts",
    "List contacts",
    "List sevdesk contacts.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      name: z.string().optional(),
      customerNumber: z.string().optional(),
      city: z.string().optional(),
      zip: postalCode.optional(),
      depth: z.enum(["organisations", "all"]).optional(),
      category: z.enum(["customer", "supplier", "partner", "prospect_customer"]).optional(),
      embed: contactEmbed
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.contacts.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.customerNumber === undefined ? {} : { customerNumber: input.customerNumber }),
          ...(input.city === undefined ? {} : { city: input.city }),
          ...(input.zip === undefined ? {} : { zip: input.zip }),
          ...(input.depth === undefined ? {} : { depth: input.depth }),
          ...(input.category === undefined ? {} : { category: input.category }),
          ...(input.embed === undefined || input.embed.length === 0 ? {} : { embed: input.embed })
        });
        return listPayload(result.data, result.pagination);
      })
  );
