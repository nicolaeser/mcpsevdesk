import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema, pickVatId, vatIdFields } from "./helpers.js";

export const validateVatId = defineTool(
    "sevdesk_validate_vat_id",
    "Validate VAT ID format",
    "Check VAT ID format (does not call VIES). Pass vatId or raw. Optional expected ISO country.",
    vatIdFields.extend({
      country: z.string().optional(),
      expectedCountry: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () =>
        ctx.client.taxes.validateVatIdFormat(pickVatId(input), input.country ?? input.expectedCountry)
      )
  );
