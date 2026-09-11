import { getBookkeepingSystemVersion } from "./get_bookkeeping_system_version.js";
import { taxProfile } from "./tax_profile.js";
import { validateVatId } from "./validate_vat_id.js";
import { quoteSaleTax } from "./quote_sale_tax.js";
import { parseVatId } from "./parse_vat_id.js";
import { calculateTaxedPrice } from "./calculate_taxed_price.js";
import { getCountryRates } from "./get_country_rates.js";
import { listTaxGuidance } from "./list_tax_guidance.js";

export const tools = [
  getBookkeepingSystemVersion,
  taxProfile,
  validateVatId,
  quoteSaleTax,
  parseVatId,
  calculateTaxedPrice,
  getCountryRates,
  listTaxGuidance
];
