// Assemble the plugin contents and run @kintone/plugin-packer.
// Run after `npm run build`. Generates private.ppk on first run (gitignored).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const build = resolve(root, "build");
const dist = resolve(root, "dist");

if (!existsSync(resolve(dist, "desktop.js")) || !existsSync(resolve(dist, "config.js"))) {
  console.error("dist/ is missing. Run `npm run build` first.");
  process.exit(1);
}

rmSync(build, { recursive: true, force: true });
mkdirSync(resolve(build, "js"), { recursive: true });
mkdirSync(resolve(build, "config"), { recursive: true });
mkdirSync(resolve(build, "image"), { recursive: true });

cpSync(resolve(dist, "desktop.js"), resolve(build, "js/desktop.js"));
cpSync(resolve(dist, "config.js"), resolve(build, "js/config.js"));
cpSync(resolve(root, "src/config/config.html"), resolve(build, "config/config.html"));
cpSync(resolve(root, "src/config/theme.css"), resolve(build, "config/theme.css"));
cpSync(resolve(root, "plugin/manifest.json"), resolve(build, "manifest.json"));
cpSync(resolve(root, "plugin/icon.png"), resolve(build, "image/icon.png"));

const ppk = resolve(root, "private.ppk");
const outZip = resolve(dist, "plugin.zip");
const args = [build, "--out", outZip];
if (existsSync(ppk)) {
  args.push("--ppk", ppk);
}

execFileSync("npx", ["@kintone/plugin-packer", ...args], { stdio: "inherit", cwd: root });

// On the first run the packer generates a key next to the output. Promote it to
// a stable private.ppk so later builds keep the same plugin id.
if (!existsSync(ppk)) {
  const generated = readdirSync(dist).find((f) => f.endsWith(".ppk"));
  if (generated) {
    cpSync(resolve(dist, generated), ppk);
    console.log(`Saved signing key -> ${ppk} (keep it, git-ignored)`);
  }
}

console.log(`Packed plugin -> ${outZip}`);
