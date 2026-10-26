import CompatibilityHelpers from './CompatibilityHelpers.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

const GMM_PARAGON_ACTIONS_SETTING = "trackParagonActions";
const GMM_PARAGON_ACTIONS_KEY = "flags.gmm.blueprint.data.paragon_actions.current";

/* Nothing declares that an action costs paragon power the way a legendary action does, so the cost
 * is inferred. That is why this warns rather than blocks, and why it can be switched off. */
const ParagonPower = (function () {

	function init() {
		Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
		Hooks.on("dnd5e.combatRecovery", _onCombatRecovery);
		Hooks.on("dnd5e.getUnknownAttributeLabel", _onGetUnknownAttributeLabel);
	}

	function _isEnabled() {
		try {
			return !!game.settings.get(GMM_MODULE_TITLE, GMM_PARAGON_ACTIONS_SETTING);
		} catch (error) {
			return false;
		}
	}

	function _getMaximum(actor) {
		return Math.max(0, Number(actor?.flags?.gmm?.monster?.data?.paragon_actions?.maximum?.value) || 0);
	}

	/* `current` is null until first spent, and can outlive a maximum that later shrank. */
	function _getRemaining(actor, maximum) {
		const current = actor?.flags?.gmm?.blueprint?.data?.paragon_actions?.current;
		return CompatibilityHelpers.clamped(current ?? maximum, 0, maximum);
	}

	/* A scaler missing from the tracker has no turn to be off, so it is left alone rather than charged for everything. */
	function _isActingOffTurn(actor) {
		const combat = game.combat;
		if (!combat?.started || !combat.combatant) return false;
		const combatants = combat.combatants.filter((x) => (x.actor?.uuid === actor.uuid) && !x.isDefeated);
		if (!combatants.length) return false;
		return !combatants.some((x) => x.id === combat.combatant.id);
	}

	async function _onPostUseActivity(activity, usageConfig, results) {
		try {
			if (!_isEnabled()) return;
			if (activity?.activation?.type !== "action") return;

			const actor = activity.actor;
			if (!actor?.isGmmMonster?.()) return;

			const maximum = _getMaximum(actor);
			if (!maximum || !_isActingOffTurn(actor)) return;

			const remaining = _getRemaining(actor, maximum);
			if (remaining <= 0) {
				ui.notifications.warn(game.i18n.format("gmm.monster.artifact.paragon_actions.depleted", { name: actor.name }));
				return;
			}
			await actor.update({ [GMM_PARAGON_ACTIONS_KEY]: remaining - 1 });
		} catch (error) {
			console.error(`GMM | Could not spend a paragon action: ${error.message}`);
		}
	}

	function _onCombatRecovery(combatant, periods, results) {
		if (!_isEnabled()) return;
		if (!periods.includes("turnStart") && !periods.includes("encounter")) return;

		const actor = combatant?.actor;
		if (!actor?.isGmmMonster?.()) return;

		const maximum = _getMaximum(actor);
		if (!maximum || (_getRemaining(actor, maximum) === maximum)) return;

		results.actor[GMM_PARAGON_ACTIONS_KEY] = maximum;
	}

	/* Without this the refill renders in the turn-recovery card as a raw flag path. */
	function _onGetUnknownAttributeLabel(attribute, options) {
		if (attribute === GMM_PARAGON_ACTIONS_KEY) options.label = "gmm.monster.artifact.paragon_actions.title";
	}

	return {
		init: init
	};
})();

export default ParagonPower;
