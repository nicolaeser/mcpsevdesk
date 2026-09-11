import { createHash, randomBytes } from "node:crypto";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { fileURLToPath } from "node:url";
import axios, {
  AxiosError,
  AxiosHeaders,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from "axios";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createSevdeskClient } from "npmsevdesk";
import { createMcpServer } from "../mcp/server.js";

export const SECRET_TOKEN = "sk_live_super_secret_token_value";

export type MockCall = {
  readonly method: string;
  readonly url: string;
  readonly body: unknown;
  readonly headers: Record<string, string>;
};

export type MockHandler = (call: MockCall) => {
  readonly status?: number;
  readonly json?: unknown;
  readonly body?: string | Uint8Array;
  readonly headers?: Record<string, string>;
};

function axiosCall(config: InternalAxiosRequestConfig): MockCall {
  const path = String(config.url ?? "");
  const base = String(config.baseURL ?? "https://my.sevdesk.de/api/v1").replace(/\/$/, "");
  const url =
    path.startsWith("http://") || path.startsWith("https://")
      ? path
      : `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = {};
  const raw = config.headers;
  if (raw !== undefined && typeof raw === "object") {
    for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
      if (value !== undefined) headers[key.toLowerCase()] = String(value);
    }
  }
  return {
    method: String(config.method ?? "GET").toUpperCase(),
    url,
    body: config.data,
    headers
  };
}

function axiosResponse(
  config: InternalAxiosRequestConfig,
  result: ReturnType<MockHandler>
): AxiosResponse {
  const status = result.status ?? 200;
  let data: unknown = result.json ?? {};
  if (result.body !== undefined) {
    if (typeof result.body === "string") {
      try {
        data = JSON.parse(result.body);
      } catch {
        data = result.body;
      }
    } else {
      data = result.body;
    }
  }
  return {
    data,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    headers: new AxiosHeaders(result.headers),
    config,
    request: {}
  };
}

export function jsonResponse<T>(data: T, status = 200): ReturnType<MockHandler> {
  return { json: data, status };
}

export function requestUrl(call: MockCall): string {
  const url = new URL(call.url);
  const path = url.pathname;
  const prefix = "/api/v1";
  if (path === prefix || path.startsWith(`${prefix}/`)) {
    const stripped = path.slice(prefix.length);
    return stripped.length === 0 ? "/" : stripped;
  }
  return path;
}

export function methodOf(call: MockCall): string {
  return call.method.toLowerCase();
}

export async function oauthAccessToken(
  origin: string,
  input: { readonly password: string; readonly apiToken?: string }
): Promise<string> {
  const redirect = "https://client.example/oauth/callback";
  const registered = await fetch(`${origin}/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      client_name: "test",
      redirect_uris: [redirect],
      token_endpoint_auth_method: "none"
    })
  });
  const clientId = ((await registered.json()) as { client_id: string }).client_id;
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorize = new URL(`${origin}/authorize`);
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", redirect);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  authorize.searchParams.set("scope", "mcp:tools");
  const page = await fetch(authorize, { redirect: "manual" });
  const html = await page.text();
  const csrf = /name="csrf" value="([^"]+)"/.exec(html)?.[1] ?? "";
  const hidden: Record<string, string> = {};
  const re = /<input type="hidden" name="([^"]+)" value="([^"]*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    if (match[1] !== undefined && match[2] !== undefined) hidden[match[1]] = match[2];
  }
  const body: Record<string, string> = {
    ...hidden,
    consent: "1",
    csrf,
    operator_password: input.password
  };
  if (input.apiToken !== undefined) body.login_apiToken = input.apiToken;
  const consented = await fetch(`${origin}/authorize`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const location = consented.headers.get("location") ?? "";
  const code = new URL(location).searchParams.get("code") ?? "";
  const tokens = await fetch(`${origin}/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      client_id: clientId,
      redirect_uri: redirect
    })
  });
  return ((await tokens.json()) as { access_token: string }).access_token;
}

export async function withMcpClient(options: {
  readonly token?: string | undefined;
  readonly handler: MockHandler;
}): Promise<{
  client: Client;
  close: () => Promise<void>;
  calls: MockCall[];
}> {
  const calls: MockCall[] = [];
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const token = options.token;
  const server = createMcpServer({
    createClient: (factoryOptions) =>
      createSevdeskClient({
        apiToken: factoryOptions.apiToken,
        axiosInstance: axios.create({
          adapter: async (config) => {
            const call = axiosCall(config);
            calls.push(call);
            const response = axiosResponse(config, options.handler(call));
            if (response.status >= 400) {
              throw new AxiosError(
                `Request failed with status code ${response.status}`,
                AxiosError.ERR_BAD_RESPONSE,
                config,
                {},
                response
              );
            }
            return response;
          }
        }) as never
      }),
    getToken: () => token
  });
  const client = new Client({ name: "mcpsevdesk-test", version: "0.0.0" });
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return {
    client,
    calls,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

export function toolText(result: unknown): string {
  if (typeof result !== "object" || result === null) return String(result);
  if (!("content" in result) || !Array.isArray(result.content)) {
    return JSON.stringify(result);
  }
  return result.content
    .map((part) => {
      if (typeof part === "object" && part !== null && "text" in part) {
        return String((part as { text?: unknown }).text ?? "");
      }
      return "";
    })
    .join("\n");
}

export function parseToolJson(result: unknown): unknown {
  return JSON.parse(toolText(result));
}

export function spawnStdio(env: NodeJS.ProcessEnv = {}): ChildProcessWithoutNullStreams {
  const child = spawn(process.execPath, [fileURLToPath(new URL("../../dist/index.js", import.meta.url))], {
    cwd: fileURLToPath(new URL("../..", import.meta.url)),
    env: { ...process.env, ...env },
    stdio: ["pipe", "pipe", "pipe"]
  });
  return child;
}

export function writeJsonRpc(child: ChildProcessWithoutNullStreams, message: unknown): void {
  child.stdin.write(`${JSON.stringify(message)}\n`);
}

export async function readJsonRpc(
  child: ChildProcessWithoutNullStreams,
  timeoutMs = 8000
): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for stdio JSON-RPC.\nstdout=${stdout}\nstderr=${stderr}`));
    }, timeoutMs);
    let stdout = "";
    let stderr = "";
    const onOut = (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      const lines = stdout.split("\n").filter((line) => line.trim().length > 0);
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line) as Record<string, unknown>;
          if (parsed.jsonrpc === "2.0") {
            cleanup();
            resolve(parsed);
            return;
          }
        } catch {

        }
      }
    };
    const onErr = (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    };
    const onExit = (code: number | null) => {
      cleanup();
      reject(new Error(`stdio process exited ${code}. stdout=${stdout} stderr=${stderr}`));
    };
    const cleanup = () => {
      clearTimeout(timer);
      child.stdout.off("data", onOut);
      child.stderr.off("data", onErr);
      child.off("exit", onExit);
    };
    child.stdout.on("data", onOut);
    child.stderr.on("data", onErr);
    child.once("exit", onExit);
  });
}

export const INIT_PARAMS = {
  protocolVersion: "2025-03-26",
  capabilities: {},
  clientInfo: { name: "mcpsevdesk-probe", version: "0.0.1" }
} as const;

export async function initializeStdio(
  child: ChildProcessWithoutNullStreams
): Promise<Record<string, unknown>> {
  writeJsonRpc(child, {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: INIT_PARAMS
  });
  const init = await readJsonRpc(child);
  writeJsonRpc(child, {
    jsonrpc: "2.0",
    method: "notifications/initialized"
  });
  return init;
}

export async function listenRandom(
  handler: (req: IncomingMessage, res: ServerResponse) => void
): Promise<{ server: Server; baseURL: string; port: number }> {
  const server = createServer(handler);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("expected TCP address");
  }
  return {
    server,
    port: address.port,
    baseURL: `http://127.0.0.1:${address.port}`
  };
}

export function closeChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 1000).unref();
  });
}
