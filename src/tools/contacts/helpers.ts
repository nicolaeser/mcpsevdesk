import { CommunicationWayKeyName, refs, type CompleteContactInput, type ContactUpdateInput } from "npmsevdesk";
import { z } from "zod";
import { confirmField, contactRef, entityId, idInput, omitUndefined, staticCountryRef } from "../../sevdesk/ids.js";
import { extraFields, mergeExtra, postalCode, sevdeskDate } from "../../sevdesk/schemas.js";

export const accountingFields = {
  debitorNumber: z
    .number()
    .nullable()
    .optional()
    .describe("DATEV debitor (customer) account number from Model_AccountingContact."),
  creditorNumber: z
    .number()
    .nullable()
    .optional()
    .describe("DATEV creditor (supplier) account number from Model_AccountingContact.")
};

export function accountingBody(input: {
  readonly debitorNumber?: number | null | undefined;
  readonly creditorNumber?: number | null | undefined;
}) {
  return {
    ...(input.debitorNumber === undefined ? {} : { debitorNumber: input.debitorNumber }),
    ...(input.creditorNumber === undefined ? {} : { creditorNumber: input.creditorNumber })
  };
}

export function accountingContactIdOf(input: {
  readonly accountingContactId?: string | number | undefined;
  readonly id?: string | number | undefined;
}): string | number {
  const accountingContactId = input.accountingContactId ?? input.id;
  if (accountingContactId === undefined) {
    throw new Error("Pass accountingContactId or id.");
  }
  return accountingContactId;
}

export const commType = z.enum(["EMAIL", "PHONE", "WEB", "MOBILE", "FAX"]);
export const commKey = z.enum(["work", "private", "mobile", "invoice", "newsletter", "autobox", "fax"]);

export function communicationKey(value: z.infer<typeof commKey> | undefined) {
  if (value === undefined) return CommunicationWayKeyName.WORK;
  if (value === "private") return CommunicationWayKeyName.PRIVATE;
  if (value === "mobile") return CommunicationWayKeyName.MOBILE;
  if (value === "invoice") return CommunicationWayKeyName.INVOICE_ADDRESS;
  if (value === "newsletter") return CommunicationWayKeyName.NEWSLETTER;
  if (value === "autobox") return CommunicationWayKeyName.AUTOBOX;
  if (value === "fax") return CommunicationWayKeyName.FAX;
  return CommunicationWayKeyName.WORK;
}

export const contactEmbed = z
  .array(z.enum(["category", "mainAddress", "parent", "parent.category", "taxSet"]))
  .optional();
export const contactCategory = z.enum(["customer", "supplier", "partner", "prospect_customer"]);
export const contactStatus = z.enum(["lead", "pending", "active"]);
export const taxType = z.enum(["default", "eu", "noteu", "ss", "custom"]);

export const addressInput = z.object({
  countryId: idInput.describe("StaticCountry id from sevdesk_find_country. Do not guess."),
  categoryId: idInput.optional().describe("Address Category id. Omit for none."),
  street: z.string().min(1).optional().describe("Street and house number."),
  zip: postalCode.optional(),
  city: z.string().min(1).optional().describe("City."),
  name: z.string().optional().describe("Optional address label."),
  name2: z.string().optional(),
  name3: z.string().optional(),
  name4: z.string().optional(),
  extra: extraFields
});

export const communicationInput = z.object({
  type: commType,
  value: z.string().min(1),
  key: commKey.optional(),
  keyId: idInput.optional().describe("CommunicationWayKey id. Overrides key when set."),
  main: z.boolean().optional(),
  extra: extraFields
});

export const accountingInput = z.object({
  debitorNumber: z.number().int().optional(),
  creditorNumber: z.number().int().optional(),
  extra: extraFields
});

export const taxInput = z.object({
  taxType: taxType.optional().describe("Legacy contact tax type. custom requires taxSetId."),
  taxSetId: idInput.optional().describe("TaxSet id. Required when taxType=custom."),
  taxNumber: z.string().optional(),
  taxOffice: z.string().optional(),
  exemptVat: z.boolean().optional(),
  extra: extraFields
});

