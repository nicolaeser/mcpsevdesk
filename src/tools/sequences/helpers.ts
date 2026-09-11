import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { parseBookingDate, sevdeskDate } from "../../sevdesk/schemas.js";

export const sequenceAt = z
  .union([z.number(), sevdeskDate, z.string()])
  .describe("Unix seconds, YYYY-MM-DD, or ISO-8601. Used for %YYYY and %MM in the sequence format.");
