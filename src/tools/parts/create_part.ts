import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, unityRef } from "../../sevdesk/ids.js";
import { extraPartFields, wrapExtraPartFields } from "./helpers.js";

export const createPart = defineTool(
    "sevdesk_create_part",
    "Create part",
    "Create a part/article. Fill text with the article description. partNumber should come from sevdesk_next_sequence objectType part when you need the next number. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      name: z.string().min(1).describe("Article title."),
      partNumber: z.string().min(1).describe("Unique article number."),
      stock: z.number(),
      taxRate: z.number().nonnegative().describe("VAT percent, e.g. 19, 7, or 0."),
      unityId: z.union([z.string(), z.number()]).optional().describe("Unity id. Default 1 is Stück/piece."),
      price: z.number().optional(),
      ...extraPartFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_part");
        const result = await ctx.client.parts.create({
          name: input.name,
          partNumber: input.partNumber,
          stock: input.stock,
          taxRate: input.taxRate,
          unity: unityRef(input.unityId ?? 1),
          ...(input.price === undefined ? {} : { price: input.price }),
          ...wrapExtraPartFields(input)
        });
        return recordFields(result.data);
      })
  );
