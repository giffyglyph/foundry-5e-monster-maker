import * as fs from "fs";
import path from "path";
import yaml from "js-yaml";

const CONFIG_FILE = "foundry-config.yaml";
const LINK_ROOT = "foundry";

if (!fs.existsSync(CONFIG_FILE)) {
	console.log(`No ${CONFIG_FILE} found - skipping symlinks. Copy example-${CONFIG_FILE} to get type hints.`);
	process.exit(0);
}

const config = yaml.load(await fs.promises.readFile(CONFIG_FILE, "utf-8")) ?? {};
const installs = config.installs ?? {};
const requested = process.argv[2] ?? config.active;

if (!requested) {
	console.error(`${CONFIG_FILE} must set "active", or a generation must be passed as an argument.`);
	process.exit(1);
}
if (!installs[requested]) {
	console.error(`"${requested}" is not listed under "installs" in ${CONFIG_FILE}. Known: ${Object.keys(installs).join(", ") || "none"}`);
	process.exit(1);
}

// Electron installs nest the sources under resources/app. Node installs do not.
function resolveRoot(installPath) {
	const nested = path.join(installPath, "resources", "app");
	return fs.existsSync(nested) ? nested : installPath;
}

// Junctions, because a real symlink needs elevation or Developer Mode on Windows.
// They only work for directories, which is every path linked below.
async function relink(target, linkPath) {
	if (!fs.existsSync(target)) {
		console.warn(`  skipped ${path.basename(linkPath)} - ${target} does not exist`);
		return;
	}
	if (!fs.statSync(target).isDirectory()) throw new Error(`${target} is not a directory`);
	let existing = null;
	try {
		existing = await fs.promises.lstat(linkPath);
	} catch (e) {
		if (e.code !== "ENOENT") throw e;
	}
	if (existing) {
		if (!existing.isSymbolicLink()) throw new Error(`${linkPath} exists and is not a link - remove it by hand`);
		await fs.promises.unlink(linkPath);
	}
	await fs.promises.symlink(path.resolve(target), linkPath, "junction");
	console.log(`  ${path.basename(linkPath)} -> ${target}`);
}

await fs.promises.mkdir(LINK_ROOT, { recursive: true });

const foundryRoot = resolveRoot(installs[requested]);
console.log(`Linking Foundry ${requested} from ${foundryRoot}`);
for (const p of ["client", "common"]) {
	await relink(path.join(foundryRoot, p), path.join(LINK_ROOT, p));
}
await relink(path.join(foundryRoot, "public", "lang"), path.join(LINK_ROOT, "lang"));

if (config.systemPath) {
	console.log(`Linking dnd5e from ${config.systemPath}`);
	await relink(config.systemPath, path.join(LINK_ROOT, "dnd5e"));
}
