import CompatibilityHelpers from './CompatibilityHelpers.js';

const GMM_EXHAUSTION_FLAG = "exhaustion";

/* dnd5e rebuilds `system.attributes.exhaustion` every prepare, so an effect change on that path is discarded.
 * v14 only. */
const Exhaustion = (function () {

	function _levels(effect) {
		const flagged = Number(effect?.flags?.gmm?.[GMM_EXHAUSTION_FLAG]);
		return Number.isFinite(flagged) ? Math.trunc(flagged) : 0;
	}

	async function _apply(actor, levels, source) {
		const max = CONFIG.DND5E?.conditionTypes?.exhaustion?.levels ?? 6;
		const current = Number(actor.system?.attributes?.exhaustion) || 0;
		const level = CompatibilityHelpers.clamped(current + levels, 0, max);

		if (level !== current) await actor.update({ "system.attributes.exhaustion": level });
		ui.notifications?.info(game.i18n.format("gmm.condition.exhaustion.gained", {
			source: source,
			name: actor.name,
			level: level
		}));
	}

	/* The level lives on dnd5e's own exhaustion effect. */
	function _onPreCreateActiveEffect(effect) {
		const levels = _levels(effect);
		const actor = effect?.parent;
		if (!levels || actor?.documentName !== "Actor") return;

		_apply(actor, levels, effect.name).catch(e => console.warn("GMM | exhaustion rider failed", e));
		return false;
	}

	function init() {
		Hooks.on("preCreateActiveEffect", _onPreCreateActiveEffect);
	}

	return {
		init: init
	};
})();

export default Exhaustion;
