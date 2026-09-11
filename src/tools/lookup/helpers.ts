import type { CheckAccountLookupCriteria, ContactLookupCriteria, PartLookupCriteria } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields } from "../../mcp/format.js";

export function foundResult(key: string, found: { readonly data: unknown } | undefined) {
  return found === undefined ? { found: false } : { found: true, [key]: recordFields(found.data) };
}

export function contactCriteria(input: { customerNumber: string }): ContactLookupCriteria {
  return { customerNumber: input.customerNumber };
}

export function checkAccountCriteria(input: {
  iban?: string | undefined;
  name?: string | undefined;
}): CheckAccountLookupCriteria {
  if (input.iban !== undefined && input.name === undefined) return { iban: input.iban };
  if (input.name !== undefined && input.iban === undefined) return { name: input.name };
  throw new Error("sevdesk_find_check_account requires exactly one of iban or name.");
}

export function partCriteria(input: {
  partNumber?: string | undefined;
  name?: string | undefined;
}): PartLookupCriteria {
  if (input.partNumber !== undefined && input.name === undefined) return { partNumber: input.partNumber };
  if (input.name !== undefined && input.partNumber === undefined) return { name: input.name };
  throw new Error("sevdesk_find_part requires exactly one of partNumber or name.");
}
