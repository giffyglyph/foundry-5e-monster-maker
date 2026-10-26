// Foundry v13 validates a remote manifest strictly, so one pack type it does not know fails the whole install.
import fs from "node:fs";

const V14_ONLY_PACK_TYPES = ["ActiveEffect"];

const main = JSON.parse(fs.readFileSync("module.json", "utf8"));
const dropped = new Set(main.packs.filter((p) => V14_ONLY_PACK_TYPES.includes(p.type)).map((p) => p.name));

function prune(folders = []) {
	for (const folder of folders) {
		folder.packs = (folder.packs ?? []).filter((name) => !dropped.has(name));
		prune(folder.folders);
	}
}

const v13 = structuredClone(main);
// The package API rejects a reused version. A dotted suffix, unlike "-v13", still sorts a .10 patch above .9.
v13.version = `${main.version}.v13`;
v13.packs = v13.packs.filter((p) => !dropped.has(p.name));
prune(v13.packFolders);
v13.compatibility = { ...main.compatibility, verified: "13", maximum: "13" };
v13.manifest = main.manifest.replace(/module\.json$/, "module-v13.json");
v13.download = main.download.replace(/module\.zip$/, "module-v13.zip");

main.compatibility = { ...main.compatibility, minimum: "14" };

fs.writeFileSync("module.json", JSON.stringify(main, null, "\t") + "\n");
fs.writeFileSync("module-v13.json", JSON.stringify(v13, null, "\t") + "\n");
console.log(`v13 manifest drops: ${[...dropped].join(", ") || "nothing"}`);
