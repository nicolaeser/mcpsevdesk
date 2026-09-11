import type { CheckAccountLookupCriteria, ContactLookupCriteria, PartLookupCriteria } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields } from "../../mcp/format.js";
import { foundResult, contactCriteria, checkAccountCriteria, partCriteria } from "./helpers.js";

export const findPart = defineTool(
    "sevdesk_find_part",
    "Find part",
    "Find a part by part number or name. Returns found:false when missing instead of throwing.",
    z.object({
      partNumber: z.string().optional(),
      name: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => foundResult("part", await ctx.client.lookup.findPart(partCriteria(input))))
  );
