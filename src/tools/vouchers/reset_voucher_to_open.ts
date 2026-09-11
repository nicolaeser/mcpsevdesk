import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const resetVoucherToOpen = defineTool(
    "sevdesk_reset_voucher_to_open",
    "Reset voucher to open",
    "Reset a voucher to open. Requires confirm: true.",
    z.object({ confirm: confirmField, voucherId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_reset_voucher_to_open");
        return recordFields((await ctx.client.vouchers.resetToOpen(entityId(input.voucherId))).data);
      })
  );
