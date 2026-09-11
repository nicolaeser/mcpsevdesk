import { getAccountingContactById } from "./get_accounting_contact_by_id.js";
import { createAccountingContact } from "./create_accounting_contact.js";
import { updateAccountingContact } from "./update_accounting_contact.js";
import { deleteAccountingContact } from "./delete_accounting_contact.js";
import { getContactAddresses } from "./get_contact_addresses.js";
import { updateContactAddress } from "./update_contact_address.js";
import { getCommunicationWayKeys } from "./get_communication_way_keys.js";
import { updateContactCommunication } from "./update_contact_communication.js";
import { listContacts } from "./list_contacts.js";
import { getContact } from "./get_contact.js";
import { createContact } from "./create_contact.js";
import { updateContact } from "./update_contact.js";
import { deleteContact } from "./delete_contact.js";
import { createContactAddress } from "./create_contact_address.js";
import { createContactCommunication } from "./create_contact_communication.js";
import { deleteContactCommunication } from "./delete_contact_communication.js";
import { deleteContactAddress } from "./delete_contact_address.js";
import { upsertContact } from "./upsert_contact.js";

export const tools = [
  getAccountingContactById,
  createAccountingContact,
  updateAccountingContact,
  deleteAccountingContact,
  getContactAddresses,
  updateContactAddress,
  getCommunicationWayKeys,
  updateContactCommunication,
  listContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
  createContactAddress,
  createContactCommunication,
  deleteContactCommunication,
  deleteContactAddress,
  upsertContact
];
