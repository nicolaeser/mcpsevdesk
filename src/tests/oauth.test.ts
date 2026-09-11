import { createHash, randomBytes } from "node:crypto";
import type { AddressInfo } from "node:net";
import { createSevdeskClient } from "npmsevdesk";
import { describe, expect, it } from "vitest";
import { createHttpApp, listenHttp } from "../transport/http.js";
import { MCP_PATH } from "../config.js";
import { signCsrf } from "../auth/crypto.js";
import { CONSENT_CSP, CONSENT_GENERIC, CONSENT_SESSION_EXPIRED } from "../auth/consent.js";
import { PACKAGE_PRODUCT } from "../version.js";
import { INIT_PARAMS, listenRandom, SECRET_TOKEN } from "./helpers.js";

const OAUTH_SECRET = "test-oauth-secret-value-32chars-min";
const OPERATOR_PASSWORD = "operator-pass-12";
const REDIRECT = "https://client.example/oauth/callback";

describe("OAuth connector login", () => {
  it("advertises protected resource metadata and rejects the sevdesk token as Bearer", async () => {
    const ctx = await startOauth();
    try {
      const missing = await fetch(ctx.mcp, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: INIT_PARAMS })
      });
      expect(missing.status).toBe(401);
      const www = missing.headers.get("www-authenticate") ?? "";
      expect(www).toMatch(/resource_metadata=/);
      expect(www).toContain("/.well-known/oauth-protected-resource/mcp");

      const as = await fetch(`${ctx.origin}/.well-known/oauth-authorization-server`);
      expect(as.status).toBe(200);
      const asJson = (await as.json()) as { authorization_endpoint?: string; code_challenge_methods_supported?: string[] };
      expect(asJson.authorization_endpoint).toContain("/authorize");
      expect(asJson.code_challenge_methods_supported).toContain("S256");

      const prm = await fetch(`${ctx.origin}/.well-known/oauth-protected-resource/mcp`);
      expect(prm.status).toBe(200);
      const prmJson = (await prm.json()) as { authorization_servers?: string[]; resource?: string };
      expect(prmJson.authorization_servers?.[0]).toBe(ctx.origin);
      expect(prmJson.resource).toContain("/mcp");

      expect(www).toMatch(/scope="mcp:tools"/);
      expect(www).not.toMatch(/charset=/);
      expect(missing.headers.get("access-control-expose-headers") ?? "").toMatch(/WWW-Authenticate/i);

      const options = await fetch(ctx.mcp, { method: "OPTIONS" });
      expect(options.status).toBe(204);
      expect(options.headers.get("access-control-allow-origin")).toBe("*");
      expect(options.headers.get("access-control-allow-headers") ?? "").toMatch(/MCP-Protocol-Version/i);

      const wellKnownOpt = await fetch(`${ctx.origin}/.well-known/oauth-protected-resource/mcp`, {
        method: "OPTIONS"
      });
      expect(wellKnownOpt.status).toBe(204);

      const stolen = await fetch(ctx.mcp, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${SECRET_TOKEN}`
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
      });
      expect(stolen.status).toBe(401);

      const clientId = await register(ctx);
      const emptyPkce = await fetch(`${ctx.origin}/authorize?` + new URLSearchParams({
        client_id: clientId,
        redirect_uri: REDIRECT,
        response_type: "code",
        code_challenge: "",
        code_challenge_method: "S256",
        scope: "mcp:tools"
      }).toString(), { redirect: "manual" });
      expect(emptyPkce.status).toBe(302);
      expect(emptyPkce.headers.get("location") ?? "").toContain("invalid_request");
    } finally {
      await ctx.close();
    }
  });

  it("creates a session from the login form; Grok never sees the sevdesk token", async () => {
    const seenAuth: string[] = [];
    const mock = await listenRandom((req, res) => {
      seenAuth.push(String(req.headers.authorization ?? ""));
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ objects: [{ id: "7", objectName: "Contact", name: "Acme GmbH", status: "1000" }], total: 1 }));
    });
    const ctx = await startOauth({
      createClient: (options) =>
        createSevdeskClient({
          apiToken: options.apiToken,
          baseURL: mock.baseURL,
          allowInsecureLocalhost: true
        })
    });
    try {
      const tokens = await loginForTokens(ctx, { apiToken: SECRET_TOKEN, password: OPERATOR_PASSWORD });
      expect(tokens.access_token.startsWith("mcp1.")).toBe(true);
      expect(JSON.stringify(tokens)).not.toContain(SECRET_TOKEN);
      expect(JSON.stringify(tokens)).not.toContain(OPERATOR_PASSWORD);

      const listed = await fetch(ctx.mcp, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "sevdesk_list_contacts", arguments: { limit: 5 } } })
      });
      expect(listed.status).toBe(200);
      const raw = await listed.text();
      expect(raw).not.toContain(SECRET_TOKEN);
      expect(raw).toContain("Acme GmbH");
      expect(seenAuth.some((header) => header.includes(SECRET_TOKEN))).toBe(true);
      expect(seenAuth.some((header) => header.includes(tokens.access_token))).toBe(false);
    } finally {
      await ctx.close();
      await closeServer(mock.server);
    }
  });

  it("rejects consent when SevDesk does not accept the API token", async () => {
    const seen: string[] = [];
    const ctx = await startOauth({
      verifyApiToken: async (token) => {
        seen.push(token);
        return { ok: false, error: "SevDesk rejected this API token." };
      }
    });
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const denied = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(denied.status).toBe(401);
      expect(denied.headers.get("location")).toBeNull();
      expect(await denied.text()).toContain("SevDesk rejected this API token.");
      expect(seen).toEqual([SECRET_TOKEN]);
    } finally {
      await ctx.close();
    }
  });

  it("rejects login without the operator password even when the API token is known", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const denied = await fetch(`${ctx.origin}/authorize`, {
        method: "POST",
        redirect: "manual",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: page.cookie,
          "x-forwarded-for": nextTestIp()
        },
        body: new URLSearchParams({
          ...page.hidden,
          consent: "1",
          csrf: page.csrf,
          operator_password: "wrong-password",
          login_apiToken: SECRET_TOKEN
        })
      });
      expect(denied.status).toBe(401);
      const html = await denied.text();
      expect(html).toContain("Could not authorize this request.");
      expect(html).not.toContain("code=");
      expect(denied.headers.get("location")).toBeNull();
    } finally {
      await ctx.close();
    }
  });

  it("renders a hidden honeypot; a filled honeypot still fails closed", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const denied = await consentPost(ctx, page, {
        apiToken: SECRET_TOKEN,
        website: "https://sevdesk.de"
      });
      expect(denied.status).toBe(401);
      expect(denied.headers.get("location")).toBeNull();
      expect(await denied.text()).toContain("Could not authorize this request.");
      const ok = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(ok.status).toBe(302);
      expect(ok.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("hides the API token field when it is already on the server", async () => {
    const ctx = await startOauth({
      env: {
        MCPSEVDESK_HOST: "127.0.0.1",
        MCP_OAUTH_SECRET: OAUTH_SECRET,
        MCP_AUTH_PASSWORD: OPERATOR_PASSWORD,
        SEVDESK_API_TOKEN: SECRET_TOKEN
      }
    });
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge, { expectApiTokenField: false });
      expect(page.html).toContain("Server password");
      expect(page.html).not.toContain("login_apiToken");
      const consented = await fetch(`${ctx.origin}/authorize`, {
        method: "POST",
        redirect: "manual",
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: page.cookie,
          "x-forwarded-for": nextTestIp()
        },
        body: new URLSearchParams({
          ...page.hidden,
          consent: "1",
          csrf: page.csrf,
          operator_password: OPERATOR_PASSWORD
        })
      });
      expect(consented.status).toBe(302);
      expect(consented.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("rotates refresh tokens and rejects replay", async () => {
    const ctx = await startOauth();
    try {
      const first = await loginForTokens(ctx, { apiToken: SECRET_TOKEN, password: OPERATOR_PASSWORD });
      const clientId = first.clientId;
      const refreshed = await tokenRequest(ctx, {
        grant_type: "refresh_token",
        refresh_token: first.refresh_token,
        client_id: clientId
      });
      expect(refreshed.access_token).not.toBe(first.access_token);
      const replay = await fetch(`${ctx.origin}/token`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: first.refresh_token,
          client_id: clientId
        })
      });
      expect(replay.status).toBe(400);
    } finally {
      await ctx.close();
    }
  });
});

interface OauthCtx {
  readonly origin: string;
  readonly mcp: string;
  close: () => Promise<void>;
}

async function startOauth(options: Parameters<typeof createHttpApp>[0] = {}): Promise<OauthCtx> {
  const env: NodeJS.ProcessEnv = {
    MCPSEVDESK_HOST: "127.0.0.1",
    MCP_OAUTH_SECRET: OAUTH_SECRET,
    MCP_AUTH_PASSWORD: OPERATOR_PASSWORD
  };
  const app = createHttpApp({ ...options, env: { ...env, ...(options.env ?? {}) } });
  const server = await listenHttp(app, { host: "127.0.0.1", port: 0 });
  const port = (server.address() as AddressInfo).port;
  const origin = `http://127.0.0.1:${port}`;
  return {
    origin,
    mcp: `${origin}${MCP_PATH}`,
    close: () => closeServer(server)
  };
}

let testIp = 0;
function nextTestIp(): string {
  testIp += 1;
  return `198.51.100.${(testIp % 250) + 1}`;
}

async function loginForTokens(
  ctx: OauthCtx,
  input: { apiToken: string; password: string }
): Promise<{ access_token: string; refresh_token: string; clientId: string }> {
  const clientId = await register(ctx);
  const pkce = makePkce();
  const page = await authorizePage(ctx, clientId, pkce.challenge);
  const consented = await fetch(`${ctx.origin}/authorize`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      cookie: page.cookie,
      "x-forwarded-for": nextTestIp()
    },
    body: new URLSearchParams({
      ...page.hidden,
      consent: "1",
      csrf: page.csrf,
      operator_password: input.password,
      login_apiToken: input.apiToken
    })
  });
  expect(consented.status).toBe(302);
  const location = consented.headers.get("location") ?? "";
  const code = new URL(location).searchParams.get("code");
  expect(code).toBeTruthy();
  const tokens = await tokenRequest(ctx, {
    grant_type: "authorization_code",
    code: code ?? "",
    code_verifier: pkce.verifier,
    client_id: clientId,
    redirect_uri: REDIRECT
  });
  return { ...tokens, clientId };
}

