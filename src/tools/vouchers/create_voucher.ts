import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField } from "../../sevdesk/ids.js";
import { sevdeskDate, voucherTaxRuleField } from "../../sevdesk/schemas.js";
import {
  attachmentFields,
  attachmentInput,
  binaryBytes,
  buildVoucherFactory,
  toBinaryUpload,
  voucherCreatedPayload,
  voucherPositionInput
} from "./helpers.js";

export const createVoucher = defineTool(
    "sevdesk_create_voucher",
    "Create voucher",
    "Create a draft voucher. Optional attachment uploads the receipt (filename plus base64, bytes, or path). description is the Belegtext. Expense taxRule 8/9/10/12/13/14 (default 9); revenue 1–5/11/17 (default 1). Bookkeeping 2.0 positions need accountDatevId from sevdesk_list_tax_guidance — do not guess. Dates are YYYY-MM-DD. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      voucherDate: sevdeskDate,
      creditDebit: z
        .enum(["expense", "revenue", "C", "D"])
        .describe("expense or C = outgoing. revenue or D = incoming."),
      description: z.string().min(1).describe("Voucher text (Belegtext). Do not leave empty."),
      supplierName: z.string().optional(),
      supplierId: z.union([z.string(), z.number()]).optional(),
      taxRule: voucherTaxRuleField,
      bookkeepingSystem: z.enum(["1.0", "2.0"]).optional().describe("Default 2.0."),
      positions: z.array(voucherPositionInput).min(1),
      attachment: attachmentInput.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_voucher");
        const factory = buildVoucherFactory(input, "sevdesk_create_voucher");
        if (input.attachment !== undefined) {
          const result = await ctx.client.vouchers.createWithAttachment(
            factory as never,
            toBinaryUpload(input.attachment)
          );
          return voucherCreatedPayload(result.data.created, result.data.upload);
        }
        const result = await ctx.client.vouchers.create({
          voucher: factory.voucher as never,
          positions: factory.positions as never
        });
        return recordFields(result.data.voucher);
      })
  );
