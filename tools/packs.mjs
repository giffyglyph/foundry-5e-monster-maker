// Build/extract the module's compendium packs via the Foundry CLI.
//   node tools/packs.mjs unpack [sourcePacksDir]   LevelDB -> src/packs/<name>/*.yml (editable source)
//   node tools/packs.mjs pack                       src/packs/<name>/*.yml -> packs/<name> (shipped)
// classic-level fails to open relative paths on Windows, so every path is resolved to absolute here.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cliDir = path.dirname(require.resolve("@foundryvtt/foundryvtt-cli/package.json"));
const cliBin = path.join(cliDir, require(path.join(cliDir, "package.json")).bin.fvtt);

const direction = process.argv[2];
if (!["pack", "unpack"].includes(direction)) {
  console.error("usage: node tools/packs.mjs <pack|unpack> [sourcePacksDir]");
  process.exit(1);
}

const manifest = require(path.join(root, "module.json"));
const srcRoot = path.join(root, "src", "packs");   // editable YAML source
const ldbRoot = path.join(root, "packs");          // runtime LevelDB (shipped)

for (const { name } of manifest.packs) {
  const args = ["package", direction, name, "--yaml"];
  if (direction === "unpack") {
    const from = process.argv[3] ? path.resolve(process.argv[3]) : ldbRoot;
    args.push("--in", from, "--out", path.join(srcRoot, name), "--clean");
  } else {
    fs.rmSync(path.join(ldbRoot, name), { recursive: true, force: true });
    args.push("--in", path.join(srcRoot, name), "--out", ldbRoot);
  }
  console.log(`\n[${direction}] ${name}`);
  const r = spawnSync(process.execPath, [cliBin, ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}