async function register(ctx: OauthCtx): Promise<string> {
  const response = await fetch(`${ctx.origin}/register`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextTestIp() },
    body: JSON.stringify({
      client_name: "test-client",
      redirect_uris: [REDIRECT],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"]
    })
  });
  expect(response.status).toBe(201);
  const json = (await response.json()) as { client_id?: string };
  expect(json.client_id).toBeTruthy();
  return json.client_id ?? "";
}

async function authorizePage(
  ctx: OauthCtx,
  clientId: string,
  challenge: string,
  options: { expectApiTokenField?: boolean } = {}
): Promise<{ cookie: string; csrf: string; hidden: Record<string, string>; html: string }> {
  const url = new URL(`${ctx.origin}/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", REDIRECT);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("scope", "mcp:tools");
  url.searchParams.set("state", "state-1");
  url.searchParams.set("resource", `${ctx.origin}${MCP_PATH}`);
  const response = await fetch(url, { headers: { "x-forwarded-for": nextTestIp() } });
  expect(response.status).toBe(200);
  const html = await response.text();
  expect(html).toContain("Authorize");
  expect(html).toContain("Connecting…");
  expect(html).toContain("prefers-color-scheme");
  expect(html).toMatch(/action=""/);
  expect(html).toContain('type="submit"');
  expect(html).not.toContain("MCP_AUTH_PASSWORD");
  expect(html).not.toContain("Cursor");
  expect(html).not.toContain("<!--slot:");
  expect(html).toContain(`<title>${PACKAGE_PRODUCT}</title>`);
  expect(html).toMatch(/csrf1\./);
  expect(response.headers.get("content-security-policy") ?? "").toBe(CONSENT_CSP);
  expect(response.headers.get("content-security-policy") ?? "").toContain("form-action 'self' https:");
  if (options.expectApiTokenField === false) {
    expect(html).not.toContain("login_apiToken");
    expect(html).toContain("Server password");
  } else {
    expect(html).toContain("API token");
    expect(html).toContain("login_apiToken");
  }
  const csrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1];
  expect(csrf).toBeTruthy();
  return {
    cookie: cookieHeader(response.headers),
    csrf: csrf ?? "",
    hidden: hiddenFields(html),
    html
  };
}

async function tokenRequest(
  ctx: OauthCtx,
  body: Record<string, string>
): Promise<{ access_token: string; refresh_token: string }> {
  const response = await fetch(`${ctx.origin}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  expect(response.status).toBe(200);
  return (await response.json()) as { access_token: string; refresh_token: string };
}

function makePkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
}

