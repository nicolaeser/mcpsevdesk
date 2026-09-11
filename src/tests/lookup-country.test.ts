import { describe, expect, it } from "vitest";
import { lookupCountryByIso, normalizeIsoCountryCode } from "../tools/lookup/countries.js";

describe("country ISO lookup", () => {
  it("accepts DE, de, and EL→GR", () => {
    expect(normalizeIsoCountryCode("DE")).toBe("DE");
    expect(normalizeIsoCountryCode("de")).toBe("DE");
    expect(normalizeIsoCountryCode(" de ")).toBe("DE");
    expect(normalizeIsoCountryCode("EL")).toBe("GR");
    expect(normalizeIsoCountryCode("EURO")).toBeUndefined();
    expect(normalizeIsoCountryCode("")).toBeUndefined();
  });

  it("skips non-ISO country rows instead of throwing", async () => {
    const client = {
      request: async () => ({
        data: [
          { id: "99", objectName: "StaticCountry", code: "EURO", name: "Eurozone" },
          { id: "1", objectName: "StaticCountry", code: "de", name: "Germany" }
        ],
        json: { total: 2 },
        pagination: { total: 2, returned: 2, offset: 0 }
      })
    };
    const country = await lookupCountryByIso(client as never, "DE", false);
    expect(country).toMatchObject({ id: "1", code: "DE", name: "Germany" });
  });

  it("returns undefined when optional and missing", async () => {
    const client = {
      request: async () => ({
        data: [{ id: "99", objectName: "StaticCountry", code: "FR", name: "France" }],
        json: { total: 1 },
        pagination: { total: 1, returned: 1, offset: 0 }
      })
    };
    await expect(lookupCountryByIso(client as never, "DE", true)).resolves.toBeUndefined();
  });
});
