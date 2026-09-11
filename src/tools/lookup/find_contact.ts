import type { CheckAccountLookupCriteria, ContactLookupCriteria, PartLookupCriteria } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields } from "../../mcp/format.js";
import { foundResult, contactCriteria, checkAccountCriteria, partCriteria } from "./helpers.js";

export const findContact = defineTool(
    "sevdesk_find_contact",
    "Find contact",
    "Find a contact by customer number. Returns found:false when missing instead of throwing.",
    z.object({ customerNumber: z.string() }),
    (ctx, input) =>
      runTool(ctx, async () =>
        foundResult("contact", await ctx.client.lookup.findContact(contactCriteria(input)))
      )
  );
