const ModalBasicAttackAc = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_basic_attack_save .modal__footer button').click(_submitForm.bind(this));
		html.find('.button--primary-dc').click(_setPrimary.bind(this));
		html.find('.button--secondary-dc').click(_setSecondary.bind(this));
	}

	function _setPrimary(event) {
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector("#modal_basic_attack_save .radio--primary").checked = true;
	}

	function _setSecondary(event) {
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector("#modal_basic_attack_save .radio--secondary").checked = true;
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
		if (form.get("modifiers")) {
			rollParts.push(form.get("modifiers"));
		}
		
		try {
			const roll = new Roll(rollParts.join(" + ")).roll();
			roll.toMessage({
				speaker: ChatMessage.getSpeaker({actor: this.actor}),
				flavor: messageParts.join(" "),
				messageData: {"flags.dnd5e.roll": {type: "other", itemId: this.id }},
				rollMode: form.get("mode")
			});
		} catch(err) {
			console.error(err);
			return;
		} finally {
			modal.querySelector("[data-action='close-modal']").click();
		}
    }

	return {
		activateListeners: activateListeners
	};
})();

export default ModalBasicAttackAc;