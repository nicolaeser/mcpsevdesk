import { listParts } from "./list_parts.js";
import { getPart } from "./get_part.js";
import { createPart } from "./create_part.js";
import { updatePart } from "./update_part.js";
import { deletePart } from "./delete_part.js";

export const tools = [
  listParts,
  getPart,
  createPart,
  updatePart,
  deletePart
];
