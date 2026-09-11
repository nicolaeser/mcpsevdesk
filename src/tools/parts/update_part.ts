import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, unityRef } from "../../sevdesk/ids.js";
import { extraPartFields, wrapExtraPartFields } from "./helpers.js";

export const updatePart = defineTool(
    "sevdesk_update_part",
    "Update part",
    "Update a part/article. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      partId: z.union([z.string(), z.number()]),
      name: z.string().min(1).optional(),
      partNumber: z.string().min(1).optional(),
      stock: z.number().optional(),
      taxRate: z.number().nonnegative().optional(),
      unityId: z.union([z.string(), z.number()]).optional(),
      price: z.number().optional(),
      ...extraPartFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_part");
        const patch = {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.partNumber === undefined ? {} : { partNumber: input.partNumber }),
          ...(input.stock === undefined ? {} : { stock: input.stock }),
          ...(input.taxRate === undefined ? {} : { taxRate: input.taxRate }),
          ...(input.unityId === undefined ? {} : { unity: unityRef(input.unityId) }),
          ...(input.price === undefined ? {} : { price: input.price }),
          ...wrapExtraPartFields(input)
        };
        if (Object.keys(patch).length === 0) {
          throw new Error("sevdesk_update_part requires at least one field to change.");
        }
        const result = await ctx.client.parts.update(entityId(input.partId), patch as never);
        return recordFields(result.data);
      })
  );
