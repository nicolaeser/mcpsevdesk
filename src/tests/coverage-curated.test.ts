import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { createSevdeskClient, type SevdeskClient } from "npmsevdesk";
import { describe, expect, it } from "vitest";
import { TOOL_NAMES } from "../mcp/catalog.js";

const npmsevdeskRoot = dirname(createRequire(import.meta.url).resolve("npmsevdesk/package.json"));

const BUNDLE_CLASSES = [
  ["contacts", "bundles/contacts.d.ts", "ContactsBundle"],
  ["invoices", "bundles/invoices.d.ts", "InvoicesBundle"],
  ["orders", "bundles/orders.d.ts", "OrdersBundle"],
  ["creditNotes", "bundles/credit-notes.d.ts", "CreditNotesBundle"],
  ["vouchers", "bundles/vouchers.d.ts", "VouchersBundle"],
  ["payments", "bundles/payments.d.ts", "PaymentsBundle"],
  ["reminders", "bundles/reminders.d.ts", "RemindersBundle"],
  ["layout", "bundles/layout.d.ts", "LayoutBundle"],
  ["parts", "bundles/parts.d.ts", "PartsBundle"],
  ["sequences", "bundles/sequences.d.ts", "SequencesBundle"],
  ["users", "bundles/users.d.ts", "UsersBundle"],
  ["checkAccounts", "bundles/check-accounts.d.ts", "CheckAccountsBundle"],
  ["transactions", "bundles/transactions.d.ts", "TransactionsBundle"],
  ["exports", "bundles/exports.d.ts", "ExportsBundle"],
  ["reports", "bundles/reports.d.ts", "ReportsBundle"],
  ["tags", "bundles/tags.d.ts", "TagsBundle"],
  ["textTemplates", "bundles/text-templates.d.ts", "TextTemplatesBundle"],
  ["lookup", "lookup/lookup.d.ts", "LookupModule"],
  ["taxes", "taxes/taxes.d.ts", "TaxesModule"]
] as const;

const NESTED_CLASSES = [
  ["contacts.addresses", "bundles/contact-children.d.ts", "ContactAddressesModule"],
  ["contacts.communicationWays", "bundles/contact-children.d.ts", "ContactCommunicationWaysModule"]
] as const;

type CoverNode = string | readonly string[] | { readonly [key: string]: CoverNode };

