import Shortcoder from '../classes/Shortcoder.js';
import RollFormula from '../classes/RollFormula.js';

const ModalBasicAttackAc = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_basic_attack_save .modal__footer button').click(_submitForm.bind(this));
		html.find('.button--primary-dc').click(_setPrimary.bind(this));
	}

	function _setPrimary(event) {
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector("#modal_basic_attack_save .radio--primary").checked = true;
	}

    function _submitForm(event) {
		const modal = event.currentTarget.closest(".gmm-modal");
		const form = new FormData(modal.querySelector("form"));
		const bonus = form.get(form.get("attack"));

		const rollParts = [];
		const messageParts = [];
		rollParts.push(bonus);
		messageParts.push(game.i18n.format('gmm.modal.basic_attack_save.message', {
			defence: game.i18n.format(`gmm.common.ability.${form.get("defence")}.name`)
		}));
		let rollString = rollParts.join(" + ");

		if (form.get("modifiers")) {
			rollString = `${rollParts.length > 1 ? `(${rollString})` : rollString} + ${Shortcoder.replaceShortcodes(form.get("modifiers"), this.actor?.data?.data?.gmm?.monster?.data).trim()}`;
		}

		try {
			const asyncRoll = new Roll(RollFormula.getRollFormula(rollString)).roll();
			asyncRoll.then(completedRoll => {
				completedRoll.toMessage({
					speaker: ChatMessage.getSpeaker({actor: this.actor}),
					flavor: messageParts.join(" "),
					messageData: {"flags.dnd5e.roll": {type: "other", itemId: this.id }},
					rollMode: form.get("mode")
				})
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