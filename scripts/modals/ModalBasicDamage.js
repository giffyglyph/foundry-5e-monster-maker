import Shortcoder from '../classes/Shortcoder.js';
import RollFormula from '../classes/RollFormula.js';
import CompatibilityHelpers from '../classes/CompatibilityHelpers.js';

const ModalBasicDamage = (function() {

	function activateListeners(html, actor) {
		const ctx = { actor };
		html.find('#modal_basic_damage .modal__footer button').click(_submitForm.bind(ctx));
		html.find('.button--static-damage').click(_setStatic.bind(ctx));
		html.find('.button--random-damage').click(_setRandom.bind(ctx));
	}

	function _setStatic(event) {
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector("#modal_basic_damage .radio--static").checked = true;
	}

	function _setRandom(event) {
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector("#modal_basic_damage .radio--random").checked = true;
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gmm-modal");
		const form = CompatibilityHelpers.readInputs(modal.querySelector(".modal__form"));
		const bonus = (form.get("bonus") == "static") ? form.get("static") : Roll.validate(form.get("random")) ? form.get("random") : 0;
		const isCritical = action == "roll-critical";

		const flavor = game.i18n.format(isCritical ? 'gmm.modal.basic_damage.message.critical' : 'gmm.modal.basic_damage.message.plain');
		let rollString = `${bonus}`;

		if (form.get("modifiers")) {
			rollString = `${form.get("bonus") != "static" ? `(${rollString})` : rollString} + ${Shortcoder.replaceShortcodes(form.get("modifiers"), this.actor?.flags?.gmm?.monster?.data, true).trim()}`;
		}

		try {
			const asyncRoll = new CONFIG.Dice.DamageRoll(RollFormula.getRollFormula(rollString), {}, {
				isCritical: isCritical,
				critical: {
					multiplyNumeric: game.settings.get("dnd5e", "criticalDamageModifiers"),
					powerfulCritical: game.settings.get("dnd5e", "criticalDamageMaxDice")
				}
			}).roll();
			asyncRoll.then(completedRoll => {
				completedRoll.toMessage({
					speaker: ChatMessage.getSpeaker({actor: this.actor}),
					flavor: flavor,
					...CompatibilityHelpers.damageMessageData()
				}, CompatibilityHelpers.rollMessageOptions(form.get("mode")));
			});
			modal.querySelector("[data-action='close-modal']").click();
		} catch(err) {
			ui.notifications.error(err, {permanent: true});
			console.error(err);
			return;
		}
	}

	return {
		activateListeners: activateListeners
	};
})();

export default ModalBasicDamage;