import CompatibilityHelpers from './CompatibilityHelpers.js';
import GmRouting from './GmRouting.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

const GMM_PARAGON_DEFENSES_SETTING = "trackParagonDefenses";
const GMM_PARAGON_DEFENSES_KEY = "flags.gmm.blueprint.data.paragon_defenses.current";
const GMM_LEGENDARY_RESISTANCES_KEY = "system.resources.legres.value";
const GMM_MIDI_OPTIONAL_KEY = "flags.midi-qol.optional.gmmParagonDefense";
const GMM_MIDI_OPTIONAL_NAME = "gmmParagonDefense";
const GMM_MESSAGE_FLAG = "paragonDefense";
const GMM_SPEND_MARKER = "gmmParagonDefense";
const GMM_SPEND_OPERATION = "spendParagonDefense";

/* Two surfaces, because dnd5e's `forceSuccess` only repaints the card while midi can still change the outcome. */
const ParagonDefenses = (function () {

	function init() {
		GmRouting.register(GMM_SPEND_OPERATION, _spendAsGm);

		Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
		Hooks.on("dnd5e.preRestCompleted", _onPreRestCompleted);
		Hooks.on("dnd5e.preApplyDamage", _onPreApplyDamage);
		Hooks.on("renderRollModifyDialog", _onRenderRollModifyDialog);
		Hooks.on("dnd5e.getUnknownAttributeLabel", _onGetUnknownAttributeLabel);
	}

	/* The rest card renders a delta line per key in the rest's updateData, and falls back to printing the raw
	 * key path when nothing names it. */
	function _onGetUnknownAttributeLabel(attribute, options) {
		if (attribute !== GMM_PARAGON_DEFENSES_KEY) return;
		options.label = "gmm.monster.artifact.paragon_defenses.title";
	}

	function _isEnabled() {
		try {
			return !!game.settings.get(GMM_MODULE_TITLE, GMM_PARAGON_DEFENSES_SETTING);
		} catch (error) {
			return false;
		}
	}

	function _getMaximum(actor) {
		return Math.max(0, Number(actor?.flags?.gmm?.monster?.data?.paragon_defenses?.maximum?.value) || 0);
	}

	/* Negative at levels below zero, where the 2*LVL would otherwise heal. */
	function _getCost(actor) {
		return Math.max(0, Number(actor?.flags?.gmm?.monster?.data?.paragon_defenses?.cost) || 0);
	}

	function _getRemaining(actor, maximum) {
		const current = actor?.flags?.gmm?.blueprint?.data?.paragon_defenses?.current;
		return CompatibilityHelpers.clamped(current ?? maximum, 0, maximum);
	}

	/* The single predicate behind both surfaces, so neither can offer what the other would refuse. */
	function _getSpendable(actor) {
		if (!_isEnabled() || !actor?.isGmmMonster?.()) return null;
		const maximum = _getMaximum(actor);
		if (!maximum) return null;
		const remaining = _getRemaining(actor, maximum);
		if (remaining <= 0) return null;
		const cost = _getCost(actor);
		// A price it cannot survive is never offered
		if (!((Number(actor.system?.attributes?.hp?.value) || 0) > cost)) return null;
		return { cost: cost, remaining: remaining };
	}

	function prepareDerivedData(actor) {
		if (!_isEnabled()) return;
		_suppressReplacedLegendaryResistances(actor);
		_applyMidiFlags(actor);
	}

	/* dnd5e offers its Resist button off the re-derived `legres.value`, so zeroing it withdraws the button. */
	function _suppressReplacedLegendaryResistances(actor) {
		if (actor?.flags?.gmm?.monster?.data?.legendary_resistances?.visible) return;
		const legres = actor?.system?.resources?.legres;
		if (legres) legres.value = 0;
	}

	/* Derived because `count` encodes affordability, which moves with every point of damage taken.
	 * Plain flags rather than an ActiveEffect, which midi's own cleanup would expire out from under us. */
	function _applyMidiFlags(actor) {
		if (!game.modules.get("midi-qol")?.active || !_getMaximum(actor)) return;

		const spendable = _getSpendable(actor);
		// midi reads a count of 0 as "no budget configured" and prompts anyway, so the block goes instead.
		if (!spendable) {
			const optional = actor.flags?.["midi-qol"]?.optional;
			if (optional) delete optional[GMM_MIDI_OPTIONAL_NAME];
			return;
		}

		CompatibilityHelpers.setProperty(actor, `${GMM_MIDI_OPTIONAL_KEY}.save.fail.all`, "success");
		CompatibilityHelpers.setProperty(actor, `${GMM_MIDI_OPTIONAL_KEY}.count`, spendable.remaining);
		CompatibilityHelpers.setProperty(actor, `${GMM_MIDI_OPTIONAL_KEY}.label`, _getSpendLabel(actor, spendable.cost));
		CompatibilityHelpers.setProperty(actor, `${GMM_MIDI_OPTIONAL_KEY}.displayBonusRolls`, false);
	}

	function _getSpendLabel(actor, cost = _getCost(actor)) {
		return game.i18n.format("gmm.monster.artifact.paragon_defenses.spend", { cost: cost });
	}

	function _onRenderRollModifyDialog(app, element) {
		const actor = app?.data?.actor;
		if (!_isEnabled() || !actor?.isGmmMonster?.()) return;

		// midi appends " (<value>)" to every optional button label with no opt-out, so ours would read "(success)".
		const label = _getSpendLabel(actor);
		for (const button of element.querySelectorAll(".dialog-button")) {
			if (button.textContent.includes(label)) button.innerHTML = button.innerHTML.replace(" (success)", "");
		}

		_chargeOnAccept(app, actor);
	}

	/* midi offers the save's optionals on an owner of the monster or on a GM, so the client that accepts
	 * is one that can pay. Nothing GMMC writes onto the roll survives midi socketing the save away. */
	function _chargeOnAccept(app, actor) {
		for (const button of Object.values(app?.data?.buttons ?? {})) {
			if (button?.key !== GMM_MIDI_OPTIONAL_KEY) continue;
			const accept = button.callback;
			/* Charged after midi's own handler, so a conversion that throws is never paid for. */
			button.callback = async (...args) => {
				const converted = await accept?.(...args);
				await spendParagonDefense({ actor: actor });
				return converted;
			};
		}
	}

	async function spendParagonDefense(options = {}) {
		const actor = options?.actor;
		if (!_getSpendable(actor)) return undefined;
		return GmRouting.run(GMM_SPEND_OPERATION, { actorUuid: actor.uuid }, actor);
	}

	/* Re-derived from the actor rather than read out of the request, so a stale client cannot overspend. */
	async function _spendAsGm(data) {
		const actor = fromUuidSync(data?.actorUuid);
		const spendable = _getSpendable(actor);
		if (!spendable) return undefined;

		// Pool first: a half-failure that skips the payment is bounded, one that skips the decrement is not.
		await actor.update({ [GMM_PARAGON_DEFENSES_KEY]: spendable.remaining - 1 });
		await actor.applyDamage(spendable.cost, { [GMM_SPEND_MARKER]: true });
		return "success";
	}

	function _onPreApplyDamage(actor, amount, updates, options) {
		if (!options?.[GMM_SPEND_MARKER]) return;
		const hp = actor?.system?.attributes?.hp;
		if (!hp) return;

		// The cost comes out of real hit points, so temp is pinned rather than left to the damage pipeline.
		updates["system.attributes.hp.temp"] = hp.temp;
		updates["system.attributes.hp.value"] = Math.max(0, hp.value - amount);
	}

	function _onPreRestCompleted(actor, result, config) {
		if (!_isEnabled() || (config?.type !== "long")) return;
		if (!actor?.isGmmMonster?.()) return;

		_dropReplacedLegendaryRecovery(actor, result);

		const maximum = _getMaximum(actor);
		if (!maximum || (_getRemaining(actor, maximum) === maximum)) return;

		result.updateData ??= {};
		result.updateData[GMM_PARAGON_DEFENSES_KEY] = maximum;
	}

	function _dropReplacedLegendaryRecovery(actor, result) {
		if (actor?.flags?.gmm?.monster?.data?.legendary_resistances?.visible) return;
		if (result?.updateData) delete result.updateData[GMM_LEGENDARY_RESISTANCES_KEY];
	}

	/* dnd5e 6 moved save cards onto typed message data */
	function _isSaveCard(message) {
		return (message?.type === "save") || (message?.getFlag("dnd5e", "roll")?.type === "save");
	}

	function _isResisted(message) {
		return !!(message?.system?.resisted ?? message?.getFlag("dnd5e", "roll")?.forceSuccess);
	}

	function _getResistUpdate(message) {
		return (message?.type === "save") ? { "system.resisted": true } : { "flags.dnd5e.roll.forceSuccess": true };
	}

	function _onRenderChatMessage(message, html) {
		if (!_isEnabled()) return;

		const actor = _getCardActor(message);
		if (!actor?.isGmmMonster?.()) return;

		if (!_isSaveCard(message)) return;
		// Everyone who can see the card sees the status line, so this runs ahead of the ownership gate.
		if (message.getFlag(GMM_MODULE_TITLE, GMM_MESSAGE_FLAG)) return _relabelResistedStatus(html);
		if (_isResisted(message) || !actor.isOwner) return;
		if (message.rolls.some((x) => x.isSuccess)) return;

		const spendable = _getSpendable(actor);
		// The overlap is a configuration problem, not a spending one, so the note outlives an empty pool.
		const overlaps = _getMaximum(actor) > 0 && !!actor.system?.resources?.legres?.value;
		if (!spendable && !overlaps) return;

		const content = document.createElement("div");
		content.classList.add("chat-card");
		if (spendable) content.insertAdjacentHTML("beforeend", `
			<div class="card-buttons">
				<button type="button">
					<i class="fa-solid fa-shield-halved" inert></i>
					${_getSpendLabel(actor, spendable.cost)}
				</button>
			</div>
		`);
		if (overlaps) content.insertAdjacentHTML("beforeend", `
			<p class="supplement"><em>${game.i18n.localize("gmm.monster.artifact.paragon_defenses.legendary_overlap")}</em></p>
		`);

		content.querySelector("button")?.addEventListener("click", async () => {
			if (await spendParagonDefense({ actor: actor }) !== "success") return;
			// The resisted mark is what makes the total read as a success.
			await message.update({
				..._getResistUpdate(message),
				[`flags.${GMM_MODULE_TITLE}.${GMM_MESSAGE_FLAG}`]: true
			});
		});
		html.querySelector(".message-content")?.append(content);
	}

	/* Every unlinked token of one base actor has the same actor id, so a speaker carrying no token cannot
	 * say which of them a card belongs to. Guessing would put a scaler's button on the wrong creature. */
	function _getCardActor(message) {
		const speaker = message?.speaker ?? {};
		if (speaker.scene && speaker.token) {
			return game.scenes.get(speaker.scene)?.tokens.get(speaker.token)?.actor ?? null;
		}
		const actor = game.actors.get(speaker.actor);
		if (!actor) return null;
		return (actor.getActiveTokens(false, true).length > 1) ? null : actor;
	}

	/* dnd5e writes its own resisted line, naming the resource GMMC did not spend. */
	function _relabelResistedStatus(html) {
		const resisted = game.i18n.localize("DND5E.LegendaryResistance.Resisted");
		for (const supplement of html.querySelectorAll("p.supplement")) {
			if (!supplement.textContent.includes(resisted)) continue;
			supplement.innerHTML = `<strong>${game.i18n.localize("DND5E.ROLL.Status")}</strong> `
				+ game.i18n.localize("gmm.monster.artifact.paragon_defenses.resisted");
		}
	}

	return {
		init: init,
		prepareDerivedData: prepareDerivedData,
		spendParagonDefense: spendParagonDefense
	};
})();

export default ParagonDefenses;