const COVERING_TOOLS = {
  contacts: {
    list: "sevdesk_list_contacts",
    get: "sevdesk_get_contact",
    create: "sevdesk_create_contact",
    update: "sevdesk_update_contact",
    delete: "sevdesk_delete_contact",
    upsert: "sevdesk_upsert_contact",
    nextCustomerNumber: "sevdesk_next_sequence",
    addresses: {
      create: "sevdesk_create_contact_address",
      update: "sevdesk_update_contact_address",
      remove: "sevdesk_delete_contact_address"
    },
    communicationWays: {
      create: "sevdesk_create_contact_communication",
      update: "sevdesk_update_contact_communication",
      remove: "sevdesk_delete_contact_communication"
    }
  },
  invoices: {
    list: "sevdesk_list_invoices",
    listPositions: "sevdesk_list_invoice_positions",
    get: "sevdesk_get_invoice",
    create: "sevdesk_create_invoice",
    update: "sevdesk_update_invoice",
    delete: "sevdesk_delete_invoice",
    updatePosition: "sevdesk_update_invoice_position",
    createAndFinalize: ["sevdesk_create_invoice", "sevdesk_send_invoice"],
    createAndDeliver: ["sevdesk_create_invoice", "sevdesk_send_invoice"],
    createAndBook: ["sevdesk_create_invoice", "sevdesk_book_payment"],
    createFromOrder: "sevdesk_create_invoice_from_order",
    book: "sevdesk_book_payment",
    sendByEmail: "sevdesk_send_invoice",
    markAsSent: "sevdesk_send_invoice",
    cancel: ["sevdesk_create_credit_note_from_invoice", "sevdesk_create_invoice"],
    enshrine: "sevdesk_get_invoice",
    getPdf: "sevdesk_get_invoice_pdf",
    getXml: "sevdesk_get_invoice_xml",
    render: "sevdesk_render_invoice",
    setLayout: "sevdesk_set_layout",
    resetToDraft: "sevdesk_reset_invoice_to_draft",
    resetToOpen: "sevdesk_reset_invoice_to_open",
    reconcileFinalization: "sevdesk_send_invoice",
    resumeFinalization: "sevdesk_send_invoice"
  },
  orders: {
    list: "sevdesk_list_orders",
    get: "sevdesk_get_order",
    create: "sevdesk_create_order",
    update: "sevdesk_update_order",
    delete: "sevdesk_delete_order",
    createAndDeliver: ["sevdesk_create_order", "sevdesk_send_order"],
    sendByEmail: "sevdesk_send_order",
    markAsSent: "sevdesk_send_order",
    createPackingList: "sevdesk_create_order",
    createContractNote: "sevdesk_create_order",
    setLayout: "sevdesk_set_layout",
    getPdf: "sevdesk_get_order_pdf"
  },
  creditNotes: {
    list: "sevdesk_list_credit_notes",
    get: "sevdesk_get_credit_note",
    create: "sevdesk_create_credit_note",
    update: "sevdesk_update_credit_note",
    createAndDeliver: ["sevdesk_create_credit_note", "sevdesk_send_credit_note"],
    createFromInvoice: "sevdesk_create_credit_note_from_invoice",
    createFromVoucher: "sevdesk_create_credit_note",
    book: "sevdesk_book_payment",
    sendByEmail: "sevdesk_send_credit_note",
    markAsSent: "sevdesk_send_credit_note",
    getPdf: "sevdesk_get_credit_note_pdf",
    resetToDraft: "sevdesk_reset_credit_note_to_draft",
    resetToOpen: "sevdesk_reset_credit_note_to_open",
    setLayout: "sevdesk_set_layout"
  },
  vouchers: {
    list: "sevdesk_list_vouchers",
    get: "sevdesk_get_voucher",
    create: "sevdesk_create_voucher",
    update: "sevdesk_update_voucher",
    uploadAttachment: "sevdesk_upload_voucher_attachment",
    createWithAttachment: ["sevdesk_upload_voucher_attachment", "sevdesk_create_voucher"],
    createAndBook: ["sevdesk_create_voucher", "sevdesk_book_payment"],
    book: "sevdesk_book_payment",
    resetToOpen: "sevdesk_reset_voucher_to_open",
    resetToDraft: "sevdesk_reset_voucher_to_draft"
  },
  payments: {
    book: "sevdesk_book_payment"
  },
  reminders: {
    getLastForInvoice: "sevdesk_get_last_reminder",
    checkEligibility: "sevdesk_check_reminder_eligibility",
    create: "sevdesk_create_reminder"
  },
  layout: {
    listTemplates: "sevdesk_list_layout_templates",
    findTemplate: "sevdesk_find_layout_template",
    listLetterpapers: "sevdesk_list_letterpapers",
    setInvoiceLayout: "sevdesk_set_layout",
    setOrderLayout: "sevdesk_set_layout",
    setCreditNoteLayout: "sevdesk_set_layout",
    setLayout: "sevdesk_set_layout"
  },
  parts: {
    list: "sevdesk_list_parts",
    get: "sevdesk_get_part",
    getStock: "sevdesk_get_part",
    create: "sevdesk_create_part",
    update: "sevdesk_update_part"
  },
  sequences: {
    next: "sevdesk_next_sequence"
  },
  users: {
    list: "sevdesk_list_users",
    get: "sevdesk_get_user"
  },
  checkAccounts: {
    list: "sevdesk_list_check_accounts",
    get: "sevdesk_get_check_account",
    createClearing: "sevdesk_create_clearing_account",
    createFileImport: "sevdesk_create_clearing_account",
    update: "sevdesk_update_check_account",
    delete: "sevdesk_delete_check_account",
    balanceAt: "sevdesk_check_account_balance"
  },
  transactions: {
    list: "sevdesk_list_transactions",
    get: "sevdesk_get_transaction",
    create: "sevdesk_create_transaction",
    update: "sevdesk_update_transaction",
    delete: "sevdesk_delete_transaction",
    enshrine: "sevdesk_get_transaction"
  },
  exports: {
    invoices: "sevdesk_list_invoices",
    invoiceZip: "sevdesk_get_invoice_pdf",
    creditNotes: "sevdesk_get_credit_note_pdf",
    vouchers: "sevdesk_list_vouchers",
    voucherZip: "sevdesk_get_documents",
    contacts: "sevdesk_list_contacts",
    transactions: "sevdesk_list_transactions",
    datevCsv: "sevdesk_list_tax_guidance",
    datevXml: "sevdesk_list_tax_guidance",
    downloadHash: "sevdesk_get_documents",
    progress: "sevdesk_get_documents",
    jobDownloadInfo: "sevdesk_get_documents",
    updateConfig: "sevdesk_get_bookkeeping_system_version"
  },
  reports: {
    invoices: "sevdesk_list_invoices",
    orders: "sevdesk_list_orders",
    vouchers: "sevdesk_list_vouchers",
    contacts: "sevdesk_list_contacts"
  },
  tags: {
    list: "sevdesk_list_tags",
    get: "sevdesk_get_tag",
    relations: "sevdesk_list_tag_relations",
    create: "sevdesk_create_tag",
    update: "sevdesk_update_tag",
    delete: "sevdesk_delete_tag"
  },
  textTemplates: {
    list: "sevdesk_list_text_templates",
    create: "sevdesk_create_text_template",
    update: "sevdesk_update_text_template",
    delete: "sevdesk_delete_text_template"
  },
  lookup: {
    contact: "sevdesk_find_contact",
    findContact: "sevdesk_find_contact",
    checkAccount: "sevdesk_find_check_account",
    findCheckAccount: "sevdesk_find_check_account",
    part: "sevdesk_find_part",
    findPart: "sevdesk_find_part",
    country: "sevdesk_find_country",
    findCountry: "sevdesk_find_country"
  },
  taxes: {
    getProfile: "sevdesk_tax_profile",
    refreshProfile: "sevdesk_tax_profile",
    resolve: "sevdesk_quote_sale_tax",
    resolveDigitalService: "sevdesk_quote_sale_tax",
    validateVatIdFormat: "sevdesk_validate_vat_id",
    isValidVatIdFormat: "sevdesk_validate_vat_id",
    normalizeVatId: "sevdesk_parse_vat_id",
    parseVatId: "sevdesk_parse_vat_id",
    resolveSale: "sevdesk_quote_sale_tax",
    calculateTaxedPrice: "sevdesk_calculate_taxed_price",
    quoteSale: "sevdesk_quote_sale_tax",
    getCountryRates: "sevdesk_get_country_rates",
    getCountryRatesResult: "sevdesk_get_country_rates",
    clearCountryRateCache: "sevdesk_get_country_rates",
    selectCountryRate: "sevdesk_get_country_rates",
    resolveCountryRate: "sevdesk_get_country_rates",
    listGuidance: "sevdesk_list_tax_guidance",
    checkVoucherCompatibility: "sevdesk_create_voucher"
  }
} as const satisfies CoverNode;

