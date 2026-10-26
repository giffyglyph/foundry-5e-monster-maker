import AutomationHelpers from './AutomationHelpers.js';
import GmRouting from './GmRouting.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

const GMM_DELETE_BOON_OPERATION = "deleteBoonEffect";

/* Function macros for the pack Boons midi drives. Reached by name as `function.gmmc.boons.*`. */
const Boons = (function () {

	function _getBearer(boon, candidates) {
		return AutomationHelpers.effectBearer("flags.gmm.boon", boon, candidates);
	}

	/* Gated on the boon flag, so the route cannot be turned on an unrelated effect. */
	async function _deleteBoonAsGm(data) {
		const effect = fromUuidSync(data?.effectUuid);
		if (!effect?.flags?.gmm?.boon) return false;
		await effect.delete();
		return true;
	}

	async function lucky(macroData = {}) {
		const workflow = macroData?.workflow;
		const roll = workflow?.attackRoll;
		if (!roll) return;

		const bearer = _getBearer("lucky", [macroData?.token, macroData?.actor]);
		if (!bearer) return;
		if (Number(roll.d20?.results?.find((x) => x.active)?.result) !== 1) return;

		const confirmed = await foundry.applications.api.DialogV2.confirm({
			window: { title: bearer.effect.name },
			content: game.i18n.format("gmm.boon.lucky.prompt", { name: bearer.actor.name }),
			rejectClose: false,
			modal: true
		});
		if (!confirmed) return;

		const reroll = await roll.reroll();
		await globalThis.MidiQOL?.displayDSNForRoll?.(reroll, "attackRollD20");
		await workflow.setAttackRoll(reroll);
		// midi's crit and fumble marks do not clear on a re-run, so the reroll would inherit the fumble.
		workflow.attackRollModifierTracker?.critical?.reset();
		workflow.attackRollModifierTracker?.fumble?.reset();
	}

	async function deflector(macroData = {}) {
		const damageItem = macroData?.workflow?.damageItem;
		if (!damageItem) return;
		if (!(damageItem.oldHP > 0) || damageItem.newHP > 0) return;

		const bearer = _getBearer("deflector", [macroData?.token, macroData?.actor]);
		if (!bearer) return;

		/* The card rebuilds its own totals from damageDetail. hpDamage stops at the bearer's hit points,
		 * so it reads the same on an overkill of 1 and an overkill of 40. */
		const excess = (damageItem.healingAdjustedTotalDamage ?? damageItem.hpDamage ?? 0)
			- (damageItem.oldHP - 1 + (damageItem.oldTempHP ?? 0));
		if (excess <= 0) return;

		globalThis.MidiQOL?.modifyDamageBy?.({
			damageItem: damageItem,
			value: -excess,
			type: "none",
			reason: bearer.effect.name
		});
		damageItem.hpDamage = damageItem.oldHP - 1;
		damageItem.newHP = 1;

		// A zeroHP expiry never fires for a bearer this left on 1, so the one use is spent here.
		await GmRouting.run(GMM_DELETE_BOON_OPERATION, { effectUuid: bearer.effect.uuid }, bearer.effect);
		ui.notifications?.info(game.i18n.format("gmm.boon.deflector.survived", { name: bearer.actor.name }));
	}

	async function thorns(macroData = {}) {
		const workflow = macroData?.workflow;
		const damageItem = workflow?.damageItem;
		const attacker = workflow?.actor;
		if (!damageItem || !attacker) return;

		const bearer = _getBearer("thorns", [macroData?.token, macroData?.actor]);
		if (!bearer || bearer.actor.uuid === attacker.uuid) return;

		// Half of what landed, rather than half the typed damage, which would meet resistances twice.
		const reflected = Math.floor(((damageItem.hpDamage ?? 0) + (damageItem.tempDamage ?? 0)) / 2);
		if (reflected <= 0) return;

		await attacker.applyDamage(reflected);
		ui.notifications?.info(game.i18n.format("gmm.boon.thorns.reflected", {
			name: bearer.actor.name,
			target: attacker.name,
			damage: reflected
		}));
	}

	function registerApi() {
		GmRouting.register(GMM_DELETE_BOON_OPERATION, _deleteBoonAsGm);
		const api = { lucky: lucky, deflector: deflector, thorns: thorns };
		// midi resolves `function.<path>` as a bare dotted global, so the short alias is the callable one.
		globalThis.gmmc ??= {};
		globalThis.gmmc.boons = api;

		const moduleRef = game.modules.get(GMM_MODULE_TITLE);
		if (moduleRef) {
			moduleRef.api ??= {};
			moduleRef.api.boons = api;
		}
	}

	return {
		registerApi: registerApi,
		lucky: lucky,
		deflector: deflector,
		thorns: thorns
	};
})();

export default Boons;
