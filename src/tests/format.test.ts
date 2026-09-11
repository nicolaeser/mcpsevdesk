import { describe, expect, it } from "vitest";
import { listPayload } from "../mcp/format.js";

describe("listPayload", () => {
  it("coerces a non-array data value to an items array", () => {
    expect(listPayload(undefined, undefined)).toEqual({ items: [] });
    expect(listPayload(null, undefined)).toEqual({ items: [] });
    expect(listPayload({ accountNumber: 8400 }, { total: 1 })).toEqual({
      items: [{ accountNumber: 8400 }],
      pagination: { total: 1 }
    });
    expect(listPayload([{ id: 1 }, { id: 2 }], undefined)).toEqual({
      items: [{ id: 1 }, { id: 2 }]
    });
  });
});
