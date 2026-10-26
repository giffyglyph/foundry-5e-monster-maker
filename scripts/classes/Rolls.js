import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

/* Function macros for the pack effects midi drives. Reached by name as `function.gmmc.rolls.*`.
 * Spelled "rolls" because midi withholds an optional prompt on a fumble unless the value contains "roll". */
const Rolls = (function () {

	// midi puts the roll on the call options and again on the macro data.
	function _rolledD20(context) {
		const roll = context?.scope?.options?.roll ?? context?.args?.[0]?.roll;
		return { roll: roll, result: roll?.d20?.results?.find((x) => x.active) };
	}

	/* Reliable Attacker: when you make an attack roll, treat it as a natural 11. */
	function reliableAttacker(context = {}) {
		const { roll, result } = _rolledD20(context);
		if (!result) return roll;

		// `count` is where dnd5e's own min and max modifiers land, so the natural face survives in the tooltip.
		result.count = 11;
		result.rerolled = true;
		roll._total = roll._evaluateTotal();
		return roll;
	}

	function registerApi() {
		const api = { reliableAttacker: reliableAttacker };
		globalThis.gmmc ??= {};
		globalThis.gmmc.rolls = api;

		const moduleRef = game.modules.get(GMM_MODULE_TITLE);
		if (moduleRef) {
			moduleRef.api ??= {};
			moduleRef.api.rolls = api;
		}
	}

	return {
		registerApi: registerApi,
		reliableAttacker: reliableAttacker
	};
})();

export default Rolls;
