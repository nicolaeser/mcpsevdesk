import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema } from "./helpers.js";

export const calculateTaxedPrice = defineTool(
    "sevdesk_calculate_taxed_price",
    "Calculate taxed price",
    "Calculate net/tax/gross amounts from a unit price and tax rate.",
    z.object({
      price: z.number(),
      taxRate: z.number(),
      quantity: z.number().optional(),
      basis: z.enum(["net", "gross"]).optional(),
      decimals: z.number().int().min(0).max(6).optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () =>
        ctx.client.taxes.calculateTaxedPrice({
          price: input.price,
          taxRate: input.taxRate,
          ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
          ...(input.basis === undefined ? {} : { basis: input.basis }),
          ...(input.decimals === undefined ? {} : { decimals: input.decimals })
        })
      ),
    readOnly
  );
