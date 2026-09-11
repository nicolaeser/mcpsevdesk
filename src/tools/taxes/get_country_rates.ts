import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema } from "./helpers.js";

export const getCountryRates = defineTool(
    "sevdesk_get_country_rates",
    "Get country VAT rates",
    "Load dated country VAT rates.",
    countryRateQuerySchema,
    (ctx, input) =>
      runTool(ctx, async () =>
        ctx.client.taxes.getCountryRates({
          countryCode: input.countryCode,
          ...(input.date === undefined ? {} : { date: input.date })
        })
      )
  );
