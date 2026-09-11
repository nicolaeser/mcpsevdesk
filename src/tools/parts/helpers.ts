import { refs } from "npmsevdesk";
import { z } from "zod";
import { defineTool, runTool } from "../../mcp/define-tool.js";
import { listPayload, recordFields, requireConfirm } from "../../mcp/format.js";
import { confirmField, entityId, unityRef } from "../../sevdesk/ids.js";

export const extraPartFields = {
  text: z.string().optional().describe("Article description shown on documents."),
  categoryId: z.union([z.string(), z.number()]).optional().describe("Category id."),
  stockEnabled: z.boolean().optional(),
  priceNet: z.number().optional(),
  priceGross: z.number().optional(),
  pricePurchase: z.number().optional(),
  status: z.enum(["inactive", "active"]).optional().describe("inactive=50, active=100."),
  internalComment: z.string().optional().describe("Internal note. Not printed on documents.")
};

export function wrapExtraPartFields(input: {
  readonly text?: string | undefined;
  readonly categoryId?: string | number | undefined;
  readonly stockEnabled?: boolean | undefined;
  readonly priceNet?: number | undefined;
  readonly priceGross?: number | undefined;
  readonly pricePurchase?: number | undefined;
  readonly status?: "inactive" | "active" | undefined;
  readonly internalComment?: string | undefined;
}) {
  return {
    ...(input.text === undefined ? {} : { text: input.text }),
    ...(input.categoryId === undefined ? {} : { category: refs.category(entityId(input.categoryId)) }),
    ...(input.stockEnabled === undefined ? {} : { stockEnabled: input.stockEnabled }),
    ...(input.priceNet === undefined ? {} : { priceNet: input.priceNet }),
    ...(input.priceGross === undefined ? {} : { priceGross: input.priceGross }),
    ...(input.pricePurchase === undefined ? {} : { pricePurchase: input.pricePurchase }),
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.internalComment === undefined ? {} : { internalComment: input.internalComment })
  };
}