function dts(rel: string): string {
  return readFileSync(join(npmsevdeskRoot, "dist/types/esm", rel), "utf8");
}

function classBody(source: string, className: string): string {
  const marker = `export declare class ${className} `;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`missing class ${className}`);
  const brace = source.indexOf("{", start);
  if (brace < 0) throw new Error(`missing body for ${className}`);
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") depth += 1;
    else if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, index);
    }
  }
  throw new Error(`unclosed class ${className}`);
}

function publicMethodsFromClass(source: string, className: string): string[] {
  const names = new Set<string>();
  for (const line of classBody(source, className).split("\n")) {
    const match = /^[ \t]+(?!private\b)([A-Za-z][A-Za-z0-9]*)(?:<|\()/.exec(line);
    const name = match?.[1];
    if (name !== undefined && name !== "constructor") names.add(name);
  }
  return [...names].sort();
}

function publicCuratedMethods(): string[] {
  const methods: string[] = [];
  for (const [prefix, file, className] of [...BUNDLE_CLASSES, ...NESTED_CLASSES]) {
    for (const name of publicMethodsFromClass(dts(file), className)) {
      methods.push(`${prefix}.${name}`);
    }
  }
  return methods.sort();
}

function flattenCover(node: CoverNode, prefix = ""): Record<string, readonly string[]> {
  if (typeof node === "string") return { [prefix]: [node] };
  if (Array.isArray(node)) return { [prefix]: node };
  const out: Record<string, readonly string[]> = {};
  for (const [key, value] of Object.entries(node)) {
    const path = prefix.length === 0 ? key : `${prefix}.${key}`;
    Object.assign(out, flattenCover(value, path));
  }
  return out;
}

function valueAt(root: SevdeskClient, path: string): unknown {
  let current: unknown = root;
  for (const part of path.split(".")) {
    if (current === null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

const covering = flattenCover(COVERING_TOOLS);
const publicMethods = publicCuratedMethods();

describe("curated bundle coverage", () => {
  it("maps only real public curated bundle methods", () => {
    const unknown = Object.keys(covering).filter((path) => !publicMethods.includes(path));
    expect(unknown, unknown.join("\n")).toEqual([]);
  });

  it("covers every public curated bundle method with a KEEP tool or sequence", () => {
    const uncovered = publicMethods.filter((path) => covering[path] === undefined);
    expect(uncovered, uncovered.join("\n")).toEqual([]);
  });

  it("exposes those methods on the npmsevdesk client", () => {
    const client = createSevdeskClient({ apiToken: "coverage-token" });
    try {
      for (const path of publicMethods) {
        expect(typeof valueAt(client, path), path).toBe("function");
      }
    } finally {
      client.dispose();
    }
  });

  it("includes a TOOL_NAMES entry covering each mapped method", () => {
    const names = new Set(TOOL_NAMES);
    const missing: string[] = [];
    for (const [path, tools] of Object.entries(covering)) {
      if (!tools.some((name) => names.has(name))) {
        missing.push(`${path} -> ${tools.join(", ")}`);
      }
    }
    expect(missing, missing.join("\n")).toEqual([]);
  });
});
