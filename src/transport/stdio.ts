import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { defaultClientFactory } from "../sevdesk/client.js";
import { readRuntimeConfig } from "../config.js";
import { createMcpServer } from "../mcp/server.js";
import type { SevdeskClientFactory } from "../types.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";

export interface StdioRunOptions {
  readonly createClient?: SevdeskClientFactory;
  readonly env?: NodeJS.ProcessEnv;
}

export async function runStdio(options: StdioRunOptions = {}): Promise<void> {
  const env = options.env ?? process.env;
  const config = readRuntimeConfig(env);
  const server = createMcpServer({
    createClient: options.createClient ?? defaultClientFactory,
    getToken: () => config.apiToken ?? env.SEVDESK_API_TOKEN,
    ...(config.baseURL === undefined ? {} : { baseURL: config.baseURL }),
    allowInsecureLocalhost: config.allowInsecureLocalhost
  });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${PACKAGE_NAME}/${PACKAGE_VERSION} listening on stdio\n`);
}
