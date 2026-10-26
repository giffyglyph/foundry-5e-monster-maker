import Shortcoder from '../classes/Shortcoder.js';
import RollFormula from '../classes/RollFormula.js';
import CompatibilityHelpers from '../classes/CompatibilityHelpers.js';

const ModalBasicAttackSave = (function() {

	function activateListeners(html, actor) {
		const ctx = { actor };
		html.find('#modal_basic_attack_save .modal__footer button').click(_submitForm.bind(ctx));
		html.find('.button--primary-dc').click(_setPrimary.bind(ctx));
	}

	function _setPrimary(event) {
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector("#modal_basic_attack_save .radio--primary").checked = true;
	}

    function _submitForm(event) {
		const modal = event.currentTarget.closest(".gmm-modal");
		const form = CompatibilityHelpers.readInputs(modal.querySelector(".modal__form"));
		const bonus = form.get(form.get("attack"));

		const rollParts = [];
		const messageParts = [];
		rollParts.push("1d20");
		rollParts.push(bonus);
		messageParts.push(game.i18n.format('gmm.modal.basic_attack_save.message', {
			defence: game.i18n.format(`gmm.common.ability.${form.get("defence")}.name`)
		}));
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

export default ModalBasicAttackSave;