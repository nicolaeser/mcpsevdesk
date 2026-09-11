import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const listVouchers = defineTool(
    "sevdesk_list_vouchers",
    "List vouchers",
    "List sevdesk vouchers.",
    z.object({
      limit: z.number().int().positive().max(1000).optional(),
      offset: z.number().int().nonnegative().optional(),
      status: z.enum(["draft", "open", "paid", "partially_paid", "transferred"]).optional(),
      creditDebit: z.enum(["expense", "revenue", "C", "D"]).optional(),
      supplierName: z.string().optional(),
      contactId: z.union([z.string(), z.number()]).optional(),
      descriptionLike: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.vouchers.list({
          countAll: true,
          ...(input.limit === undefined ? {} : { limit: input.limit }),
          ...(input.offset === undefined ? {} : { offset: input.offset }),
          ...(input.status === undefined ? {} : { status: input.status }),
          ...(input.creditDebit === undefined ? {} : { creditDebit: input.creditDebit }),
          ...(input.supplierName === undefined ? {} : { supplierName: input.supplierName }),
          ...(input.descriptionLike === undefined ? {} : { descriptionLike: input.descriptionLike }),
          ...(input.contactId === undefined ? {} : { contact: contactRef(input.contactId) })
        });
        return listPayload(result.data, result.pagination);
      })
  );
