import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { taxDestinationCountrySchema, countryRateEntrySchema, datedResolvedVatRateSchema, locationEvidenceSchema, quoteSaleSchema, readOnly, countryRateQuerySchema, saleInput } from "./helpers.js";

export const quoteSaleTax = defineTool(
    "sevdesk_quote_sale_tax",
    "Quote German sale tax",
    "Resolve German sale tax for a DE seller. Copy plan.taxRule onto the invoice/order/credit-note taxRule and plan.defaultTaxRate (or position.taxRate) onto every line. DE consumer/business → taxRule 1 and taxRate 19 (7 if reduced). EU B2B goods with vatId → taxRule 3 / 0%. EU B2B services with vatId → taxRule 21 / 0%. Non-EU goods → 2 / 0%; non-EU services → 17 / 0%. Kleinunternehmer → smallBusiness true → 11 / 0%. EU B2C: euConsumerTaxation seller-country or oss-destination with destinationCountry from sevdesk_find_country (taxRule 18 goods / 19 electronic-service / 20 other-service). If price is set, also returns priced amounts.",
    quoteSaleSchema,
    (ctx, input) =>
      runTool(ctx, async () => {
        const sale = saleInput(input);
        if (input.price === undefined) {
          const resolved = await ctx.client.taxes.resolveSale(sale);
          return { plan: resolved.data, decision: resolved.decision, evidence: resolved.evidence };
        }
        const quoted = await ctx.client.taxes.quoteSale({
          ...sale,
          price: input.price,
          ...(input.quantity === undefined ? {} : { quantity: input.quantity }),
          ...(input.basis === undefined ? {} : { basis: input.basis })
        });
        return {
          amounts: quoted.amounts,
          plan: quoted.tax,
          decision: quoted.decision,
          position: quoted.position,
          evidence: quoted.evidence
        };
      })
  );
