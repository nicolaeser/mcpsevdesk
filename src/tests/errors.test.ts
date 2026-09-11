import { describe, expect, it } from "vitest";
import { SevdeskApiError } from "npmsevdesk";
import { apiErrorDetail, errorMessage } from "../errors.js";

describe("API error details", () => {
  it("extracts message from a JSON body", () => {
    expect(apiErrorDetail({ message: "tax rule mismatch" })).toBe("tax rule mismatch");
    expect(apiErrorDetail({ error: "duplicate name" })).toBe("duplicate name");
    expect(apiErrorDetail({ error: { message: "wrong HTTP Type" } })).toBe("wrong HTTP Type");
    expect(apiErrorDetail({ objects: { name: "taken" } })).toContain("taken");
  });

  it("includes the body in SevdeskApiError tool messages", () => {
    const error = new SevdeskApiError(
      "hidden",
      {
        status: 422,
        statusText: "Unprocessable Entity",
        data: { message: "bookingCategory PROVISION is invalid for tax rule 1" },
        headers: {},
        config: {} as never
      } as never,
      { method: "POST", url: "/CreditNote/Factory/saveCreditNote" }
    );
    expect(errorMessage(error)).toBe(
      "SevDesk request failed (HTTP 422): bookingCategory PROVISION is invalid for tax rule 1"
    );
  });
});
