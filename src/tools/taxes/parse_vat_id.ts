import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema, pickVatId, vatIdFields } from "./helpers.js";

export const parseVatId = defineTool(
    "sevdesk_parse_vat_id",
    "Parse VAT ID",
    "Parse a VAT ID into prefix, national number, country, and normalized value. Pass vatId or raw.",
    vatIdFields,
    (ctx, input) => runTool(ctx, async () => ctx.client.taxes.parseVatId(pickVatId(input))),
    readOnly
  );
