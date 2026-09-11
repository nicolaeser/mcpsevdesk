import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import type { TypeOf, ZodTypeAny } from "zod";
import { toolError, toolSuccess } from "./format.js";
import { coercePositionText } from "../sevdesk/schemas.js";
import type { ToolContext, ToolResult } from "../types.js";

export interface CatalogTool {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: ZodTypeAny;
  readonly annotations: ToolAnnotations;
  readonly handler: (ctx: ToolContext, args: unknown) => Promise<ToolResult>;
}

export function defineTool<TSchema extends ZodTypeAny>(
  name: string,
  title: string,
  description: string,
  inputSchema: TSchema,
  handler: (ctx: ToolContext, args: TypeOf<TSchema>) => Promise<ToolResult>,
  annotations: ToolAnnotations = {}
): CatalogTool {
  return {
    name,
    title,
    description,
    inputSchema,
    annotations: {
      title,
      openWorldHint: true,
      ...hintsForName(name),
      ...annotations
    },
    handler: (ctx, args) => handler(ctx, inputSchema.parse(coercePositionText(args)) as TypeOf<TSchema>)
  };
}

export async function runTool(
  ctx: ToolContext,
  execute: () => Promise<unknown>
): Promise<ToolResult> {
  try {
    return toolSuccess(await execute(), ctx.secrets);
  } catch (error) {
    return toolError(error, ctx.secrets);
  }
}

function hintsForName(name: string): ToolAnnotations {
  const key = name.replace(/^(sevdesk_|template_)/, "");
  const readOnly =
    key !== "get_order_pdf" &&
    !key.includes("datev") &&
    (/^(list_|get_|lookup_|find_|next_|check_|export_|report_)/.test(key) ||
      /_(stock|balance|xml|pdf)$/.test(key));
  const destructive = /delete|cancel/.test(key);
  const idempotent = readOnly || /^(update_|delete_|send_|reset_|enshrine_)/.test(key);
  if (readOnly) {
    return { readOnlyHint: true, destructiveHint: false, idempotentHint: true };
  }
  return {
    readOnlyHint: false,
    destructiveHint: destructive,
    idempotentHint: idempotent
  };
}