function cookieHeader(headers: Headers): string {
  const setCookie = headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    return setCookie.map((item) => item.split(";")[0] ?? "").join("; ");
  }
  const single = headers.get("set-cookie");
  return single?.split(";")[0] ?? "";
}

function hiddenFields(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<input type="hidden" name="([^"]+)" value="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const name = match[1];
    const value = match[2];
    if (name !== undefined && value !== undefined) out[name] = value;
  }
  return out;
}

function closeServer(server: { close: (cb: (err?: Error | undefined) => void) => void }): Promise<void> {
  return new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
}

async function consentPost(
  ctx: OauthCtx,
  page: { hidden: Record<string, string>; csrf: string },
  extra: {
    password?: string;
    apiToken?: string;
    cookie?: string;
    origin?: string | null;
    csrf?: string;
    consent?: string;
    website?: string;
  } = {}
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded"
  };
  if (extra.cookie !== undefined) headers.cookie = extra.cookie;
  if (extra.origin === null) headers.origin = "null";
  else if (extra.origin !== undefined) headers.origin = extra.origin;
  headers["x-forwarded-for"] = nextTestIp();
  const body: Record<string, string> = {
    ...page.hidden,
    consent: extra.consent ?? "1",
    csrf: extra.csrf ?? page.csrf,
    operator_password: extra.password ?? OPERATOR_PASSWORD
  };
  if (extra.apiToken !== undefined) body.login_apiToken = extra.apiToken;
  if (extra.website !== undefined) body.website = extra.website;
  return fetch(`${ctx.origin}/authorize`, {
    method: "POST",
    redirect: "manual",
    headers,
    body: new URLSearchParams(body)
  });
}