export const upsertInput = z.object({
  confirm: confirmField,
  customerNumber: z
    .string()
    .min(1)
    .describe("Match identity and create customer number. Do not use 'next'."),
  kind: z
    .enum(["organisation", "person"])
    .describe("organisation requires name. person requires firstName and lastName."),
  name: z.string().min(1).optional().describe("Required when kind=organisation. Company name."),
  additionalName: z.string().optional().describe("Second organisation name (name2)."),
  firstName: z.string().min(1).optional().describe("Required when kind=person."),
  lastName: z.string().min(1).optional().describe("Required when kind=person."),
  middleName: z.string().optional().describe("Person middle name (name2)."),
  title: z.string().optional().describe("Person title (titel)."),
  academicTitle: z.string().optional(),
  parentOrganisationId: idInput
    .optional()
    .describe("Parent organisation Contact id when kind=organisation."),
  organisationId: idInput.optional().describe("Employer/organisation Contact id when kind=person."),
  category: contactCategory.optional().describe("Defaults to customer on create."),
  categoryId: idInput.optional().describe("Category id. Overrides category when set."),
  status: contactStatus.optional(),
  description: z.string().optional().describe("Free-text notes on the contact."),
  gender: z.string().optional(),
  birthday: sevdeskDate.optional(),
  vatNumber: z
    .string()
    .optional()
    .describe("USt-IdNr. Use a value that passes sevdesk_validate_vat_id, e.g. DE123456789."),
  bankAccount: z.string().optional(),
  bankNumber: z.string().optional(),
  defaultCashbackTime: z.number().int().optional(),
  defaultCashbackPercent: z.number().optional(),
  defaultTimeToPay: z.number().int().optional(),
  defaultDiscountAmount: z.number().optional(),
  defaultDiscountPercentage: z.boolean().optional(),
  buyerReference: z.string().optional(),
  governmentAgency: z.boolean().optional(),
  tax: taxInput.optional(),
  addresses: z
    .array(addressInput)
    .optional()
    .describe("Created only when the contact is created. countryId is required."),
  communicationWays: z
    .array(communicationInput)
    .optional()
    .describe("Created only when the contact is created."),
  accounting: accountingInput
    .optional()
    .describe("Debitor/creditor numbers. Created only when the contact is created."),
  extra: extraFields
});

type UpsertInput = z.infer<typeof upsertInput>;

export function buildCreateContact(input: {
  kind: "organisation" | "person";
  name?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  customerNumber?: string | undefined;
  category?: "customer" | "supplier" | "partner" | "prospect_customer" | undefined;
  description?: string | undefined;
  vatNumber?: string | undefined;
}): CompleteContactInput["contact"] {
  const category = input.category ?? "customer";
  if (input.kind === "organisation") {
    if (input.name === undefined || input.name.trim() === "") {
      throw new Error("sevdesk_create_contact requires name for organisation contacts.");
    }
    return omitUndefined({
      kind: "organisation" as const,
      name: input.name,
      category,
      customerNumber: input.customerNumber,
      description: input.description,
      vatNumber: input.vatNumber
    }) as CompleteContactInput["contact"];
  }
  if (input.firstName === undefined || input.lastName === undefined) {
    throw new Error("sevdesk_create_contact requires firstName and lastName for person contacts.");
  }
  return omitUndefined({
    kind: "person" as const,
    firstName: input.firstName,
    lastName: input.lastName,
    category,
    customerNumber: input.customerNumber,
    description: input.description,
    vatNumber: input.vatNumber
  }) as CompleteContactInput["contact"];
}

export function buildUpdateContact(input: {
  kind: "organisation" | "person";
  name?: string | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
  description?: string | undefined;
  vatNumber?: string | undefined;
  status?: "lead" | "pending" | "active" | undefined;
}): ContactUpdateInput {
  if (input.kind === "organisation") {
    return omitUndefined({
      kind: "organisation" as const,
      name: input.name,
      description: input.description,
      vatNumber: input.vatNumber,
      status: input.status
    }) as ContactUpdateInput;
  }
  return omitUndefined({
    kind: "person" as const,
    firstName: input.firstName,
    lastName: input.lastName,
    description: input.description,
    vatNumber: input.vatNumber,
    status: input.status
  }) as ContactUpdateInput;
}

