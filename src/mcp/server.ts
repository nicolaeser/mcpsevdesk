import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MissingTokenError } from "../errors.js";
import { toolError } from "./format.js";
import { TOOL_CATALOG } from "./catalog.js";
import type { SevdeskClientFactory, ToolContext } from "../types.js";
import { PACKAGE_NAME, PACKAGE_VERSION } from "../version.js";

export interface McpServerOptions {
  readonly createClient: SevdeskClientFactory;
  readonly getToken: () => string | undefined;
  readonly baseURL?: string;
  readonly allowInsecureLocalhost?: boolean;
}

export const MCP_INSTRUCTIONS = [
  "sevdesk German bookkeeping 2.0. Writes need confirm: true. Dates are YYYY-MM-DD.",
  "Create invoices, orders, credit notes, and vouchers as drafts. Do not call send_* (email or mark-sent) unless the user explicitly asked to send, mark sent, or lock. email and mark-sent lock the document; reset and delete then fail.",
  "Tax: for anything other than a simple DE 19% sale, call sevdesk_quote_sale_tax (EU B2C OSS: euConsumerTaxation seller-country or oss-destination). Copy plan.taxRule onto the document and plan.defaultTaxRate onto every position.taxRate. DE domestic → taxRule 1 with 19 (or 7 reduced). Kleinunternehmer → smallBusiness true → taxRule 11 and taxRate 0.",
  "Sales TaxRule: 1=standard taxable 0/7/19; 2=export 0%; 3=intra-community EU B2B goods 0%; 4=§4 UStG 0%; 5=reverse charge §13b 0%; 11=Kleinunternehmer 0%; 17=not domestic 0%; 18/19/20 OSS destination (need address country; not AR/TR/ER/e-invoice); 21=§18b reverse charge 0%. Expense (vouchers only): 8 intra-community acquisition; 9 deductible Vorsteuer 0/7/19; 10 non-deductible; 12/13/14 §13b input.",
  "Gutschrift of an invoice is bookingCategory UNDERACHIEVEMENT + sourceInvoiceId, taxRule matching the source. Prefer sevdesk_create_credit_note_from_invoice after the invoice is OPEN or PAID. PROVISION is commission, ROYALTY_* royalties — not invoice corrections; taxRule 1 and 17 are invalid with those.",
  "Vouchers: expense uses 8/9/10/12/13/14 and accountDatevId from sevdesk_list_tax_guidance; revenue uses 1–5/11/17. Do not guess DATEV accounts. OSS 18/19/20 and 21 are not valid on vouchers.",
  "contactPersonId is a SevUser from sevdesk_list_users. Customer numbers: sevdesk_next_sequence objectType=contact, or customerNumber next on create_contact. Do not drop user wording on position text/headText/footText; do not invent filler."
].join(" ");

export function createMcpServer(options: McpServerOptions): McpServer {
  const server = new McpServer(
    {
      name: PACKAGE_NAME,
      version: PACKAGE_VERSION
    },
    {
      capabilities: {
        tools: {}
      },
      instructions: MCP_INSTRUCTIONS
    }
  );

  for (const entry of TOOL_CATALOG) {
    const config = {
      title: entry.title,
      description: entry.description,
      inputSchema: schemaShape(entry.inputSchema),
      annotations: entry.annotations
    };
    const callback = async (args: Record<string, unknown> | undefined) => {
      let ctx: ToolContext | undefined;
      try {
        ctx = createToolContext(options);
        return await entry.handler(ctx, args ?? {});
      } catch (error) {
        return toolError(error, ctx?.secrets ?? []);
      } finally {
        ctx?.client.dispose();
      }
    };
    server.registerTool(entry.name, config, callback as never);
  }

  return server;
}

function createToolContext(options: McpServerOptions): ToolContext {
  const token = options.getToken();
  if (token === undefined || token.length === 0) {
    throw new MissingTokenError();
  }
  const client = options.createClient({
    apiToken: token,
    ...(options.baseURL === undefined ? {} : { baseURL: options.baseURL }),
    ...(options.allowInsecureLocalhost === undefined
      ? {}
      : { allowInsecureLocalhost: options.allowInsecureLocalhost })
  });
  return { client, secrets: [token] };
}

function schemaShape(schema: z.ZodTypeAny): z.ZodRawShape {
  if (schema instanceof z.ZodObject) {
    return schema.shape as z.ZodRawShape;
  }
  return {};
}

