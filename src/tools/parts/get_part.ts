import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, unityRef } from "../../sevdesk/ids.js";
import { extraPartFields, wrapExtraPartFields } from "./helpers.js";

export const getPart = defineTool(
    "sevdesk_get_part",
    "Get part",
    "Fetch one sevdesk part by id. Stock is included on the part.",
    z.object({ partId: z.union([z.string(), z.number()]) }),
    (ctx, input) =>
      runTool(ctx, async () => recordFields((await ctx.client.parts.get(entityId(input.partId))).data))
  );
