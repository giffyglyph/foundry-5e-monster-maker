import Shortcoder from '../classes/Shortcoder.js';
import RollFormula from '../classes/RollFormula.js';
import CompatibilityHelpers from '../classes/CompatibilityHelpers.js';

const ModalAbilityCheck = (function() {

	function activateListeners(html, actor) {
		const ctx = { actor };
		html.find('#modal_ability_check .modal__footer button').click(_submitForm.bind(ctx));
		html.find('.monster__modifier .value button, .monster__skill').click(_setAbilityAndSkill.bind(ctx));
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
		const form = CompatibilityHelpers.readInputs(modal.querySelector(".modal__form"));
		const ability = form.get("ability");
		const skill = form.get("skill");
		const abilityBonus = ability ? Number(form.get(`ability_${ability}`)) : 0;
		const skillBonus = skill ? Number(form.get(`skill_${skill}`)) : 0;
		// Kept out of the ability bonus so the rolled formula accounts for itself.
		const checkBonus = ability ? Number(form.get(`check_${ability}`)) : 0;

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
		if (checkBonus) rollParts.push(checkBonus);
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

export default ModalAbilityCheck;