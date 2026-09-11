import { listCheckAccounts } from "./list_check_accounts.js";
import { getCheckAccount } from "./get_check_account.js";
import { createClearingAccount } from "./create_clearing_account.js";
import { updateCheckAccount } from "./update_check_account.js";
import { deleteCheckAccount } from "./delete_check_account.js";
import { checkAccountBalance } from "./check_account_balance.js";

export const tools = [
  listCheckAccounts,
  getCheckAccount,
  createClearingAccount,
  updateCheckAccount,
  deleteCheckAccount,
  checkAccountBalance
];
