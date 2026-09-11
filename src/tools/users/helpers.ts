import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields } from "../../mcp/format.js";
import { entityId, firstId } from "../../sevdesk/ids.js";

type IgnoreRolesQuery = {
  0?: string;
  1?: string;
  2?: string;
  3?: string;
  4?: string;
  5?: string;
};

export const ignoreRoles = z
  .object({
    0: z.string().optional(),
    1: z.string().optional(),
    2: z.string().optional(),
    3: z.string().optional(),
    4: z.string().optional(),
    5: z.string().optional()
  })
  .optional()
  .describe("Role names sent as ignoreRoles[0]..ignoreRoles[5].");

export function ignoreRolesQuery(value: z.infer<typeof ignoreRoles>): { ignoreRoles: IgnoreRolesQuery } | Record<string, never> {
  if (value === undefined) return {};
  const query: IgnoreRolesQuery = {
    ...(value[0] === undefined ? {} : { 0: value[0] }),
    ...(value[1] === undefined ? {} : { 1: value[1] }),
    ...(value[2] === undefined ? {} : { 2: value[2] }),
    ...(value[3] === undefined ? {} : { 3: value[3] }),
    ...(value[4] === undefined ? {} : { 4: value[4] }),
    ...(value[5] === undefined ? {} : { 5: value[5] })
  };
  if (Object.keys(query).length === 0) return {};
  return { ignoreRoles: query };
}
