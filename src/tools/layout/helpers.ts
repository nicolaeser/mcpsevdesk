import type { DocumentLayoutInput } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, omitUndefined } from "../../sevdesk/ids.js";

export const documentLayoutFields = {
  template: z
    .string()
    .min(1)
    .optional()
    .describe("Layout template id from sevdesk_list_layout_templates or sevdesk_find_layout_template."),
  letterpaper: z
    .string()
    .min(1)
    .optional()
    .describe("Letterpaper id from sevdesk_list_letterpapers."),
  language: z
    .enum(["de_DE", "de_AT", "de_CH", "en_US", "es_ES", "fr_FR", "id_IT", "el_GR"])
    .optional()
    .describe(
      "de_DE German, de_AT Austrian, de_CH Swiss, en_US English, es_ES Spanish, fr_FR French, id_IT Italian, el_GR Greek."
    ),
  payPal: z.enum(["A", "B", "C", "D"]).optional().describe("A icon, B link, C disabled, D as text.")
};

export const getAsPdfField = z
  .boolean()
  .optional()
  .describe("When true, sevdesk returns PDF content for each applied parameter.");

export function toDocumentLayout(input: {
  readonly template?: string | undefined;
  readonly letterpaper?: string | undefined;
  readonly language?: "de_DE" | "de_AT" | "de_CH" | "en_US" | "es_ES" | "fr_FR" | "id_IT" | "el_GR" | undefined;
  readonly payPal?: "A" | "B" | "C" | "D" | undefined;
}): DocumentLayoutInput {
  const layout = omitUndefined({
    template: input.template,
    letterpaper: input.letterpaper,
    language: input.language,
    payPal: input.payPal
  });
  if (Object.keys(layout).length === 0) {
    throw new Error("sevdesk_set_layout requires at least one of template, letterpaper, language, or payPal.");
  }
  return layout as DocumentLayoutInput;
}

export function layoutOptions(getAsPdf: boolean | undefined) {
  return getAsPdf === undefined ? {} : { getAsPdf };
}
