import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload } from "../../mcp/format.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema, taxGuidanceQuery } from "./helpers.js";

export const listTaxGuidance = defineTool(
    "sevdesk_list_tax_guidance",
    "List tax guidance",
    "List voucher receipt-guide tax guidance. Pass only one of scope, accountNumber, or taxRuleCode.",
    z.object({
      scope: z.enum(["all", "revenue", "expense"]).optional(),
      accountNumber: z.number().int().nonnegative().optional(),
      taxRuleCode: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const result = await ctx.client.taxes.listGuidance(taxGuidanceQuery(input));
        return listPayload(result.data, result.pagination);
      })
  );
