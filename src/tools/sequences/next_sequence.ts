import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { parseBookingDate, sevdeskDate } from "../../sevdesk/schemas.js";
import { sequenceAt } from "./helpers.js";

export const nextSequence = defineTool(
    "sevdesk_next_sequence",
    "Next sequence",
    "Return the next formatted number from a sevdesk sequence. type is optional; defaults RE / GS / AN for invoice / creditNote / order. Omit type for contact and part. Optional at/date is the instant used for %YYYY and %MM.",
    z.object({
      objectType: z.enum(["invoice", "creditNote", "order", "contact", "part"]),
      type: z
        .enum(["RE", "WKR", "SR", "MA", "TR", "AR", "ER", "AN", "AB", "LI", "GS"])
        .optional()
        .describe("Optional; defaults RE / GS / AN for invoice / creditNote / order. Omit for contact and part."),
      at: sequenceAt.optional(),
      date: sequenceAt.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        const type =
          input.type ??
          (input.objectType === "invoice"
            ? "RE"
            : input.objectType === "creditNote"
              ? "GS"
              : input.objectType === "order"
                ? "AN"
                : undefined);
        const stamp = input.at ?? input.date;
        const result = await ctx.client.sequences.next({
          objectType: input.objectType,
          ...(type === undefined ? {} : { type: type as never }),
          ...(stamp === undefined ? {} : { at: parseBookingDate(stamp) })
        });
        return result.data;
      })
  );
