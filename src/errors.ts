import {
  SevdeskApiError,
  SevdeskAuthenticationError,
  SevdeskPermissionError
} from "npmsevdesk";

export class ConfirmationRequiredError extends Error {
  public constructor(toolName: string) {
    super(`${toolName} is a write. Pass confirm: true after reviewing the arguments.`);
    this.name = "ConfirmationRequiredError";
  }
}

export class MissingTokenError extends Error {
  public constructor() {
    super(
      "No upstream API token is configured. Set SEVDESK_API_TOKEN on the server or enter it on the login page."
    );
    this.name = "MissingTokenError";
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof SevdeskAuthenticationError || error instanceof SevdeskPermissionError) {
    return "SevDesk rejected the API token. Reconnect and paste a valid token from SevDesk settings.";
  }
  if (error instanceof SevdeskApiError) {
    const detail = apiErrorDetail(error.responseBody);
    return detail === undefined
      ? `SevDesk request failed (HTTP ${error.status}).`
      : `SevDesk request failed (HTTP ${error.status}): ${detail}`;
  }
  return error instanceof Error ? error.message : String(error);
}

export function apiErrorDetail(body: unknown): string | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") {
    const trimmed = body.trim();
    return trimmed.length === 0 ? undefined : trimmed.slice(0, 500);
  }
  if (typeof body !== "object") return String(body).slice(0, 500);
  const record = body as Record<string, unknown>;
  for (const key of ["message", "error", "errorMessage", "statusText"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) return value.trim().slice(0, 500);
    if (value !== null && typeof value === "object" && "message" in value) {
      const nested = (value as { message?: unknown }).message;
      if (typeof nested === "string" && nested.trim().length > 0) return nested.trim().slice(0, 500);
    }
  }
  try {
    const json = JSON.stringify(body);
    return json === undefined || json === "{}" ? undefined : json.slice(0, 500);
  } catch {
    return undefined;
  }
}

export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Error";
}
