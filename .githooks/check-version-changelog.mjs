// Pre-commit guard: if module.json's version increases in this commit, docs/CHANGELOG.md
// must carry a matching "## v<version>" heading. Compares the staged (index) module.json
// against HEAD, so it only fires on version-bump commits. Bypass with `git commit --no-verify`.
import { execFileSync } from "node:child_process";

function gitShow(ref) {
  try {
    return execFileSync("git", ["show", ref], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function versionOf(json) {
  try { return JSON.parse(json).version; } catch { return null; }
}

function cmp(a, b) {
  const A = String(a).split(".").map(n => parseInt(n, 10) || 0);
  const B = String(b).split(".").map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const d = (A[i] || 0) - (B[i] || 0);
    if (d) return d;
  }
  return 0;
}

const newVersion = versionOf(gitShow(":module.json"));       // staged content being committed
const oldVersion = versionOf(gitShow("HEAD:module.json"));   // previous commit

// Nothing to enforce unless we can see a real increase.
if (!newVersion || !oldVersion || cmp(newVersion, oldVersion) <= 0) process.exit(0);

const changelog = gitShow(":docs/CHANGELOG.md") ?? "";
const esc = newVersion.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasEntry = new RegExp(`^#{1,6}\\s+v?${esc}(?![0-9.])`, "m").test(changelog);

if (!hasEntry) {
  console.error(`\n✖ Commit blocked: module.json version was bumped ${oldVersion} -> ${newVersion},`);
  console.error(`  but docs/CHANGELOG.md has no "## v${newVersion}" entry.`);
  console.error(`  Add a changelog heading for v${newVersion}, then re-commit.`);
  console.error(`  (To bypass intentionally: git commit --no-verify)\n`);
  process.exit(1);
}
