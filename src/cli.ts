export function cliMode(argv: readonly string[]): "stdio" | "http" {
  return argv[0] === "http" || argv.includes("--http") ? "http" : "stdio";
}

export function wantsHelp(argv: readonly string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

export function tokenOnArgv(argv: readonly string[]): boolean {
  return argv.some((arg) => arg.startsWith("--token") || arg === "-t");
}

export const HELP = `mcpsevdesk

  mcpsevdesk         stdio
  mcpsevdesk http    Streamable HTTP at /mcp

Stdio:
  SEVDESK_API_TOKEN           required for stdio

HTTP:
  MCP_OAUTH_SECRET            required, ≥32 chars, keep stable
  MCP_PUBLIC_URL              required when binding 0.0.0.0
  MCP_AUTH_PASSWORD           Host access; omit for public login
  SEVDESK_API_TOKEN           leave empty; collected on /authorize

Do not pass tokens on the command line.
`;
