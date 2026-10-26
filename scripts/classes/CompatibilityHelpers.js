import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

const CompatibilityHelpers = (function () {
	/* Wrap libWrapper.register so a registration failure (e.g. against a method dnd5e has since
	 * removed) emits a console warning instead of throwing and aborting the rest of the patching. */
	function safeWrap(target, fn, type) {
		try {
			libWrapper.register(GMM_MODULE_TITLE, target, fn, type);
			return true;
		} catch (error) {
			// Missing lib-wrapper is expected (the ready hook warns the user). Any other failure means
			// a wrap target changed in this dnd5e version, which has to surface loudly.
			console[game.modules.get('lib-wrapper')?.active ? "error" : "warn"](`GMM | libWrapper hook for "${target}" was not registered: ${error.message}`);
			return false;
		}
	}
	function hasProperty(...args) {
		if (game.version >= 12) {
			return foundry.utils.hasProperty(...args);
		}
		return globalThis.hasProperty(...args);
	}
	function setProperty(...args) {
		if (game.version >= 12) {
			return foundry.utils.setProperty(...args);
		}
		return globalThis.setProperty(...args);
	}
	function getProperty(...args) {
		if (game.version >= 12) {
			return foundry.utils.getProperty(...args);
		}
		return globalThis.getProperty(...args);
	}
	function clamped(...args) {
		if (game.version >= 12) {
			return Math.clamp(...args);
		}
		return Math.clamped(...args);
	}

	function mergeObject(...args) {
		if (game.version >= 12) {
			return foundry.utils.mergeObject(...args);
		}
		return globalThis.mergeObject(...args);
	}
	function replaceFormulaData(...args) {
		if (game.version >= 12) {
			return foundry.dice.Roll.replaceFormulaData(...args);
		}
		return Roll.replaceFormulaData(...args);
		
	}
	function dnd5eAtLeast(version) {
		const current = globalThis.dnd5e?.version ?? game.system?.version ?? "";
		return String(current).localeCompare(String(version), undefined, { numeric: true, sensitivity: 'base' }) >= 0;
	}
	function weight(w, display) {
		if (isNaN(parseFloat(w)) && dnd5eAtLeast(3.2)) {
			let d = display ? display == "imperial" ? "lb" : "kg" : w.units;
			return dnd5e.utils.convertWeight(w.value, w.units, d);
		}
		return w;
		
	}
	function getEncumbranceMultiplier(system) {
		if (dnd5eAtLeast(3)) {
			if (system === "imperial") {
				return CONFIG.DND5E.encumbrance.threshold.maximum.imperial;
			} else if (system === "metric") {
				return CONFIG.DND5E.encumbrance.threshold.maximum.metric;
			}
		} else {
			if (system === "imperial") {
				return CONFIG.DND5E.encumbrance.strMultiplier.imperial;
			} else if (system === "metric") {
				return CONFIG.DND5E.encumbrance.strMultiplier.metric;
			}
		}
	}

	/* dnd5e 6.0 moved every bonus formula from `system.bonuses.*` onto `system.rolls.*`. */
	function globalAbilityBonus(actorData, kind) {
		return actorData?.rolls?.ability?.[kind]?.bonus ?? actorData?.bonuses?.abilities?.[kind];
	}
	function globalAttackBonus(actorData, actionType) {
		return actorData?.rolls?.attack?.[actionType]?.bonus ?? actorData?.bonuses?.[actionType]?.attack;
	}
	function globalDamageBonus(actorData, actionType) {
		return actorData?.rolls?.damage?.[actionType]?.bonus ?? actorData?.bonuses?.[actionType]?.damage;
	}
	// Falling back on a blank 6.0 bonus would read the old path's deprecation.
	function abilitySaveBonus(ability) {
		return dnd5eAtLeast(6) ? ability?.save?.roll?.bonus : ability?.bonuses?.save;
	}
	function setAbilitySaveBonus(ability, formula) {
		if (ability?.save?.roll && ("bonus" in ability.save.roll)) ability.save.roll.bonus = formula;
		else ability.bonuses.save = formula;
	}
	function skillCheckBonus(skill) {
		return dnd5eAtLeast(6) ? skill?.roll?.bonus : skill?.bonuses?.check;
	}
	function initiativeBonus(init) {
		return dnd5eAtLeast(6) ? init?.roll?.bonus : init?.bonus;
	}

	/* dnd5e 6.0 moved the prepared ability totals onto `check` and `save`, leaving getter-only shims behind. */
	function preparedCheckBonus(ability) {
		return ability?.check?.bonus ?? ability?.checkBonus;
	}
	function preparedSaveBonus(ability) {
		return ability?.save?.bonus ?? ability?.saveBonus;
	}
	function setPreparedSaveBonus(ability, value) {
		if ("bonus" in ability.save) ability.save.bonus = value;
		else ability.saveBonus = value;
	}
	function preparedSaveProf(ability) {
		return ability?.save?.prof ?? ability?.saveProf;
	}
	function setPreparedSaveProf(ability, proficiency) {
		if ("prof" in ability.save) ability.save.prof = proficiency;
		else ability.saveProf = proficiency;
	}

	/* dnd5e 6.0 moved the movement modes into a `speeds` mapping. Its source migration deletes the legacy key. */
	function movementSpeed(movement, mode) {
		return movement?.speeds?.[mode] ?? movement?.[mode];
	}
	function movementSpeedPath(mode) {
		return dnd5eAtLeast(6) ? `system.attributes.movement.speeds.${mode}` : `system.attributes.movement.${mode}`;
	}
	// An effect authored against either spelling lands, because the deprecation shim still carries the old one.
	function movementSpeedKeys(mode) {
		return [`system.attributes.movement.${mode}`, `system.attributes.movement.speeds.${mode}`];
	}

	/* dnd5e 6.0 made `attack` a roll-configuration object. Its total carries two terms the old number did not. */
	function setPreparedAttack(ability, proficiency, actor) {
		if (typeof ability.attack !== "object") ability.attack = ability.mod + proficiency;
		else ability.attack.value = ability.mod + proficiency + (ability.attack.bonus ?? 0)
			+ (actor?.conditionRollReduction ?? 0);
	}

	/* dnd5e 6.0 takes the maximum over every formula in `ac.calcs`, where migration leaves the armored and unarmored defaults. */
	function setArmorClassCalculation(acData, calc) {
		acData.calc = calc;
		if (acData.calcs instanceof Set) acData.calcs = new Set([calc]);
	}

	/* ApplicationV2 hands no FormData to callers outside its own submit path. */
	function readInputs(container) {
		const fd = new FormData();
		if (!container) return fd;
		const controls = container.querySelectorAll(
			"input[name], select[name], textarea[name]"
		);
		controls.forEach((el) => {
			if ((el.type === "radio" || el.type === "checkbox") && !el.checked) return;
			fd.append(el.name, el.value);
		});
		return fd;
	}
	function defaultLengthUnits() {
		return dnd5e.utils.defaultUnits?.("length") ?? "ft";
	}

	function foundryGeneration() {
		return game.release?.generation ?? (Number.parseInt(game.version, 10) || 0);
	}

	/* v14 replaced the ActiveEffect `{rounds, turns, seconds}` duration with a value/units pair. */
	function effectDurationHasUnits() {
		return foundryGeneration() >= 14;
	}
	function effectRoundsDuration(rounds) {
		return effectDurationHasUnits() ? { value: rounds, units: "rounds" } : { rounds: rounds };
	}

	/* GMM's modal mode-select emits v13's `rollMode` values, which v14's `messageMode` does not accept. */
	function rollMessageOptions(mode) {
		if (foundryGeneration() < 14) return { rollMode: mode };
		// A literal "roll"/unknown is left unset so toMessage falls back to the world default. Passing
		// "roll" as a messageMode would fail applyMode's CONFIG.ChatMessage.modes lookup.
		const messageMode = { publicroll: "public", gmroll: "gm", blindroll: "blind", selfroll: "self" }[mode];
		return messageMode ? { messageMode } : {};
	}
	/* 5.3 registers no chat message subtypes, so the typed damage card is 6.0-only. */
	function damageMessageData() {
		return CONFIG.ChatMessage.dataModels?.damage ? { type: "damage" } : {};
	}
	/* 5.3 registers no chat message subtypes, so the typed generic card is 6.0-only. */
	function genericMessageData() {
		return CONFIG.ChatMessage.dataModels?.generic ? { type: "generic" } : {};
	}
	return {
		safeWrap: safeWrap,
		hasProperty: hasProperty,
		setProperty: setProperty,
		getProperty: getProperty,
		clamped: clamped,
		dnd5eAtLeast: dnd5eAtLeast,
		mergeObject: mergeObject,
		replaceFormulaData: replaceFormulaData,
		weight: weight,
		getEncumbranceMultiplier: getEncumbranceMultiplier,
		globalAbilityBonus: globalAbilityBonus,
		globalAttackBonus: globalAttackBonus,
		globalDamageBonus: globalDamageBonus,
		abilitySaveBonus: abilitySaveBonus,
		setAbilitySaveBonus: setAbilitySaveBonus,
		skillCheckBonus: skillCheckBonus,
		initiativeBonus: initiativeBonus,
		preparedCheckBonus: preparedCheckBonus,
		preparedSaveBonus: preparedSaveBonus,
		setPreparedSaveBonus: setPreparedSaveBonus,
		preparedSaveProf: preparedSaveProf,
		setPreparedSaveProf: setPreparedSaveProf,
		movementSpeed: movementSpeed,
		movementSpeedPath: movementSpeedPath,
		movementSpeedKeys: movementSpeedKeys,
		setPreparedAttack: setPreparedAttack,
		setArmorClassCalculation: setArmorClassCalculation,
		readInputs: readInputs,
		rollMessageOptions: rollMessageOptions,
		damageMessageData: damageMessageData,
		genericMessageData: genericMessageData,
		effectDurationHasUnits: effectDurationHasUnits,
		effectRoundsDuration: effectRoundsDuration,
		defaultLengthUnits: defaultLengthUnits
	};
})();
export default CompatibilityHelpers;