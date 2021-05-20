const ModalAbilityCheck = (function() {

	function activateListeners(html, actor, id) {
		this.actor = actor;
		this.id = id;
		html.find('#modal_ability_check .modal__footer button').click(_submitForm.bind(this));
		html.find('.monster__modifier .value button, .monster__skill').click(_setAbilityAndSkill.bind(this));
	}

	function _setAbilityAndSkill(event) {
		const ability = event.currentTarget.closest("button").dataset.ability;
		const skill = event.currentTarget.closest("button").dataset.skill;
		const modal = event.currentTarget.closest(".gmm-window");
		modal.querySelector(`#modal_ability_check .radio--${ability ? ability : "str"}`).checked = true;
		modal.querySelector(`#modal_ability_check .select--skill`).value = (skill) ? skill : "";
	}

    function _submitForm(event) {
		const action = event.currentTarget.closest("button").dataset.action;
		const modal = event.currentTarget.closest(".gmm-modal");
		const form = new FormData(modal.querySelector("form"));
		const ability = form.get("ability");
		const skill = form.get("skill");
		const abilityBonus = ability ? Number(form.get(`ability_${ability}`)) : 0;
		const skillBonus = skill ? Number(form.get(`skill_${skill}`)) : 0;

		const rollParts = [];
		const messageParts = [];
		switch (action) {
			case "roll-advantage":
				rollParts.push("2d20kh");
				messageParts.push(game.i18n.format(`gmm.modal.ability_check.message.${skill ? "skill" : "no_skill"}.advantage`, {
					ability: game.i18n.format(`gmm.common.ability.${ability}.name`),
					skill: game.i18n.format(`gmm.common.skill.${skill}`)
				}));
				break;
			case "roll-disadvantage":
				rollParts.push("2d20kl");
				messageParts.push(game.i18n.format(`gmm.modal.ability_check.message.${skill ? "skill" : "no_skill"}.disadvantage`, {
					ability: game.i18n.format(`gmm.common.ability.${ability}.name`),
					skill: game.i18n.format(`gmm.common.skill.${skill}`)
				}));
				break;
			default: 
				rollParts.push("1d20");
				messageParts.push(game.i18n.format(`gmm.modal.ability_check.message.${skill ? "skill" : "no_skill"}.plain`, {
					ability: game.i18n.format(`gmm.common.ability.${ability}.name`),
					skill: game.i18n.format(`gmm.common.skill.${skill}`)
				}));
				break;
		}
		rollParts.push(abilityBonus);
		rollParts.push(skillBonus);
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

export default ModalAbilityCheck;