describe("fail-closed HTTP credentials", () => {
  it("defaults createHttpApp to oauth and rejects the upstream token as Bearer", async () => {
    const app = createHttpApp({
      env: { MCPSEVDESK_HOST: "127.0.0.1", SEVDESK_API_TOKEN: SECRET_TOKEN }
    });
    const server = await listenHttp(app, { host: "127.0.0.1", port: 0 });
    try {
      const port = (server.address() as AddressInfo).port;
      const origin = `http://127.0.0.1:${port}`;
      const health = await fetch(`${origin}/health`);
      expect(health.status).toBe(200);
      expect(((await health.json()) as { auth?: string }).auth).toBe("oauth");
      const missing = await fetch(`${origin}${MCP_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: INIT_PARAMS })
      });
      expect(missing.status).toBe(401);
      expect(missing.headers.get("www-authenticate") ?? "").toMatch(/resource_metadata=/);
      const stolen = await fetch(`${origin}${MCP_PATH}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: `Bearer ${SECRET_TOKEN}`
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} })
      });
      expect(stolen.status).toBe(401);
    } finally {
      await closeServer(server);
    }
  });

});

describe("consent CSRF and Origin", () => {
  it("POSTs consent without a cookie", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const consented = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(consented.status).toBe(302);
      expect(consented.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("accepts Origin null without a cookie", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const consented = await consentPost(ctx, page, { apiToken: SECRET_TOKEN, origin: null });
      expect(consented.status).toBe(302);
    } finally {
      await ctx.close();
    }
  });

  it("accepts Origin equal to the public origin without a cookie", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const consented = await consentPost(ctx, page, {
        apiToken: SECRET_TOKEN,
        origin: ctx.origin
      });
      expect(consented.status).toBe(302);
    } finally {
      await ctx.close();
    }
  });

  it("reuses CSRF across GET twice and does not veto cookie mismatch", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const first = await authorizePage(ctx, clientId, pkce.challenge);
      const url = new URL(`${ctx.origin}/authorize`);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", REDIRECT);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("code_challenge", pkce.challenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("scope", "mcp:tools");
      url.searchParams.set("state", "state-1");
      url.searchParams.set("resource", `${ctx.origin}${MCP_PATH}`);
      const second = await fetch(url, {
        headers: { cookie: first.cookie, "x-forwarded-for": nextTestIp() }
      });
      expect(second.status).toBe(200);
      const secondCookie = cookieHeader(second.headers);
      const consented = await consentPost(ctx, first, {
        apiToken: SECRET_TOKEN,
        cookie: secondCookie
      });
      expect(consented.status).toBe(302);
      expect(consented.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("replays a used CSRF with the same unused code, then expires after exchange", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const first = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(first.status).toBe(302);
      const location = first.headers.get("location") ?? "";
      expect(location).toContain("code=");
      const replay = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(replay.status).toBe(302);
      expect(replay.headers.get("location")).toBe(location);
      const code = new URL(location).searchParams.get("code") ?? "";
      await tokenRequest(ctx, {
        grant_type: "authorization_code",
        code,
        code_verifier: pkce.verifier,
        client_id: clientId,
        redirect_uri: REDIRECT
      });
      const afterExchange = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(afterExchange.status).toBe(401);
      expect(await afterExchange.text()).toContain(CONSENT_SESSION_EXPIRED);
    } finally {
      await ctx.close();
    }
  });

  it("keeps CSRF unused after a wrong password so retry succeeds", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const denied = await consentPost(ctx, page, {
        apiToken: SECRET_TOKEN,
        password: "wrong-password",
        cookie: page.cookie
      });
      expect(denied.status).toBe(401);
      const html = await denied.text();
      expect(html).toContain(CONSENT_GENERIC);
      const retryCsrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1] ?? page.csrf;
      expect(retryCsrf).toBe(page.csrf);
      const consented = await consentPost(ctx, page, {
        apiToken: SECRET_TOKEN,
        csrf: retryCsrf,
        cookie: page.cookie
      });
      expect(consented.status).toBe(302);
      expect(consented.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("rejects HMAC-broken and expired body CSRF as session-expired", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const broken = "csrf1.not-a-valid-payload.not-a-valid-mac";
      const hmacFail = await consentPost(ctx, page, { apiToken: SECRET_TOKEN, csrf: broken });
      expect(hmacFail.status).toBe(401);
      expect(await hmacFail.text()).toContain(CONSENT_SESSION_EXPIRED);

      const payload = Buffer.from(
        JSON.stringify({
          v: 1,
          n: "expired-nonce",
          exp: Date.now() - 1000,
          cid: clientId,
          ru: REDIRECT,
          ch: pkce.challenge
        }),
        "utf8"
      ).toString("base64url");
      const expired = `csrf1.${payload}.${signCsrf(OAUTH_SECRET, `csrf1.${payload}`)}`;
      const expiredRes = await consentPost(ctx, page, { apiToken: SECRET_TOKEN, csrf: expired });
      expect(expiredRes.status).toBe(401);
      expect(await expiredRes.text()).toContain(CONSENT_SESSION_EXPIRED);
    } finally {
      await ctx.close();
    }
  });

  it("cancels consent with access_denied", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      const cancelled = await consentPost(ctx, page, { consent: "0" });
      expect(cancelled.status).toBe(302);
      expect(cancelled.headers.get("location") ?? "").toContain("error=access_denied");
    } finally {
      await ctx.close();
    }
  });

  it("serves GET /authorize/", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const url = new URL(`${ctx.origin}/authorize/`);
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", REDIRECT);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("code_challenge", pkce.challenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("scope", "mcp:tools");
      const response = await fetch(url, { headers: { "x-forwarded-for": nextTestIp() } });
      expect(response.status).toBe(200);
      expect(await response.text()).toContain("Authorize");
    } finally {
      await ctx.close();
    }
  });
});

