import type { LoginField } from "./fields.js";

export function loginFields(): readonly LoginField[] {
  return [
    {
      name: "apiToken",
      label: "API token",
      type: "password",
      required: true,
      secret: true,
      envFallback: "SEVDESK_API_TOKEN",
      prompt: "if-missing",
      autocomplete: "new-password",
      placeholder: "32-character hex token"
    }
  ];
}

export function apiTokenFromBag(
  bag: { readonly secrets: Readonly<Record<string, string>> },
  envToken: string | undefined
): string | undefined {
  const fromBag = bag.secrets.apiToken?.trim();
  if (fromBag !== undefined && fromBag.length > 0) return fromBag;
  if (envToken !== undefined && envToken.length > 0) return envToken;
  return undefined;
}
