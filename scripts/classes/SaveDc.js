/* Dependency-free, because Activities and Shortcoder would otherwise form a module cycle through it. */

export function buildSaveDcFormula(blueprintData) {
	const a = blueprintData?.attack ?? {};
	const parts = ["[dcPrimaryBonus]"];
	// `attack.bonus` is a DC modifier on a save action and an attack-roll modifier otherwise.
	if (a.bonus && a.type === "save") parts.push(String(a.bonus));
	// A blank related stat would otherwise drop the ability mod and leave the DC below the stat block.
	parts.push(`[${a.related_stat || "max"}Mod]`);
	return parts.join(" + ");
}

export function buildDurationSaveDcFormula(blueprintData) {
	const modifier = blueprintData?.duration?.save?.modifier ?? {};
	const value = (typeof modifier.value === "string") ? modifier.value.trim() : modifier.value;
	if (value === "" || value === null || value === undefined) return buildSaveDcFormula(blueprintData);
	if (modifier.override) return String(value);
	return `${buildSaveDcFormula(blueprintData)} + (${value})`;
}
