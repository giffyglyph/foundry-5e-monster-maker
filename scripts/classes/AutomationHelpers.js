/* Interop with the third-party automation stack (midi-qol, DAE). Each function no-ops without them. */
const AutomationHelpers = (function () {

	/* Raw data for one activity, from a prepared item or from creation data. Neither shape can be assumed. */
	function activitySource(item, activityId) {
		const activity = item?.system?.activities?.get?.(activityId);
		const existing = activity
			? (activity.toObject?.() ?? activity._source)
			: item?._source?.system?.activities?.[activityId];
		return (existing && typeof existing === "object") ? existing : null;
	}

	/* Anything outside `ownedFields` was written by another module and a forced replacement would reset it.
	 * Under an owned key a leaf `newData` omits is dnd5e's, not GMMC's.
	 * `fallback` stands in when the activity was deleted before the rebuild that reads it. */
	function preserveForeignActivityFields(item, activityId, newData, ownedFields, fallback = null) {
		const existing = activitySource(item, activityId) ?? fallback;
		if (!existing || (typeof existing !== "object")) return newData;

		const merged = { ...newData };
		for (const [key, value] of Object.entries(existing)) {
			if (!ownedFields.has(key)) {
				if (!(key in merged)) merged[key] = value;
			} else if ((value?.constructor === Object) && (merged[key]?.constructor === Object)) {
				merged[key] = { ...value, ...merged[key] };
			}
		}
		return merged;
	}

	/* Core stamps the source effect's uuid, midi the activity's, and dnd5e's tray the concentration
	 * effect's whenever the action concentrates. None of the three can be assumed. */
	function resolveSourceItem(origin) {
		if (typeof origin !== "string" || !origin) return null;
		const viaMidi = globalThis.MidiQOL?.getItemFromEffectOrigin;
		if (viaMidi) {
			try {
				const found = viaMidi(origin);
				if (found) return found;
			} catch (error) {
				console.warn("GMM | midi origin resolution failed; cutting the uuid instead", error);
			}
		}
		const doc = fromUuidSync(origin.split(".Activity.")[0].split(".ActiveEffect.")[0]);
		if (doc?.documentName === "Item") return doc;
		// A concentration effect rides the actor, so cutting its uuid lands on the actor and not the item.
		const carrier = fromUuidSync(origin);
		const itemId = carrier?.getFlag?.("dnd5e", "item")?.id;
		return itemId ? (carrier.parent?.items?.get?.(itemId) ?? null) : null;
	}

	/* Only an actor that carries the effect is eligible, so a bad guess is a no-op rather than the
	 * wrong creature paying. `candidates` is ordered by which source midi makes authoritative. */
	function effectBearer(flagPath, name, candidates) {
		for (const candidate of candidates) {
			const actor = candidate?.actor ?? candidate;
			const effect = actor?.appliedEffects?.find((x) => foundry.utils.getProperty(x, flagPath) === name);
			if (effect) return { actor: actor, effect: effect };
		}
		return null;
	}

	/* A concentration effect names its feature on a flag rather than through `origin`. */
	function concentrationFor(actor, itemId) {
		if (!actor || !itemId) return null;
		return [...(actor.concentration?.effects ?? [])]
			.find(e => e.getFlag("dnd5e", "item")?.id === itemId) ?? null;
	}

	/* Midi resolves an ItemUses count by name inside the acting actor, so renaming the copy strands its budget. */
	function rebindSelfItemUses(itemData) {
		const sheetClass = itemData?.flags?.core?.sheetClass;
		if (typeof sheetClass !== "string" || !sheetClass.endsWith(".ActionSheet")) return null;
		if (!Array.isArray(itemData.effects) || !itemData.effects.length) return null;

		const selfValues = new Set([
			`ItemUses.${itemData.name}`,
			`ItemUses.exactNameMatch.${itemData.name}`
		]);
		/* A copy carried in from elsewhere re-binds, so two copies on one actor never share a pool. */
		const identifier = itemData.system?.identifier;
		if (identifier) selfValues.add(`ItemUses.identifier.${identifier}`);

		let boundIdentifier = null;
		const effects = foundry.utils.deepClone(itemData.effects);
		for (const effect of effects) {
			for (const change of (effect?.system?.changes ?? effect?.changes ?? [])) {
				if (!selfValues.has(change?.value)) continue;
				boundIdentifier ??= foundry.utils.randomID();
				change.value = `ItemUses.identifier.${boundIdentifier}`;
			}
		}
		if (!boundIdentifier) return null;
		return { system: { identifier: boundIdentifier }, effects: effects };
	}

	return {
		concentrationFor: concentrationFor,
		rebindSelfItemUses: rebindSelfItemUses,
		effectBearer: effectBearer,
		activitySource: activitySource,
		preserveForeignActivityFields: preserveForeignActivityFields,
		resolveSourceItem: resolveSourceItem
	};
})();

export default AutomationHelpers;
