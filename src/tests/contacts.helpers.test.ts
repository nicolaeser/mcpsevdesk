import { CommunicationWayKeyName } from "npmsevdesk";
import { describe, expect, it } from "vitest";
import { commKey, commType, communicationKey } from "../tools/contacts/helpers.js";

describe("contact communication helpers", () => {
  it("exports a single commType and commKey", () => {
    expect(commType.options).toEqual(["EMAIL", "PHONE", "WEB", "MOBILE", "FAX"]);
    expect(commKey.options).toEqual(["work", "private", "mobile", "invoice", "newsletter", "autobox", "fax"]);
  });

  it("maps omitted, autobox, and fax keys", () => {
    expect(communicationKey(undefined)).toBe(CommunicationWayKeyName.WORK);
    expect(communicationKey("autobox")).toBe(CommunicationWayKeyName.AUTOBOX);
    expect(communicationKey("fax")).toBe(CommunicationWayKeyName.FAX);
    expect(communicationKey("work")).toBe(CommunicationWayKeyName.WORK);
  });
});
