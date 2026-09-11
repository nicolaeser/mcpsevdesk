import { uploadVoucherAttachment } from "./upload_voucher_attachment.js";
import { listVouchers } from "./list_vouchers.js";
import { getVoucher } from "./get_voucher.js";
import { listVoucherPositions } from "./list_voucher_positions.js";
import { createVoucher } from "./create_voucher.js";
import { updateVoucher } from "./update_voucher.js";
import { resetVoucherToOpen } from "./reset_voucher_to_open.js";
import { resetVoucherToDraft } from "./reset_voucher_to_draft.js";
import { deleteVoucher } from "./delete_voucher.js";

export const tools = [
  uploadVoucherAttachment,
  listVouchers,
  getVoucher,
  listVoucherPositions,
  createVoucher,
  updateVoucher,
  resetVoucherToOpen,
  resetVoucherToDraft,
  deleteVoucher
];
