import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { binaryBytes, attachmentFields, attachmentInput, voucherPositionInput } from "./helpers.js";

export const getVoucher = defineTool(
    "sevdesk_get_voucher",
    "Get voucher",
    "Fetch one sevdesk voucher by id.",
    z.object({
      voucherId: z.union([z.string(), z.number()]).optional(),
      id: z.union([z.string(), z.number()]).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => recordFields((await ctx.client.vouchers.get(entityId(firstId(input, "voucherId")))).data))
  );
