import { listTags } from "./list_tags.js";
import { getTag } from "./get_tag.js";
import { listTagRelations } from "./list_tag_relations.js";
import { createTag } from "./create_tag.js";
import { updateTag } from "./update_tag.js";
import { deleteTag } from "./delete_tag.js";

export const tools = [
  listTags,
  getTag,
  listTagRelations,
  createTag,
  updateTag,
  deleteTag
];
