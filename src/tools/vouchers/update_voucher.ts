import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const updateVoucher = defineTool(
    "sevdesk_update_voucher",
    "Update voucher",
    "Update a draft voucher. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      voucherId: z.union([z.string(), z.number()]),
      description: z.string().optional(),
      supplierName: z.string().optional(),
      voucherDate: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_update_voucher");
        const result = await ctx.client.vouchers.update(entityId(input.voucherId), {
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.supplierName === undefined ? {} : { supplierName: input.supplierName }),
          ...(input.voucherDate === undefined ? {} : { voucherDate: input.voucherDate })
        } as never);
        return recordFields(result.data.voucher);
      })
  );
