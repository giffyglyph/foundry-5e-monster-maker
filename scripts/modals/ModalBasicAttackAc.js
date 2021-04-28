const ModalBasicAttackAc = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_basic_attack_ac .modal__footer button').click(_submitForm.bind(this));
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gg5e-mm-modal");
		const form = new FormData(modal.querySelector("form"));

		const rollParts = [];
		const messageParts = [];
		switch (action) {
			case "roll-advantage":
				rollParts.push("2d20kh");
				messageParts.push(game.i18n.format('gg5e_mm.modal.basic_attack_ac.message.advantage'));
				break;
			case "roll-disadvantage":
				rollParts.push("2d20kl");
				messageParts.push(game.i18n.format('gg5e_mm.modal.basic_attack_ac.message.disadvantage'));
				break;
			default: 
				rollParts.push("1d20");
				messageParts.push(game.i18n.format('gg5e_mm.modal.basic_attack_ac.message.plain'));
				break;
		}
		rollParts.push(form.get("bonus"));
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