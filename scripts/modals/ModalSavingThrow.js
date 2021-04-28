const ModalSavingThrow = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_saving_throw .modal__footer button').click(_submitForm.bind(this));
		html.find('.monster__modifier .save button').click(_setSave.bind(this));
	}

	function _setSave(event) {
		const save = event.currentTarget.closest("button").dataset.save;
		const modal = event.currentTarget.closest(".gg5e-mm-window");
		modal.querySelector(`#modal_saving_throw .radio--${save ? save : "str"}`).checked = true;
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gg5e-mm-modal");
		const form = new FormData(modal.querySelector("form"));
		const save = form.get("save");
		const saveBonus = save ? Number(form.get(`save_${save}`)) : 0;

		const rollParts = [];
		const messageParts = [];
		switch (action) {
			case "roll-advantage":
				rollParts.push("2d20kh");
				messageParts.push(game.i18n.format(`gg5e_mm.modal.saving_throw.message.advantage`, {
					ability: game.i18n.format(`gg5e_mm.monster.common.ability.${save}.name`)
				}));
				break;
			case "roll-disadvantage":
				rollParts.push("2d20kl");
				messageParts.push(game.i18n.format(`gg5e_mm.modal.saving_throw.message.disadvantage`, {
					ability: game.i18n.format(`gg5e_mm.monster.common.ability.${save}.name`)
				}));
				break;
			default: 
				rollParts.push("1d20");
				messageParts.push(game.i18n.format(`gg5e_mm.modal.saving_throw.message.plain`, {
					ability: game.i18n.format(`gg5e_mm.monster.common.ability.${save}.name`)
				}));
				break;
		}
		rollParts.push(saveBonus);
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

export default ModalSavingThrow;