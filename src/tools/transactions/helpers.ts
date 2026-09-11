import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { checkAccountRef, confirmField, entityId, firstId } from "../../sevdesk/ids.js";
import { sevdeskDate } from "../../sevdesk/schemas.js";

export const idValue = z.union([z.string(), z.number()]);
export const nullableId = idValue.nullable();
export const transactionStatus = z
  .union([
    z.enum(["created", "linked", "private", "auto-booked", "booked"]),
    z.literal(100),
    z.literal(200),
    z.literal(300),
    z.literal(350),
    z.literal(400)
  ])
  .describe("100 created, 200 linked, 300 private, 350 auto-booked, 400 booked.");

export function transactionRef(id: string | number | null) {
  return id === null ? null : refs.checkAccountTransaction(entityId(id));
}
