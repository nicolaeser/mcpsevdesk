import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId } from "../../sevdesk/ids.js";
import { objectType } from "./helpers.js";

export const updateTextTemplate = defineTool(
    "sevdesk_update_text_template",
    "Update text template",
    "Update a text template. name, text, optional category (DOCUMENT/LETTER/MAIL), optional textType (HEAD/FOOT/TEXT/SUBJECT/SIGNATURE), optional objectType (AB|ALL|AN|CN|LI|MA|PAYMENT_CONFIRMATION|RE). Requires confirm: true.",
    z.object({
      confirm: confirmField,
      templateId: z.union([z.string(), z.number()]),
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
        requireConfirm(input.confirm, "sevdesk_update_text_template");
        const result = await ctx.client.textTemplates.update(entityId(input.templateId), {
          name: input.name,
          text: input.text,
          ...(input.category === undefined ? {} : { category: input.category }),
          ...(input.textType === undefined ? {} : { textType: input.textType }),
          ...(input.objectType === undefined ? {} : { objectType: input.objectType })
        });
        return recordFields(result.data);
      })
  );
