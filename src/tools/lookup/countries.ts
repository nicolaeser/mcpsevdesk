import type { SevdeskClient } from "npmsevdesk";

export interface LookupCountry {
  readonly id: string;
  readonly objectName: "StaticCountry";
  readonly code: string;
  readonly name?: string;
  readonly nameEn?: string;
}

interface StaticCountryRow {
  readonly id?: string | number;
  readonly objectName?: string;
  readonly code?: unknown;
  readonly name?: string;
  readonly nameEn?: string;
}

interface StaticCountryPage {
  readonly objects?: readonly StaticCountryRow[];
  readonly total?: number;
}

const PAGE_SIZE = 100;

export function normalizeIsoCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  if (trimmed.length === 0) return undefined;
  const normalized = trimmed === "EL" ? "GR" : trimmed;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

export async function lookupCountryByIso(
  client: SevdeskClient,
  rawCode: string,
  optional: boolean
): Promise<LookupCountry | undefined> {
  const code = normalizeIsoCountryCode(rawCode);
  if (code === undefined) {
    throw new Error(`country code must be an ISO 3166-1 alpha-2 code; received "${rawCode}".`);
  }
  const matches: LookupCountry[] = [];
  let offset = 0;
  for (;;) {
    const page = await client.request<StaticCountryPage>({
      method: "GET",
      path: "/StaticCountry",
      query: { limit: PAGE_SIZE, offset, countAll: true },
      retrySafe: true
    });
    const rows = Array.isArray(page.data) ? page.data : page.json.objects ?? [];
    for (const row of rows) {
      if (row === null || typeof row !== "object") continue;
      const rowCode = normalizeIsoCountryCode(row.code);
      if (rowCode !== code) continue;
      if (row.objectName !== undefined && row.objectName !== "StaticCountry") continue;
      if (row.id === undefined || row.id === null || String(row.id).length === 0) continue;
      matches.push({
        id: String(row.id),
        objectName: "StaticCountry",
        code: rowCode,
        ...(row.name === undefined ? {} : { name: row.name }),
        ...(row.nameEn === undefined ? {} : { nameEn: row.nameEn })
      });
    }
    const returned = rows.length;
    const total = page.pagination?.total ?? page.json.total;
    offset += returned;
    if (returned === 0 || (total !== undefined && offset >= total) || returned < PAGE_SIZE) break;
  }
  if (matches.length > 1) {
    throw new Error(`Multiple StaticCountry objects matched ISO code ${code}.`);
  }
  const match = matches[0];
  if (match === undefined) {
    if (optional) return undefined;
    throw new Error(`No StaticCountry matched ISO code ${code}.`);
  }
  return match;
}
