import { tools as tools_checkAccounts_index_0 } from "../tools/check-accounts/index.js";
import { tools as tools_contacts_index_1 } from "../tools/contacts/index.js";
import { tools as tools_creditNotes_index_2 } from "../tools/credit-notes/index.js";
import { tools as tools_documents_index_3 } from "../tools/documents/index.js";
import { tools as tools_invoices_index_4 } from "../tools/invoices/index.js";
import { tools as tools_layout_index_5 } from "../tools/layout/index.js";
import { tools as tools_lookup_index_6 } from "../tools/lookup/index.js";
import { tools as tools_orders_index_7 } from "../tools/orders/index.js";
import { tools as tools_parts_index_8 } from "../tools/parts/index.js";
import { tools as tools_payments_index_9 } from "../tools/payments/index.js";
import { tools as tools_reminders_index_10 } from "../tools/reminders/index.js";
import { tools as tools_sequences_index_11 } from "../tools/sequences/index.js";
import { tools as tools_tags_index_12 } from "../tools/tags/index.js";
import { tools as tools_taxes_index_13 } from "../tools/taxes/index.js";
import { tools as tools_textTemplates_index_14 } from "../tools/text-templates/index.js";
import { tools as tools_transactions_index_15 } from "../tools/transactions/index.js";
import { tools as tools_users_index_16 } from "../tools/users/index.js";
import { tools as tools_vouchers_index_17 } from "../tools/vouchers/index.js";

const _all = [
  ...tools_checkAccounts_index_0,
  ...tools_contacts_index_1,
  ...tools_creditNotes_index_2,
  ...tools_documents_index_3,
  ...tools_invoices_index_4,
  ...tools_layout_index_5,
  ...tools_lookup_index_6,
  ...tools_orders_index_7,
  ...tools_parts_index_8,
  ...tools_payments_index_9,
  ...tools_reminders_index_10,
  ...tools_sequences_index_11,
  ...tools_tags_index_12,
  ...tools_taxes_index_13,
  ...tools_textTemplates_index_14,
  ...tools_transactions_index_15,
  ...tools_users_index_16,
  ...tools_vouchers_index_17
];

const _seen = new Set<string>();
export const TOOL_CATALOG = _all.filter((tool) => {
  if (_seen.has(tool.name)) return false;
  _seen.add(tool.name);
  return true;
});

export const TOOL_NAMES = TOOL_CATALOG.map((entry) => entry.name);
