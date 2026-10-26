/* Dependency-free, because GmmItem and Shortcoder would otherwise form a module cycle through it. */

function isLengthUnits(units) {
	return !!units && !!(CONFIG.DND5E?.movementUnits ?? {})[units];
}

export function formatTargetLabel(target, range) {
	if (!target) return "";
	switch (target.type ?? "") {
		case "":
		case "none":
			// Typeless target has no count/units of its own, so read them off the action's range.
			if (range?.units === "self") return game.i18n.format(`gmm.action.labels.target.self`);
			if (range?.units === "touch" || isLengthUnits(range?.units)) {
				return game.i18n.format(`gmm.action.labels.target.any.${target.value > 1 ? "multiple" : "single"}`,
					{ quantity: Math.max(1, target.value) });
			}
			return "";
		case "self":
			return game.i18n.format(`gmm.action.labels.target.self`);
		case "ally":
		case "enemy":
		case "creature":
		case "object": {
			// A distance in the size field turns an affiliation into a self-centered area ("all creatures within 10 feet").
			if (isLengthUnits(target.units) && target.width) {
				const affected = (target.value >= 1)
					? game.i18n.format(`gmm.action.labels.target.${target.type}.${target.value > 1 ? "multiple" : "single"}`,
						{ quantity: target.value })
					: game.i18n.format(`gmm.action.labels.target.${target.type}.all`);
				return game.i18n.format(`gmm.action.labels.target.within.${target.units}`,
					{ target: affected, distance: Math.max(1, target.width) });
			}
			if (target.units === "any") return game.i18n.format(`gmm.action.labels.target.${target.type}.all`);
			return game.i18n.format(`gmm.action.labels.target.${target.type}.${target.value > 1 ? "multiple" : "single"}`,
				{ quantity: Math.max(1, target.value) });
		}
		case "line":
		case "wall":
			if (isLengthUnits(target.units)) {
				const area = game.i18n.format(`gmm.action.labels.target.size.${target.units}.double`,
					{ x: Math.max(1, target.value), y: Math.max(1, target.width) });
				return game.i18n.format(`gmm.action.labels.target.${target.type}`, { area });
			}
			return "";
		default:
			if (isLengthUnits(target.units)) {
				const size = game.i18n.format(`gmm.action.labels.target.size.${target.units}.single`,
					{ x: Math.max(1, target.value) });
				const key = `gmm.action.labels.target.${target.type}`;
				/* Shapes come from the running dnd5e, which can carry one GMMC has no phrasing for. */
				if (!game.i18n.has(key)) return `${size} ${target.type}`;
				return game.i18n.format(key, { size });
			}
			return "";
	}
}

export function formatRangeLabel(range, attackType) {
	if (!range?.units) return "";
	if (["any", "self", "touch"].includes(range.units)) {
		return game.i18n.format(`gmm.action.labels.range.${range.units}`);
	}
	if (!isLengthUnits(range.units) || !range.value) return "";
	const composed = `${range.value}${range.long ? `/${range.long}` : ""}`;
	if (["mwak", "msak"].includes(attackType)) {
		return game.i18n.format(`gmm.action.labels.range.reach.${range.units}`, { range: composed });
	}
	return game.i18n.format(`gmm.action.labels.range.${range.units}`, { range: composed });
}
