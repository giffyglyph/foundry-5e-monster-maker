import Gui from "../classes/Gui.js";

const ModalRandomDamage = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_random_damage .modal__footer button').click(_submitForm.bind(this));
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gg5e-mm-modal");
		const form = new FormData(modal.querySelector("form"));
		const bonus = (form.get("bonus") == "—") ? 0 : form.get("bonus");

		const rollParts = [];
		const messageParts = [];
		switch (action) {
			case "roll-critical":
				rollParts.push(bonus);
				messageParts.push(game.i18n.format('gg5e_mm.modal.random_damage.message.critical'));
				break;
			default: 
				messageParts.push(game.i18n.format('gg5e_mm.modal.random_damage.message.plain'));
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
			Gui.closeModal(event);
		}
    }

	return {
		activateListeners: activateListeners
	};
})();

export default ModalRandomDamage;