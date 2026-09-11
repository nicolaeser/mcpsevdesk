import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const listVoucherPositions = defineTool(
    "sevdesk_list_voucher_positions",
    "List voucher positions",
    "List positions on a voucher.",
    z.object({
      voucherId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.raw.voucherPos.getVoucherPositions({
          query: {
            "voucher[id]": entityId(firstId(input, "voucherId")),
            "voucher[objectName]": "Voucher"
          }
        });
        return listPayload(result.data, result.pagination);
      })
  );
