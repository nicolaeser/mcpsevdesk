import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { embed } from "./helpers.js";

export const createTag = defineTool(
    "sevdesk_create_tag",
    "Create tag",
    "Attach a tag to an invoice, voucher, order, or credit note. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      name: z.string().optional(),
      objectName: z.enum(["Invoice", "Voucher", "Order", "CreditNote"]),
      objectId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_tag");
        const result = await ctx.client.tags.create({
          ...(input.name === undefined ? {} : { name: input.name }),
          object: { id: entityId(input.objectId), objectName: input.objectName }
        });
        return recordFields(result.data);
      })
  );
