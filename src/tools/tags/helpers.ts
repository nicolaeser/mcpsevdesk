import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, firstId } from "../../sevdesk/ids.js";

export const embed = z.array(z.string()).optional().describe("sevdesk embed paths.");
