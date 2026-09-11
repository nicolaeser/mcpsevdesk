import { listInvoices } from "./list_invoices.js";
import { getInvoice } from "./get_invoice.js";
import { listInvoicePositions } from "./list_invoice_positions.js";
import { getInvoicePdf } from "./get_invoice_pdf.js";
import { getInvoiceXml } from "./get_invoice_xml.js";
import { renderInvoice } from "./render_invoice.js";
import { createInvoice } from "./create_invoice.js";
import { updateInvoice } from "./update_invoice.js";
import { updateInvoicePosition } from "./update_invoice_position.js";
import { deleteInvoice } from "./delete_invoice.js";
import { createInvoiceFromOrder } from "./create_invoice_from_order.js";
import { sendInvoice } from "./send_invoice.js";
import { resetInvoiceToDraft } from "./reset_invoice_to_draft.js";
import { resetInvoiceToOpen } from "./reset_invoice_to_open.js";

export const tools = [
  listInvoices,
  getInvoice,
  listInvoicePositions,
  getInvoicePdf,
  getInvoiceXml,
  renderInvoice,
  createInvoice,
  updateInvoice,
  updateInvoicePosition,
  deleteInvoice,
  createInvoiceFromOrder,
  sendInvoice,
  resetInvoiceToDraft,
  resetInvoiceToOpen
];
