import { describe, expect, it } from "vitest";
import { collectLoginBag, normalizeSecretToken, visibleLoginFields, type LoginField } from "../auth/fields.js";
import { loginFields } from "../auth/login-fields.js";
import { isAllowedRedirect } from "../auth/redirects.js";
import { issuePair, decodeToken, looksLikeMcpToken, openBag } from "../auth/tokens.js";

const SECRET = "unit-test-oauth-secret-32-chars-min";

describe("login fields", () => {
  it("strips Bearer, token prefix, quotes, and whitespace from secrets", () => {
    expect(normalizeSecretToken('Bearer  ab12 cd34  ')).toBe("ab12cd34");
    expect(normalizeSecretToken('"token hexvalue"')).toBe("hexvalue");
    const result = collectLoginBag(loginFields(), { apiToken: "Bearer deadbeef" }, {});
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.bag.secrets.apiToken).toBe("deadbeef");
  });

  it("exports extensible sevdesk questions including the API token", () => {
    const names = loginFields().map((field) => field.name);
    expect(names).toContain("apiToken");
    expect(loginFields().find((field) => field.name === "apiToken")?.secret).toBe(true);
  });

  it("omits server-wide credentials from the login form when env is set", () => {
    expect(
      visibleLoginFields(loginFields(), {
        SEVDESK_API_TOKEN: "from-env"
      }).map((field) => field.name)
    ).toEqual([]);
    expect(visibleLoginFields(loginFields(), {}).map((field) => field.name)).toEqual(["apiToken"]);
  });

  it("falls back to env when the form field is blank", () => {
    const result = collectLoginBag(loginFields(), { apiToken: "" }, { SEVDESK_API_TOKEN: "from-env" });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.bag.secrets.apiToken).toBe("from-env");
  });

  it("keeps extra secret fields out of claims", () => {
    const fields: LoginField[] = [
      { name: "apiToken", label: "Token", type: "password", secret: true, required: true },
      { name: "region", label: "Region", type: "select", required: false, options: [{ value: "eu", label: "EU" }] }
    ];
    const result = collectLoginBag(fields, { apiToken: "secret-1", region: "eu" }, {});
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected ok");
    expect(result.bag.secrets).toEqual({ apiToken: "secret-1" });
    expect(result.bag.claims).toEqual({ region: "eu" });
  });
});

describe("redirect allowlist", () => {
  it("allows HTTPS and loopback OAuth callbacks", () => {
    expect(isAllowedRedirect("https://client.example/oauth/callback")).toBe(true);
    expect(isAllowedRedirect("http://127.0.0.1:1738/callback")).toBe(true);
    expect(isAllowedRedirect("https://grok.com/connectors-oauth-exchange-code/")).toBe(true);
    expect(isAllowedRedirect("http://localhost:8787/callback")).toBe(true);
    expect(isAllowedRedirect("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(true);
    expect(isAllowedRedirect("cursor://evil.example/oauth/callback")).toBe(false);
    expect(isAllowedRedirect("https://evil.example/login")).toBe(false);
    expect(isAllowedRedirect("http://example.com/oauth/callback")).toBe(false);
  });
});

describe("MCP session tokens", () => {
  it("encrypts the login bag so the access token is not the API key", () => {
    const pair = issuePair(SECRET, {
      clientId: "grok",
      audience: "http://127.0.0.1/mcp",
      scopes: ["mcp:tools"],
      bag: { secrets: { apiToken: "wt_live_secret" }, claims: { region: "eu" } }
    });
    expect(looksLikeMcpToken(pair.accessToken)).toBe(true);
    expect(pair.accessToken).not.toContain("wt_live_secret");
    const claims = decodeToken(SECRET, pair.accessToken);
    expect(claims?.typ).toBe("access");
    const bag = openBag(SECRET, claims?.bag ?? "");
    expect(bag.secrets.apiToken).toBe("wt_live_secret");
    expect(bag.claims.region).toBe("eu");
  });
});
