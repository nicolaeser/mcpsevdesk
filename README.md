# mcpsevdesk

sevdesk. Stdio or HTTP at `/mcp`.

```sh
mcpsevdesk
mcpsevdesk http
```

HTTP is OAuth. Secrets stay on this host.

Container: set `MCP_AUTH_PASSWORD` (Host access). Do not set `SEVDESK_API_TOKEN` — each client pastes it on `/authorize`. Also set `MCP_OAUTH_SECRET` (≥32, stable) and `MCP_PUBLIC_URL` (origin, no `/mcp`). Do not set `SEVDESK_BASE_URL`.

`main` publishes GHCR `:latest`. `development` publishes `:dev`.

### Connection page

The consent page identifies the requesting application and explains this connector’s purpose.
Only account details needed for sign-in are shown upfront; optional settings expand on demand.
Server access, when required, is a separate step. Light and dark themes follow your device.
