import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema } from "./helpers.js";

export const getBookkeepingSystemVersion = defineTool(
    "sevdesk_get_bookkeeping_system_version",
    "Get bookkeeping system version",
    "Get the tenant bookkeeping system version (1.0 or 2.0).",
    z.object({}),
    (ctx) =>
      runTool(ctx, async () => (await ctx.client.raw.basics.bookkeepingSystemVersion()).data)
  );
