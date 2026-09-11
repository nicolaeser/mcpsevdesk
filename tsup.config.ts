import { copyFileSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

writeToolCatalog();

export default defineConfig({
  entry: {
    index: "src/index.ts",
    http: "src/http-main.ts",
    server: "src/server.ts"
  },
  format: ["esm"],
  dts: false,
  sourcemap: true,
  clean: true,
  target: "node26",
  splitting: false,
  treeshake: true,
  removeNodeProtocol: false,
  async onSuccess() {
    copyFileSync("src/auth/consent.html", "dist/consent.html");
  }
});

function ident(name: string): string {
  return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

function listToolModules(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      if (name === "raw") continue;
      listToolModules(path, acc);
    }
    else if (name.endsWith(".ts") && !name.endsWith(".test.ts")) acc.push(path);
  }
  return acc;
}

function writeToolCatalog(_priority: string[] = []): void {
  const files = listToolModules("src/tools").filter((path) => {
    const text = readFileSync(path, "utf8");
    return /export const tools/.test(text);
  });
  const mods = files.map((path, i) => {
    const rel = path.replace(/^src\/tools\//, "").replace(/\.ts$/, "");
    return { ident: `tools_${ident(rel.replace(/\//g, "_"))}_${i}`, from: `../tools/${rel}.js` };
  });
  const imports = mods.map((mod) => `import { tools as ${mod.ident} } from "${mod.from}";`).join("\n");
  const spread = mods.map((mod) => `  ...${mod.ident}`).join(",\n");
  writeFileSync(
    "src/mcp/catalog.ts",
    `${imports}

const _all = [
${spread}
];

const _seen = new Set<string>();
export const TOOL_CATALOG = _all.filter((tool) => {
  if (_seen.has(tool.name)) return false;
  _seen.add(tool.name);
  return true;
});

export const TOOL_NAMES = TOOL_CATALOG.map((entry) => entry.name);
`
  );
}

