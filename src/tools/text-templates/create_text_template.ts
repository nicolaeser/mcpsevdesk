import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { objectType } from "./helpers.js";

export const createTextTemplate = defineTool(
    "sevdesk_create_text_template",
    "Create text template",
    "Create a text template. name, text, optional category (DOCUMENT/LETTER/MAIL, default DOCUMENT), optional textType (HEAD/FOOT/TEXT/SUBJECT/SIGNATURE, default TEXT), optional objectType (AB|ALL|AN|CN|LI|MA|PAYMENT_CONFIRMATION|RE). Requires confirm: true.",
    z.object({
      confirm: confirmField,
      name: z.string(),
      text: z.string(),
      category: z.enum(["DOCUMENT", "LETTER", "MAIL"]).optional().describe("DOCUMENT, LETTER, or MAIL."),
      textType: z
        .enum(["FOOT", "HEAD", "SIGNATURE", "SUBJECT", "TEXT"])
        .optional()
        .describe("HEAD, FOOT, TEXT, SUBJECT, or SIGNATURE."),
      objectType: objectType.optional()
    }),
    (ctx, input) =>
      runTool(ctx, async () => {
        requireConfirm(input.confirm, "sevdesk_create_text_template");
        const result = await ctx.client.textTemplates.create({
          name: input.name,
          text: input.text,
          category: input.category ?? "DOCUMENT",
          textType: input.textType ?? "TEXT",
          ...(input.objectType === undefined ? {} : { objectType: input.objectType })
        });
        return recordFields(result.data);
      })
  );