describe("login modes and session cap", () => {
  it("public mode: no password, user API token is sealed and Grok never sees it", async () => {
    const mock = await listenRandom((req, res) => {
      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ objects: [{ id: "7", objectName: "Contact", name: "Acme GmbH", status: "1000" }], total: 1 }));
    });
    const ctx = await startOauth({
      env: { MCP_AUTH_PASSWORD: "" },
      createClient: (options) =>
        createSevdeskClient({
          apiToken: options.apiToken,
          baseURL: mock.baseURL,
          allowInsecureLocalhost: true
        })
    });
    try {
      const tokens = await loginForTokens(ctx, { apiToken: SECRET_TOKEN, password: "" });
      expect(tokens.access_token.startsWith("mcp1.")).toBe(true);
      expect(JSON.stringify(tokens)).not.toContain(SECRET_TOKEN);
      const listed = await fetch(ctx.mcp, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 3,
          method: "tools/call",
          params: { name: "sevdesk_list_contacts", arguments: { limit: 5 } }
        })
      });
      expect(listed.status).toBe(200);
      expect(await listed.text()).toContain("Acme GmbH");
    } finally {
      await ctx.close();
      await closeServer(mock.server);
    }
  });

  it("gated mode: password plus a submitted API token", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      expect(page.html).toContain("Authorize");
      expect(page.html).toContain("login_apiToken");
      expect(page.html).toContain("operator_password");
      expect(page.html.indexOf("operator_password")).toBeGreaterThan(page.html.indexOf("login_apiToken"));
      const denied = await consentPost(ctx, page, {});
      expect(denied.status).toBe(401);
      expect(await denied.text()).toContain("API token is required.");
      const ok = await consentPost(ctx, page, { apiToken: SECRET_TOKEN });
      expect(ok.status).toBe(302);
      expect(ok.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("public mode ignores env token and requires a submitted token", async () => {
    const ctx = await startOauth({
      env: { MCP_AUTH_PASSWORD: "", SEVDESK_API_TOKEN: "env-must-not-be-used" }
    });
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      expect(page.html).not.toContain('name="operator_password"');
      const denied = await consentPost(ctx, page, { password: "" });
      expect(denied.status).toBe(401);
      expect(await denied.text()).toContain("API token is required.");
      const tokens = await loginForTokens(ctx, { apiToken: SECRET_TOKEN, password: "" });
      expect(JSON.stringify(tokens)).not.toContain("env-must-not-be-used");
      expect(JSON.stringify(tokens)).not.toContain(SECRET_TOKEN);
    } finally {
      await ctx.close();
    }
  });

  it("rejects consent without a password when a password is configured", async () => {
    const ctx = await startOauth();
    try {
      const clientId = await register(ctx);
      const pkce = makePkce();
      const page = await authorizePage(ctx, clientId, pkce.challenge);
      expect(page.html).toContain("Authorize");
      const denied = await consentPost(ctx, page, { apiToken: SECRET_TOKEN, password: "" });
      expect(denied.status).toBe(401);
      expect(denied.headers.get("location")).toBeNull();
      const ok = await consentPost(ctx, page, { apiToken: SECRET_TOKEN, password: OPERATOR_PASSWORD });
      expect(ok.status).toBe(302);
      expect(ok.headers.get("location") ?? "").toContain("code=");
    } finally {
      await ctx.close();
    }
  });

  it("caps concurrent MCP sessions with MAX_SESSIONS", async () => {
    const ctx = await startOauth({ env: { MAX_SESSIONS: "1" } });
    try {
      const tokens = await loginForTokens(ctx, { apiToken: SECRET_TOKEN, password: OPERATOR_PASSWORD });
      const first = await fetch(ctx.mcp, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: INIT_PARAMS })
      });
      expect(first.status).toBe(200);
      const second = await fetch(ctx.mcp, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json, text/event-stream",
          authorization: `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "initialize", params: INIT_PARAMS })
      });
      expect(second.status).toBe(429);
      const body = await second.json() as { error?: { message?: string } };
      expect(body.error?.message).toBe("Session limit reached.");
    } finally {
      await ctx.close();
    }
  });
});

