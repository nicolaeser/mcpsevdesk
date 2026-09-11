import type { CheckAccountLookupCriteria, ContactLookupCriteria, PartLookupCriteria } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields } from "../../mcp/format.js";
import { foundResult, contactCriteria, checkAccountCriteria, partCriteria } from "./helpers.js";

export const findCheckAccount = defineTool(
    "sevdesk_find_check_account",
    "Find check account",
    "Find a check account by IBAN or name. Returns found:false when missing instead of throwing.",
    z.object({
      iban: z.string().optional(),
      name: z.string().optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () =>
        foundResult("checkAccount", await ctx.client.lookup.findCheckAccount(checkAccountCriteria(input)))
      )
  );
