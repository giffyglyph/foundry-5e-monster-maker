// Pre-commit guard: every pack declared in module.json must have source under src/packs,
// and every src/packs directory must be declared. A declared pack with no source ships as an
// empty compendium, which neither `npm run pack` nor the release workflow treats as an error.
// Reads the index rather than the working tree, so it sees exactly what is being committed.
import { execFileSync } from "node:child_process";

function git(args) {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

// Don't block commits that touch neither side of the comparison.
const staged = git(["diff", "--cached", "--name-only"]) ?? "";
if (!/^(module\.json|src\/packs\/)/m.test(staged)) process.exit(0);

let declared;
try {
  declared = JSON.parse(git(["show", ":module.json"])).packs.map(p => p.name);
} catch {
  process.exit(0);
}

const sourced = new Set(
  (git(["ls-files", "--cached", "--", "src/packs"]) ?? "")
    .split("\n")
    .map(p => p.split("/")[2])
    .filter(Boolean)
);

const missing = declared.filter(n => !sourced.has(n));
const orphan = [...sourced].filter(n => !declared.includes(n));

if (missing.length || orphan.length) {
  console.error(`\nCommit blocked: module.json packs and src/packs do not line up.`);
  if (missing.length) console.error(`  Declared in module.json, no source (ships empty): ${missing.join(", ")}`);
  if (orphan.length) console.error(`  Source in src/packs, not declared (never ships): ${orphan.join(", ")}`);
  console.error(`  (To bypass intentionally: git commit --no-verify)\n`);
  process.exit(1);
}
