import Shortcoder from '../classes/Shortcoder.js';
import RollFormula from '../classes/RollFormula.js';

const ModalBasicAttackAc = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_basic_attack_ac .modal__footer button').click(_submitForm.bind(this));
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gmm-modal");
		const form = new FormData(modal.querySelector("form"));

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