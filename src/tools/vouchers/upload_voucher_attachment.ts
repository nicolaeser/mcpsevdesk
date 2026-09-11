import { decodeBase64, type BinaryUpload } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField } from "../../sevdesk/ids.js";
import { attachmentFields, attachmentInput, binaryBytes, toBinaryUpload, voucherPositionInput } from "./helpers.js";

export const uploadVoucherAttachment = defineTool(
    "sevdesk_upload_voucher_attachment",
    "Upload voucher attachment",
    "Upload a voucher file to sevdesk temp storage. Pass filename plus base64 content, a byte array, or a local path. Requires confirm: true.",
    z.object({
      confirm: confirmField,
      ...attachmentFields
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_upload_voucher_attachment");
        const result = await ctx.client.vouchers.uploadAttachment(toBinaryUpload(input));
        return recordFields(result.data);
      })
  );
