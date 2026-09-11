import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, contactRef, entityId, idInput } from "../../sevdesk/ids.js";
import { accountingFields, accountingBody, accountingContactIdOf, commType, commKey, communicationKey, contactEmbed, contactCategory, contactStatus, taxType, addressInput, communicationInput, accountingInput, taxInput, upsertInput } from "./helpers.js";

export const getCommunicationWayKeys = defineTool(
    "sevdesk_get_communication_way_keys",
    "Get communication way keys",
    "List sevdesk communication-way keys (work, private, mobile, invoice, newsletter).",
    z.object({}),
    (ctx) => runTool(ctx, async () => (await ctx.client.raw.communicationWay.getCommunicationWayKeys()).data)
  );
