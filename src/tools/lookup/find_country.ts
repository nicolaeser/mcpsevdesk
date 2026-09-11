import type { CheckAccountLookupCriteria, ContactLookupCriteria, PartLookupCriteria } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields } from "../../mcp/format.js";
import { lookupCountryByIso } from "./countries.js";
import { foundResult, contactCriteria, checkAccountCriteria, partCriteria } from "./helpers.js";

export const findCountry = defineTool(
    "sevdesk_find_country",
    "Find country",
    "Find a static country by ISO 3166-1 alpha-2 code (DE, FR, …). Returns found:false when missing instead of throwing. Accepts lowercase.",
    z.object({
      code: z.string().describe("ISO 3166-1 alpha-2, e.g. DE. Lowercase is accepted.")
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const country = await lookupCountryByIso(ctx.client, input.code, true);
        return country === undefined ? { found: false } : { found: true, country: recordFields(country) };
      })
  );
