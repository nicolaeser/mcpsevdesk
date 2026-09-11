import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";

export const objectType = z.enum(["AB", "ALL", "AN", "CN", "LI", "MA", "PAYMENT_CONFIRMATION", "RE"]);
