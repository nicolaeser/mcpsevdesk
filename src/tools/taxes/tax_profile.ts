import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema } from "./helpers.js";

export const taxProfile = defineTool(
    "sevdesk_tax_profile",
    "Tax profile",
    "Read whether the tenant is bookkeeping 1.0 (taxType) or 2.0 (taxRule). It does not say Kleinunternehmer — pass smallBusiness to sevdesk_quote_sale_tax for §19 UStG. Pass refresh true to reload the in-process cache first.",
    z.object({
      refresh: z.boolean().optional().describe("When true, reload the in-process tax profile cache before reading.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        if (input.refresh === true) await ctx.client.taxes.refreshProfile();
        return (await ctx.client.taxes.getProfile()).data;
      })
  );
