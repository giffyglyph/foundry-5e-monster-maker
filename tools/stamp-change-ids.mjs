// Give every active-effect change in the shipped packs a stable _id.
//   node tools/stamp-change-ids.mjs [--dry-run]
// dnd5e 6.0 keys its change editor and per-change condition filters off an _id it otherwise
// regenerates on every read. A pack never receives the world migration that would pin one.
// Ids derive from the file and the change's position. A re-run after `npm run unpack` fills
// only the gaps. Run it after anything that adds a change, then `npm run pack`.
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import path from "node:path";
import fs from "node:fs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dryRun = process.argv.includes("--dry-run");
const srcRoot = path.join(root, "src", "packs");
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

function deriveId(seed) {
    const digest = createHash("sha256").update(seed).digest();
    let id = "";
    for (let i = 0; i < 16; i++) id += ALPHABET[digest[i] % ALPHABET.length];
    return id;
}

let stamped = 0;
let seen = 0;
for (const pack of fs.readdirSync(srcRoot)) {
    for (const file of fs.readdirSync(path.join(srcRoot, pack))) {
        const filePath = path.join(srcRoot, pack, file);
        const source = fs.readFileSync(filePath, "utf8");
        const lines = source.split("\n");
        const output = [];
        let index = -1;
        for (let i = 0; i < lines.length; i++) {
            output.push(lines[i]);
            const start = lines[i].match(/^([ \t]*)- key:/);
            if (!start) continue;
            index++;
            seen++;
            const body = `${start[1]}  `;
            let j = i + 1;
            while ((j < lines.length) && lines[j].startsWith(body) && !lines[j].startsWith(`${body} `)) j++;
            if (lines.slice(i + 1, j).some(l => l.startsWith(`${body}_id:`))) continue;
            stamped++;
            output.push(`${body}_id: ${deriveId(`${pack}/${file}#${index}`)}${lines[i].endsWith("\r") ? "\r" : ""}`);
        }
        const joined = output.join("\n");
        if ((joined !== source) && !dryRun) fs.writeFileSync(filePath, joined);
    }
}

console.log(`${stamped} of ${seen} changes stamped${dryRun ? " (dry run)" : ""}`);
