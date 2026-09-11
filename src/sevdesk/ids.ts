import { refs } from "npmsevdesk";
import { z } from "zod";

export const confirmField = z
  .boolean()
  .optional()
  .describe("Must be true to execute this write. The tool is a no-op without it.");

export function entityId(value: string | number): number {
  if (typeof value === "number") return value;
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`Invalid sevdesk id "${value}".`);
  }
  return Number(trimmed);
}

export function firstId(
  input: { readonly id?: string | number | undefined; readonly [key: string]: unknown },
  ...keys: string[]
): string | number {
  const record = input as Record<string, unknown>;
  for (const key of ["id", ...keys]) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") return value;
  }
  throw new Error(`Pass id or ${keys.join(" or ")}.`);
}

export function contactRef(id: string | number) {
  return refs.contact(entityId(id));
}

export function userRef(id: string | number) {
  return refs.sevUser(entityId(id));
}

export function unityRef(id: string | number) {
  return refs.unity(entityId(id));
}

export function checkAccountRef(id: string | number) {
  return refs.checkAccount(entityId(id));
}

export function staticCountryRef(id: string | number) {
  return refs.country(entityId(id));
}

export function partRef(id: string | number) {
  return refs.part(entityId(id));
}

export const idInput = z
  .union([z.string(), z.number()])
  .describe("sevdesk numeric id");

export function accountDatevRef(id: string | number) {
  return refs.accountDatev(entityId(id));
}

export function accountingTypeRef(id: string | number) {
  return refs.accountingType(entityId(id));
}

export function omitUndefined<T extends object>(value: T): T {
  const result = { ...value } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] === undefined) delete result[key];
  }
  return result as T;
}
