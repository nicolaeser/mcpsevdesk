const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);
const PATH_OK = /callback|oauth|auth|connector|mcp/i;
const CURSOR_CALLBACK = {
  protocol: "cursor:",
  hostname: "anysphere.cursor-mcp",
  pathname: "/oauth/callback"
} as const;

export function isAllowedRedirect(uri: string, extra: readonly string[] = []): boolean {
  if (extra.includes(uri)) return true;
  let url: URL;
  try {
    url = new URL(uri);
  } catch {
    return false;
  }
  if (url.username !== "" || url.password !== "" || url.hash !== "") return false;
  if (
    url.protocol === CURSOR_CALLBACK.protocol &&
    url.hostname === CURSOR_CALLBACK.hostname &&
    url.pathname === CURSOR_CALLBACK.pathname &&
    url.search === ""
  ) {
    return true;
  }
  if (LOOPBACK.has(url.hostname)) return url.protocol === "http:" && PATH_OK.test(url.pathname);
  return url.protocol === "https:" && PATH_OK.test(url.pathname);
}

export function logRejectedRedirect(uri: string): void {
  try {
    const url = new URL(uri);
    process.stderr.write(`auth.register reject_redirect host=${url.hostname} path=${url.pathname}\n`);
  } catch {
    process.stderr.write("auth.register reject_redirect host= path=\n");
  }
}

export function filterRedirectUris(uris: readonly string[], extra: readonly string[] = []): string[] {
  const allowed: string[] = [];
  for (const uri of uris) {
    if (isAllowedRedirect(uri, extra)) {
      allowed.push(uri);
    } else {
      logRejectedRedirect(uri);
    }
  }
  return [...new Set(allowed)];
}

export function redirectUriMatches(requested: string, registered: readonly string[]): boolean {
  if (registered.includes(requested)) return true;
  let req: URL;
  try {
    req = new URL(requested);
  } catch {
    return false;
  }
  for (const item of registered) {
    let reg: URL;
    try {
      reg = new URL(item);
    } catch {
      continue;
    }
    if (req.href === reg.href) return true;
    if (!LOOPBACK.has(req.hostname) || !LOOPBACK.has(reg.hostname)) continue;
    if (
      req.protocol === reg.protocol &&
      req.hostname === reg.hostname &&
      req.pathname === reg.pathname &&
      req.search === reg.search
    ) {
      return true;
    }
  }
  return false;
}
