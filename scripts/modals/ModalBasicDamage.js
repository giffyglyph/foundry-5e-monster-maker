const ModalBasicDamage = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_basic_damage .modal__footer button').click(_submitForm.bind(this));
		html.find('.button--static-damage').click(_setStatic.bind(this));
		html.find('.button--random-damage').click(_setRandom.bind(this));
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
		const form = new FormData(modal.querySelector("form"));
		const bonus = (form.get("bonus") == "static") ? form.get("static") : (form.get("random") == "—") ? 0 : form.get("random");

		const rollParts = [];
		const messageParts = [];
		switch (action) {
			case "roll-critical":
				rollParts.push(bonus);
				messageParts.push(game.i18n.format('gmm.modal.basic_damage.message.critical'));
				break;
			default: 
				messageParts.push(game.i18n.format('gmm.modal.basic_damage.message.plain'));
				break;
		}
		rollParts.push(bonus);
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

export default ModalBasicDamage;