function resolveCategory(input: UpsertInput) {
  if (input.categoryId !== undefined) return refs.category(entityId(input.categoryId));
  if (input.category !== undefined) return input.category;
  return undefined;
}

function contactTaxType(tax: z.infer<typeof taxInput> | undefined) {
  if (tax === undefined) return {};
  if (tax.taxType === "custom" || (tax.taxType === undefined && tax.taxSetId !== undefined)) {
    if (tax.taxSetId === undefined) {
      throw new Error("sevdesk_upsert_contact taxType=custom requires taxSetId.");
    }
    return mergeExtra(
      { taxType: "custom" as const, taxSet: refs.taxSet(entityId(tax.taxSetId)) },
      tax.extra
    );
  }
  if (tax.taxSetId !== undefined) {
    throw new Error("sevdesk_upsert_contact taxSetId can only be used with taxType=custom.");
  }
  return mergeExtra(tax.taxType === undefined ? {} : { taxType: tax.taxType }, tax.extra);
}

function commonContactFields(input: UpsertInput) {
  const tax = input.tax;
  return {
    ...(input.description === undefined ? {} : { description: input.description }),
    ...(input.academicTitle === undefined ? {} : { academicTitle: input.academicTitle }),
    ...(input.gender === undefined ? {} : { gender: input.gender }),
    ...(input.birthday === undefined ? {} : { birthday: input.birthday }),
    ...(input.vatNumber === undefined ? {} : { vatNumber: input.vatNumber }),
    ...(input.bankAccount === undefined ? {} : { bankAccount: input.bankAccount }),
    ...(input.bankNumber === undefined ? {} : { bankNumber: input.bankNumber }),
    ...(input.defaultCashbackTime === undefined ? {} : { defaultCashbackTime: input.defaultCashbackTime }),
    ...(input.defaultCashbackPercent === undefined
      ? {}
      : { defaultCashbackPercent: input.defaultCashbackPercent }),
    ...(input.defaultTimeToPay === undefined ? {} : { defaultTimeToPay: input.defaultTimeToPay }),
    ...(tax?.taxNumber === undefined ? {} : { taxNumber: tax.taxNumber }),
    ...(tax?.taxOffice === undefined ? {} : { taxOffice: tax.taxOffice }),
    ...(tax?.exemptVat === undefined ? {} : { exemptVat: tax.exemptVat }),
    ...(input.defaultDiscountAmount === undefined
      ? {}
      : { defaultDiscountAmount: input.defaultDiscountAmount }),
    ...(input.defaultDiscountPercentage === undefined
      ? {}
      : { defaultDiscountPercentage: input.defaultDiscountPercentage }),
    ...(input.buyerReference === undefined ? {} : { buyerReference: input.buyerReference }),
    ...(input.governmentAgency === undefined ? {} : { governmentAgency: input.governmentAgency }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...contactTaxType(tax)
  };
}

function mapAddress(address: z.infer<typeof addressInput>) {
  return mergeExtra(
    {
      country: staticCountryRef(address.countryId),
      category: address.categoryId === undefined ? null : refs.category(entityId(address.categoryId)),
      ...(address.street === undefined ? {} : { street: address.street }),
      ...(address.zip === undefined ? {} : { zip: address.zip }),
      ...(address.city === undefined ? {} : { city: address.city }),
      ...(address.name === undefined ? {} : { name: address.name }),
      ...(address.name2 === undefined ? {} : { name2: address.name2 }),
      ...(address.name3 === undefined ? {} : { name3: address.name3 }),
      ...(address.name4 === undefined ? {} : { name4: address.name4 })
    },
    address.extra
  );
}

function mapCommunicationWay(way: z.infer<typeof communicationInput>) {
  return mergeExtra(
    {
      type: way.type,
      value: way.value,
      key:
        way.keyId === undefined
          ? communicationKey(way.key)
          : refs.communicationWayKey(entityId(way.keyId)),
      ...(way.main === undefined ? {} : { main: way.main })
    },
    way.extra
  );
}

function mapAccounting(accounting: z.infer<typeof accountingInput>) {
  return mergeExtra(
    {
      ...(accounting.debitorNumber === undefined ? {} : { debitorNumber: accounting.debitorNumber }),
      ...(accounting.creditorNumber === undefined
        ? {}
        : { creditorNumber: accounting.creditorNumber })
    },
    accounting.extra
  );
}

function buildUpsertCreateContact(input: UpsertInput): CompleteContactInput["contact"] {
  const category = resolveCategory(input) ?? "customer";
  const common = {
    category,
    customerNumber: input.customerNumber,
    ...commonContactFields(input)
  };
  if (input.kind === "organisation") {
    const name = input.name?.trim() ?? "";
    if (name === "") {
      throw new Error("sevdesk_upsert_contact requires name for organisation contacts.");
    }
    return mergeExtra(
      {
        kind: "organisation" as const,
        name,
        ...common,
        ...(input.additionalName === undefined ? {} : { additionalName: input.additionalName }),
        ...(input.parentOrganisationId === undefined
          ? {}
          : { parentOrganisation: contactRef(input.parentOrganisationId) })
      },
      input.extra
    ) as CompleteContactInput["contact"];
  }
  const firstName = input.firstName?.trim() ?? "";
  const lastName = input.lastName?.trim() ?? "";
  if (firstName === "" || lastName === "") {
    throw new Error("sevdesk_upsert_contact requires firstName and lastName for person contacts.");
  }
  return mergeExtra(
    {
      kind: "person" as const,
      firstName,
      lastName,
      ...common,
      ...(input.middleName === undefined ? {} : { middleName: input.middleName }),
      ...(input.title === undefined ? {} : { title: input.title }),
      ...(input.organisationId === undefined ? {} : { organisation: contactRef(input.organisationId) })
    },
    input.extra
  ) as CompleteContactInput["contact"];
}

export function buildCreatePayload(input: UpsertInput): CompleteContactInput {
  const addresses =
    input.addresses === undefined || input.addresses.length === 0
      ? undefined
      : input.addresses.map(mapAddress);
  const communicationWays =
    input.communicationWays === undefined || input.communicationWays.length === 0
      ? undefined
      : input.communicationWays.map(mapCommunicationWay);
  const accounting = input.accounting === undefined ? undefined : mapAccounting(input.accounting);
  return {
    contact: buildUpsertCreateContact(input),
    ...(addresses === undefined ? {} : { addresses }),
    ...(communicationWays === undefined ? {} : { communicationWays }),
    ...(accounting === undefined ? {} : { accounting })
  } as CompleteContactInput;
}

export function buildMergeContact(input: UpsertInput) {
  const category = resolveCategory(input);
  const common = {
    ...commonContactFields(input),
    ...(category === undefined ? {} : { category })
  };
  if (input.kind === "organisation") {
    const merge = {
      kind: "organisation" as const,
      ...common,
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.additionalName === undefined ? {} : { additionalName: input.additionalName }),
      ...(input.parentOrganisationId === undefined
        ? {}
        : { parentOrganisation: contactRef(input.parentOrganisationId) })
    };
    if (Object.keys(merge).every((key) => key === "kind")) return undefined;
    return merge;
  }
  const merge = {
    kind: "person" as const,
    ...common,
    ...(input.firstName === undefined ? {} : { firstName: input.firstName }),
    ...(input.lastName === undefined ? {} : { lastName: input.lastName }),
    ...(input.middleName === undefined ? {} : { middleName: input.middleName }),
    ...(input.title === undefined ? {} : { title: input.title }),
    ...(input.organisationId === undefined ? {} : { organisation: contactRef(input.organisationId) })
  };
  if (Object.keys(merge).every((key) => key === "kind")) return undefined;
  return merge;
}
