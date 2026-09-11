import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const resetVoucherToDraft = defineTool(
    "sevdesk_reset_voucher_to_draft",
    "Reset voucher to draft",
    "Reset a voucher to draft. Requires confirm: true.",
    z.object({ confirm: confirmField, voucherId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_reset_voucher_to_draft");
        return recordFields((await ctx.client.vouchers.resetToDraft(entityId(input.voucherId))).data);
      })
  );
