// Publishes the current release to the Foundry VTT package release API, once per Foundry generation build.
// Reads the already-stamped module.json and module-v13.json and requires these environment variables:
//   FOUNDRY_PACKAGE_RELEASE_TOKEN, GITHUB_REPOSITORY, GITHUB_REF_NAME
import fs from "node:fs";

const token = process.env.FOUNDRY_PACKAGE_RELEASE_TOKEN;
const repo = process.env.GITHUB_REPOSITORY;
const tag = process.env.GITHUB_REF_NAME;

if (!token) {
	console.error("Missing FOUNDRY_PACKAGE_RELEASE_TOKEN secret; cannot publish to Foundry.");
	process.exit(1);
}

const MANIFEST_FILES = ["module.json", "module-v13.json"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Foundry fetches the manifest server-side to validate, so wait for the freshly
// uploaded release asset to become reachable before we call the API.
async function manifestReady(url, attempts = 10) {
	for (let i = 0; i < attempts; i++) {
		try {
			const res = await fetch(url, { redirect: "follow" });
			if (res.ok) return true;
		} catch { /* not ready yet */ }
		await sleep(3000);
	}
	return false;
}

// Lets a re-run finish a release whose first build was published before the second failed.
function alreadyPublished(body) {
	try {
		return JSON.parse(body).errors?.__all__?.some((e) => e.code === "unique_together") ?? false;
	} catch {
		return false;
	}
}

async function publish(file) {
	const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
	const compat = pkg.compatibility ?? {};
	// The API requires a manifest that points at THIS release, not the rolling `latest` URL.
	const manifest = `https://github.com/${repo}/releases/download/${tag}/${file}`;

	const payload = {
		id: pkg.id,
		release: {
			version: pkg.version,
			manifest,
			notes: `https://github.com/${repo}/releases/tag/${tag}`,
			compatibility: {
				minimum: compat.minimum,
				verified: compat.verified,
				...(compat.maximum ? { maximum: compat.maximum } : {})
			}
		}
	};

	if (!(await manifestReady(manifest))) {
		console.error(`Release manifest not reachable after retries: ${manifest}`);
		return false;
	}

	for (let attempt = 1; attempt <= 3; attempt++) {
		const res = await fetch("https://foundryvtt.com/_api/packages/release_version/", {
			method: "POST",
			headers: { "Content-Type": "application/json", "Authorization": token },
			body: JSON.stringify(payload)
		});

		const body = await res.text();
		console.log(`Foundry release API responded ${res.status} for ${file}`);
		console.log(body);

		if (res.ok) {
			console.log(`Published ${pkg.id} v${pkg.version} to Foundry.`);
			return true;
		}
		if (alreadyPublished(body)) {
			console.log(`${pkg.id} v${pkg.version} is already on Foundry; nothing to do.`);
			return true;
		}
		if (res.status !== 429) break;

		const wait = Number(res.headers.get("Retry-After")) || 60;
		console.log(`Rate limited; retrying in ${wait}s.`);
		await sleep((wait + 1) * 1000);
	}

	console.error(`Foundry package release failed for ${file}.`);
	return false;
}

let failed = false;
for (const file of MANIFEST_FILES) {
	if (!(await publish(file))) failed = true;
}
if (failed) process.exit(1);
