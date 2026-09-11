import type { SevdeskClient } from "npmsevdesk";

export interface ClientFactoryOptions {
  readonly apiToken: string;
  readonly baseURL?: string;
  readonly allowInsecureLocalhost?: boolean;
}

export type SevdeskClientFactory = (options: ClientFactoryOptions) => SevdeskClient;

export interface ToolContext {
  readonly client: SevdeskClient;
  readonly secrets: readonly string[];
}

export type ToolContent = {
  readonly type: "text";
  readonly text: string;
};

export interface ToolResult {
  readonly content: readonly ToolContent[];
  readonly isError?: boolean;
}
