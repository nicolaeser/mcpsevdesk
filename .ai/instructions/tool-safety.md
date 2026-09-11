---
type: instruction
description: Governs MCP tools, catalogs, confirm flags, and redaction.
scope: repository
---

# Tool safety

## Scope and activation

This Instruction must be loaded when adding, renaming, or changing tools, annotations, formatters,
or redaction.

## Mandatory rules

- Tools are defined with `defineTool` in `src/mcp/define-tool.ts`. `src/mcp/catalog.ts` is generated
  from `src/tools` at build and must not be edited by hand.
- Write tools must require `confirm: true` in their input schema and must no-op without it.
- Invoice and voucher writes must take tax defaults and pre-API tax validation from
  `src/sevdesk/tax.ts`. Do not invent tax rules in tools.
- `MCP_INSTRUCTIONS` in `src/mcp/server.ts` is the connector-agent briefing for tax, credit notes,
  draft-vs-send, dates, and confirm. Keep it accurate when those rules change.
- Tool output must pass `src/lib/redact.ts` with `ctx.secrets`. Tokens, passwords, and login-bag
  secrets must not appear in text returned to the model.
- Annotations must keep `readOnlyHint` / `destructiveHint` honest. Open-world tools stay
  `openWorldHint: true`.
- Do not log request bodies, Authorization headers, or login fields.

## Sources of truth

- `src/mcp/define-tool.ts`, `src/mcp/format.ts`, `src/lib/redact.ts`, `src/sevdesk/tax.ts`,
  `src/tools/`.
