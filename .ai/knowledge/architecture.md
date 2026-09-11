# Architecture

Load this document when choosing which layer a change belongs in.

This package is a hostable MCP server for sevdesk via `npmsevdesk`. Stdio is the local process
transport. HTTP is Streamable HTTP at `/mcp` plus OAuth at `/authorize`, `/token`, `/register`,
and RFC 9728 metadata.

## Entry points

- `src/index.ts` — CLI: stdio by default, `http` for the listener.
- `src/http-main.ts` — HTTP process. Refuses tokens on argv.
- `src/transport/stdio.ts` — stdio MCP. Uses `SEVDESK_API_TOKEN` / `SEVDESK_BASE_URL`. Must not
  speak OAuth.
- `src/transport/http.ts` — Express app, session map, Host allowlist, health.
- `src/auth/routes.ts` — OAuth HTTP surface and consent POST.
- `src/mcp/server.ts` and `src/mcp/catalog.ts` — MCP server, `MCP_INSTRUCTIONS`, and tool catalog.
- `src/auth/login-fields.ts` — the only login-question customization point.
- `src/sevdesk/client.ts` — `npmsevdesk` client factory.
- `src/sevdesk/tax.ts` — bookkeeping 1.0/2.0 tax defaults and sales/credit-note/voucher tax checks.

## Facts that are easy to get wrong

- HTTP Bearer must be an `mcp1.` session token from this host. The sevdesk API token is not a
  connector credential.
- Tool handlers receive the upstream token from the sealed login bag, never from the client.
- Connector agents read `MCP_INSTRUCTIONS` for TaxRule ids, Gutschrift vs PROVISION, and draft-vs-send.
- `tsup.config.ts` regenerates `src/mcp/catalog.ts` from `src/tools` on build.
