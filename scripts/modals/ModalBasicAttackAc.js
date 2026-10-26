import Shortcoder from '../classes/Shortcoder.js';
import RollFormula from '../classes/RollFormula.js';
import CompatibilityHelpers from '../classes/CompatibilityHelpers.js';

const ModalBasicAttackAc = (function() {

	function activateListeners(html, actor) {
		const ctx = { actor };
		html.find('#modal_basic_attack_ac .modal__footer button').click(_submitForm.bind(ctx));
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gmm-modal");
		const form = CompatibilityHelpers.readInputs(modal.querySelector(".modal__form"));

		const rollParts = [];
		const messageParts = [];
		switch (action) {
			case "roll-advantage":
				rollParts.push("2d20kh");
				messageParts.push(game.i18n.format('gmm.modal.basic_attack_ac.message.advantage'));
				break;
			case "roll-disadvantage":
				rollParts.push("2d20kl");
				messageParts.push(game.i18n.format('gmm.modal.basic_attack_ac.message.disadvantage'));
				break;
			default: 
				rollParts.push("1d20");
				messageParts.push(game.i18n.format('gmm.modal.basic_attack_ac.message.plain'));
				break;
		}
		rollParts.push(form.get("bonus"));
		let rollString = rollParts.join(" + ");

		if (form.get("modifiers")) {
			rollString = `${rollParts.length > 1 ? `(${rollString})` : rollString} + ${Shortcoder.replaceShortcodes(form.get("modifiers"), this.actor?.flags?.gmm?.monster?.data).trim()}`;
		}

		try {
			const asyncRoll = new CONFIG.Dice.D20Roll(RollFormula.getRollFormula(rollString), {}, { configured: true }).roll();
			asyncRoll.then(completedRoll => {
				completedRoll.toMessage({
					speaker: ChatMessage.getSpeaker({actor: this.actor}),
					flavor: messageParts.join(" "),
					...CompatibilityHelpers.genericMessageData()
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

export default ModalBasicAttackAc;