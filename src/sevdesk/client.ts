import {
  createSevdeskClient,
  SevdeskApiError,
  SevdeskAuthenticationError,
  SevdeskPermissionError,
  type SevdeskClient,
  type SevdeskLogEvent
} from "npmsevdesk";
import type { ClientFactoryOptions, SevdeskClientFactory } from "../types.js";
import { normalizeSecretToken } from "../auth/fields.js";
import { redactText } from "../lib/redact.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";

export type UpstreamTokenCheck = (
  apiToken: string
) => Promise<{ ok: true } | { ok: false; error: string }>;

export function defaultClientFactory(options: ClientFactoryOptions): SevdeskClient {
  const secrets = [options.apiToken];
  return createSevdeskClient({
    apiToken: options.apiToken,
    ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
    allowInsecureLocalhost: options.allowInsecureLocalhost === true,
    userAgent: `${PACKAGE_NAME}/${PACKAGE_VERSION}`,
    logger: {
      log(event: SevdeskLogEvent) {
        process.stderr.write(
          `${redactText(
            JSON.stringify({
              level: event.level,
              type: event.type,
              message: event.message,
              operationId: event.operationId,
              ...(event.status === undefined ? {} : { status: event.status })
            }),
            secrets
          )}\n`
        );
      }
    },
    logging: {
      events: "errors",
      bodyMode: "none",
      headersMode: "none",
      queryMode: "none"
    }
  });
}

export async function probeSevdeskToken(
  apiToken: string,
  createClient: SevdeskClientFactory = defaultClientFactory
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = normalizeSecretToken(apiToken);
  if (trimmed.length === 0) return { ok: false, error: "API token is required." };
  const meta = `chars=${trimmed.length} hex=${/^[0-9a-fA-F]+$/.test(trimmed) ? "yes" : "no"}`;
  const client = createClient({ apiToken: trimmed });
  try {
    await client.contacts.list({ limit: 1 }, { timeoutMs: 8000, retry: false });
    process.stderr.write(`auth.probe ok ${meta}\n`);
    return { ok: true };
  } catch (error) {
    if (error instanceof SevdeskAuthenticationError || error instanceof SevdeskPermissionError) {
      process.stderr.write(`auth.probe reject ${meta} status=${error.status}\n`);
      return {
        ok: false,
        error:
          "SevDesk rejected this API token. Copy the 32-character hex token from SevDesk → Settings → Users."
      };
    }
    if (error instanceof SevdeskApiError) {
      process.stderr.write(`auth.probe fail ${meta} status=${error.status}\n`);
      return { ok: false, error: `SevDesk request failed (HTTP ${error.status}).` };
    }
    process.stderr.write(`auth.probe fail ${meta} network\n`);
    return { ok: false, error: "Could not reach SevDesk. Try again." };
  } finally {
    client.dispose();
  }
}
