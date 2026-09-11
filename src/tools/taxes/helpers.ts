import {
  VatIdStatus,
  type DatedResolvedVatRate,
  type GermanSaleTaxInput,
  type TaxDestinationCountry,
  type TaxGuidanceQuery,
  type TaxLocationEvidence
} from "npmsevdesk";
import { z } from "zod";
import { entityId } from "../../sevdesk/ids.js";
import { pickVatId, sevdeskDate, vatIdFields } from "../../sevdesk/schemas.js";

export { pickVatId, vatIdFields };

export const taxDestinationCountrySchema = z.object({
  code: z.string().describe("ISO 3166-1 alpha-2, e.g. FR."),
  id: z.union([z.string(), z.number()]).describe("StaticCountry id from sevdesk_find_country."),
  objectName: z.literal("StaticCountry").optional()
});
export const countryRateEntrySchema = z.object({
  rate: z.number(),
  type: z.string().describe("STANDARD_RATE, REDUCED_RATE, or another sevdesk rate type."),
  kind: z.enum(["standard", "reduced", "unknown"])
});
export const datedResolvedVatRateSchema = z.object({
  countryCode: z.string(),
  ratePercent: z.number(),
  kind: z.enum(["standard", "reduced"]),
  source: z.enum(["package-baseline", "application", "sevdesk-api", "explicit"]),
  version: z.string(),
  asOf: z.string().describe("UTC calendar day YYYY-MM-DD."),
  availableRates: z.array(countryRateEntrySchema).optional()
});
export const locationEvidenceSchema = z.object({
  billingCountry: z.string(),
  ipCountry: z.string().optional(),
  paymentCountry: z.string().optional(),
  override: z
    .object({
      country: z.string(),
      reason: z.string(),
      reviewedBy: z.string()
    })
    .optional()
});
export const quoteSaleSchema = z.object({
  country: z.string().describe("ISO 3166-1 alpha-2 customer country, e.g. DE"),
  customerType: z.enum(["consumer", "business"]),
  product: z.enum(["goods", "electronic-service", "other-service"]),
  smallBusiness: z.boolean().optional(),
  vatId: z.string().optional().describe("Required evidence for EU B2B with valid VAT"),
  vatIdCountry: z.string().optional(),
  price: z.number().optional().describe("If set, returns a priced quote; otherwise the tax plan only"),
  quantity: z.number().positive().optional(),
  basis: z.enum(["net", "gross"]).optional(),
  effectiveDate: sevdeskDate.optional(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  locationEvidence: locationEvidenceSchema.optional(),
  euBusinessWithoutVat: z.enum(["fail", "tax-as-consumer"]).optional(),
  domesticTaxRate: z.number().optional(),
  euConsumerTaxation: z
    .enum(["seller-country", "oss-destination"])
    .optional()
    .describe("EU B2C: seller-country keeps the DE rate; oss-destination uses destinationCountry."),
  destinationCountry: taxDestinationCountrySchema.optional(),
  destinationRate: z.number().optional(),
  destinationRateKind: z.enum(["standard", "reduced"]).optional(),
  destinationRateExact: z.number().optional(),
  rateLookup: datedResolvedVatRateSchema.optional()
});

export const readOnly = { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
export const countryRateQuerySchema = z.object({
  countryCode: z.string().describe("ISO 3166-1 alpha-2."),
  date: sevdeskDate.optional().describe("UTC calendar day YYYY-MM-DD. Default today.")
});

export function taxGuidanceQuery(input: {
  readonly scope?: "all" | "revenue" | "expense" | undefined;
  readonly accountNumber?: number | undefined;
  readonly taxRuleCode?: string | undefined;
}): TaxGuidanceQuery {
  const selected = [
    input.accountNumber !== undefined,
    input.taxRuleCode !== undefined,
    input.scope !== undefined
  ].filter((value) => value).length;
  if (selected > 1) {
    throw new Error("sevdesk_list_tax_guidance accepts only one of scope, accountNumber, taxRuleCode.");
  }
  if (input.accountNumber !== undefined) return { accountNumber: input.accountNumber };
  if (input.taxRuleCode !== undefined) return { taxRuleCode: input.taxRuleCode };
  if (input.scope === "revenue" || input.scope === "expense") return { scope: input.scope };
  if (input.scope === "all") return { scope: "all" };
  return {};
}

export function saleInput(input: z.infer<typeof quoteSaleSchema>): GermanSaleTaxInput {
  const shared = {
    country: input.country,
    product: input.product,
    ...(input.effectiveDate === undefined ? {} : { effectiveDate: input.effectiveDate }),
    ...(input.evidence === undefined ? {} : { evidence: input.evidence }),
    ...(input.locationEvidence === undefined ? {} : { locationEvidence: locationEvidence(input.locationEvidence) })
  };
  if (input.smallBusiness === true) {
    return {
      ...shared,
      customerType: input.customerType,
      smallBusiness: true
    };
  }
  if (input.customerType === "consumer") {
    return {
      ...shared,
      customerType: "consumer",
      ...consumerTaxation(input)
    } as GermanSaleTaxInput;
  }
  if (input.vatId !== undefined) {
    return {
      ...shared,
      customerType: "business",
      vatId: {
        status: VatIdStatus.VALID,
        value: input.vatId,
        country: input.vatIdCountry ?? input.country,
        checkedAt: new Date().toISOString(),
        provider: "operator"
      }
    };
  }
  const taxAsConsumer = input.euBusinessWithoutVat === "tax-as-consumer";
  return {
    ...shared,
    customerType: "business",
    euBusinessWithoutVat: taxAsConsumer ? ("tax-as-consumer" as const) : ("fail" as const),
    ...(taxAsConsumer ? consumerTaxation(input) : {})
  } as GermanSaleTaxInput;
}

function consumerTaxation(input: z.infer<typeof quoteSaleSchema>): Record<string, unknown> {
  if (input.euConsumerTaxation === "seller-country") {
    return {
      euConsumerTaxation: "seller-country",
      ...(input.domesticTaxRate === undefined ? {} : { domesticTaxRate: input.domesticTaxRate })
    };
  }
  if (input.euConsumerTaxation === "oss-destination") {
    return {
      euConsumerTaxation: "oss-destination",
      ...(input.destinationCountry === undefined
        ? {}
        : { destinationCountry: taxDestinationCountry(input.destinationCountry) }),
      ...(input.destinationRate === undefined ? {} : { destinationRate: input.destinationRate }),
      ...(input.destinationRateKind === undefined ? {} : { destinationRateKind: input.destinationRateKind }),
      ...(input.destinationRateExact === undefined ? {} : { destinationRateExact: input.destinationRateExact }),
      ...(input.rateLookup === undefined ? {} : { rateLookup: datedResolvedVatRate(input.rateLookup) })
    };
  }
  return input.domesticTaxRate === undefined ? {} : { domesticTaxRate: input.domesticTaxRate };
}

function taxDestinationCountry(input: z.infer<typeof taxDestinationCountrySchema>): TaxDestinationCountry {
  return {
    code: input.code,
    id: entityId(input.id),
    objectName: "StaticCountry"
  };
}

function locationEvidence(input: z.infer<typeof locationEvidenceSchema>): TaxLocationEvidence {
  return {
    billingCountry: input.billingCountry,
    ...(input.ipCountry === undefined ? {} : { ipCountry: input.ipCountry }),
    ...(input.paymentCountry === undefined ? {} : { paymentCountry: input.paymentCountry }),
    ...(input.override === undefined ? {} : { override: input.override })
  };
}

function datedResolvedVatRate(input: z.infer<typeof datedResolvedVatRateSchema>): DatedResolvedVatRate {
  return {
    countryCode: input.countryCode,
    ratePercent: input.ratePercent,
    kind: input.kind,
    source: input.source,
    version: input.version,
    asOf: input.asOf,
    ...(input.availableRates === undefined ? {} : { availableRates: input.availableRates })
  };
}
