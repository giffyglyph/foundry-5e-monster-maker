import AutomationHelpers from './AutomationHelpers.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

/* Function macros for the pack effects midi drives. Reached by name as `function.gmmc.conditions.*`. */
const Conditions = (function () {

	function _getBearer(condition, candidates) {
		return AutomationHelpers.effectBearer("flags.gmm.condition", condition, candidates);
	}

	function _getSpendableClass(actor) {
		return actor.system?.attributes?.hd?.classes?.find?.((x) => x.system?.hd?.value > 0) ?? null;
	}

	async function _spendHitDie(actor, source) {
		// Characters hold hit dice on their class items. Everything else holds a single actor-level pool.
		const cls = _getSpendableClass(actor);
		if (cls) {
			await cls.update({ "system.hd.spent": cls.system.hd.spent + 1 });
		} else {
			const hd = actor.system?.attributes?.hd;
			if (!(hd?.value > 0)) return;
			await actor.update({ "system.attributes.hd.spent": (hd.spent ?? 0) + 1 });
		}

		ui.notifications?.info(game.i18n.format("gmm.condition.bleeding.spent", { name: actor.name, source: source }));
	}

	/* Empty on a workflow that rolls no save, so a condition standing on its own never skips. */
	function _madeTheSave(workflow, actor) {
		for (const saved of workflow?.saves ?? []) {
			if ((saved?.actor ?? saved)?.uuid === actor.uuid) return true;
		}
		return false;
	}


	async function bleeding(...args) {
		const passed = Array.isArray(args[0]?.args) ? args[0].args : args;
		if (typeof passed[0] === "string") return _bleedOnce(passed);

		// OverTime builds its synthetic item under the effect's *origin* actor, so the target leads.
		const macroData = args[0] ?? {};
		const bearer = _getBearer("bleeding", [
			...(macroData?.workflow?.targets ?? []),
			macroData?.token,
			macroData?.actor
		]);
		if (!bearer) return;
		if (_madeTheSave(macroData?.workflow, bearer.actor)) return;

		await _spendHitDie(bearer.actor, bearer.effect.name ?? "");
	}

	/* DAE runs the macro for the effect's own bearer, so there is nothing to guess. */
	async function _bleedOnce(args) {
		if (args[0] !== "on") return;

		const context = args[args.length - 1];
		const effect = fromUuidSync(context?.effectUuid);
		const actor = fromUuidSync(context?.actorUuid);
		if (actor) await _spendHitDie(actor, effect?.name ?? "");

		// A bare rider carries nothing once the die is spent. A condition is the payload itself and stays.
		if (!effect?.flags?.gmm?.condition) await effect?.delete();
	}

	/* Kept for effects authored against the macro pass. An unowned bearer is left to the damage hook
	 * rather than failing on permissions here. */
	async function cursed(macroData = {}) {
		const actor = _getBearer("cursed", [macroData?.token, macroData?.actor])?.actor;
		if (!actor?.isOwner) return;

		/* midi's isDamaged pass runs before the damage is written. */
		const pending = macroData?.damageItem ?? macroData?.workflow?.damageItem;
		const hp = pending?.actorUuid === actor.uuid ? pending.newHP : actor.system?.attributes?.hp?.value;
		await _dieAtZero(actor, hp);
	}

	/* midi's own wounded pass may already have marked the bearer, and toggling a live status clears it. */
	async function _dieAtZero(actor, hp) {
		if (!(Number(hp) <= 0)) return;
		if (actor.statuses?.has("dead")) return;

		await actor.toggleStatusEffect("dead", { active: true, overlay: true });
		ui.notifications?.info(game.i18n.format("gmm.condition.cursed.died", { name: actor.name }));
	}

	/* Fires on whichever client wrote the damage, so that client may write the status too. The bearer's
	 * settled hit points decide the death, rather than a total the workflow computed elsewhere. */
	async function _onApplyDamage(actor) {
		if (!actor?.isOwner || !_getBearer("cursed", [actor])) return;
		await _dieAtZero(actor, actor.system?.attributes?.hp?.value);
	}

	/* Unstable terrain: when a creature ends their turn within the area, they fall prone.
	 * The book gives no save, and a plain OverTime string can only apply a status behind one. */
	async function unstable(macroData = {}) {
		const actor = _getBearer("unstable", [
			...(macroData?.workflow?.targets ?? []),
			macroData?.token,
			macroData?.actor
		])?.actor;
		if (!actor) return;
		if (actor.statuses?.has("prone")) return;

		await actor.toggleStatusEffect("prone", { active: true });
		ui.notifications?.info(game.i18n.format("gmm.terrain.unstable.prone", { name: actor.name }));
	}

	function init() {
		Hooks.on("dnd5e.applyDamage", _onApplyDamage);
	}

	function registerApi() {
		const api = { bleeding: bleeding, cursed: cursed, unstable: unstable };
		// midi resolves `function.<path>` as a bare dotted global, so the short alias is the callable one.
		globalThis.gmmc ??= {};
		globalThis.gmmc.conditions = api;

		const moduleRef = game.modules.get(GMM_MODULE_TITLE);
		if (moduleRef) {
			moduleRef.api ??= {};
			moduleRef.api.conditions = api;
		}
	}

	return {
		init: init,
		registerApi: registerApi,
		bleeding: bleeding,
		cursed: cursed,
		unstable: unstable
	};
})();

export default Conditions;
