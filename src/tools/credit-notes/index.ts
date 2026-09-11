import { listCreditNotes } from "./list_credit_notes.js";
import { getCreditNote } from "./get_credit_note.js";
import { createCreditNote } from "./create_credit_note.js";
import { updateCreditNote } from "./update_credit_note.js";
import { createCreditNoteFromInvoice } from "./create_credit_note_from_invoice.js";
import { sendCreditNote } from "./send_credit_note.js";
import { getCreditNotePdf } from "./get_credit_note_pdf.js";
import { resetCreditNoteToDraft } from "./reset_credit_note_to_draft.js";
import { resetCreditNoteToOpen } from "./reset_credit_note_to_open.js";
import { deleteCreditNote } from "./delete_credit_note.js";
import { listCreditNotePositions } from "./list_credit_note_positions.js";

export const tools = [
  listCreditNotes,
  getCreditNote,
  createCreditNote,
  updateCreditNote,
  createCreditNoteFromInvoice,
  sendCreditNote,
  getCreditNotePdf,
  resetCreditNoteToDraft,
  resetCreditNoteToOpen,
  deleteCreditNote,
  listCreditNotePositions
];
