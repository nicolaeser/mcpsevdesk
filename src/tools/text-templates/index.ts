import { listTextTemplates } from "./list_text_templates.js";
import { createTextTemplate } from "./create_text_template.js";
import { updateTextTemplate } from "./update_text_template.js";
import { deleteTextTemplate } from "./delete_text_template.js";

export const tools = [
  listTextTemplates,
  createTextTemplate,
  updateTextTemplate,
  deleteTextTemplate
];
