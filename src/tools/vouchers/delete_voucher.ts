import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const deleteVoucher = defineTool(
    "sevdesk_delete_voucher",
    "Delete voucher",
    "Delete a draft voucher. Required before deleting a contact that is referenced as supplier. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      voucherId: z.union([z.string(), z.number()])
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_delete_voucher");
        await ctx.client.request({
          method: "DELETE",
          path: `/Voucher/${entityId(input.voucherId)}`
        });
        return { id: String(input.voucherId), deleted: true };
      })
  );
