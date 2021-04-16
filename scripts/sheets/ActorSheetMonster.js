import Blueprint from "../classes/Blueprint.js";
import Gui from "../classes/Gui.js";
import Factory from "../classes/Factory.js";
import { DEFAULT_ABILITIES } from "../consts/DefaultAbilities.js";
import { DEFAULT_ALIGNMENTS } from "../consts/DefaultAlignments.js";
import { DEFAULT_CATEGORIES } from "../consts/DefaultCategories.js";
import { DEFAULT_CONDITIONS } from "../consts/DefaultConditions.js";
import { DEFAULT_DAMAGE_TYPES } from "../consts/DefaultDamageTypes.js";
import { DEFAULT_LANGUAGES } from "../consts/DefaultLanguages.js";
import { DEFAULT_SIZES } from "../consts/DefaultSizes.js";
import { DEFAULT_SKILLS } from "../consts/DefaultSkills.js";
import { MONSTER_RANKS } from "../consts/MonsterRanks.js";
import { MONSTER_ROLES } from "../consts/MonsterRoles.js";

export default class ActorSheetMonster extends ActorSheet {

	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["gg5e-mm-window gg5e-mm-window--monster"],
				height: 900,
				width: 540,
				template: 'modules/giffyglyphs-5e-monster-maker/templates/sheets/monster.html',
				resizable: true
			}
		);
	}

	getData() {
		const data = super.getData();

		// Prepare essential monster/gui data
		let gui = Gui.prepareGui(this._getDefaultGui(), data.data.gg5e_mm ? data.data.gg5e_mm.gui : null);
		let blueprint = Blueprint.prepareBlueprint(
			"monster",
			data.data.gg5e_mm ? data.data.gg5e_mm.blueprint : null,
			this._getActorData(data.actor)
		);
		let monster = Factory.createEntity(blueprint);
		let enums = {
			abilities: DEFAULT_ABILITIES,
			alignments: DEFAULT_ALIGNMENTS,
			categories: DEFAULT_CATEGORIES,
			conditions: DEFAULT_CONDITIONS,
			damage_types: DEFAULT_DAMAGE_TYPES,
			languages: DEFAULT_LANGUAGES,
			sizes: DEFAULT_SIZES,
			skills: DEFAULT_SKILLS.map((x) => x.name),
			ranks: Object.keys(MONSTER_RANKS),
			roles: Object.keys(MONSTER_ROLES)
		};

		// Pass monster/gui data to sheet
		data.data.gg5e_mm = {
			enums: enums,
			gui: gui,
			blueprint: blueprint,
			monster: monster
		};

		return data;
	}

	activateListeners(html) {
		super.activateListeners(html);
		Gui.activateListeners(html);
		html.find('.toggle-mode--edit').click(this._toggleModeEdit.bind(this));
		html.find('.ability-ranking .move-up, .ability-ranking .move-down').click(this._updateAbilityRanking.bind(this));
		html.find('.save-ranking .move-up, .save-ranking .move-down').click(this._updateSaveRanking.bind(this));
		html.find('#modal_basic_attack .modal__footer button').click(this._rollBasicAttack.bind(this));
		html.find('#modal_basic_random_damage .modal__footer button, #modal_basic_static_damage .modal__footer button').click(this._rollBasicDamage.bind(this));

		let guiData = this.object.data.data.gg5e_mm ? this.object.data.data.gg5e_mm.gui : Gui.prepareGui(this._getDefaultGui());
		Gui.setAccordions(html, guiData.data.accordions);
		Gui.setPanels(html, guiData.data.panels);
		Gui.setScrollbars(html, guiData.data.scrollbars);
	}

	_getActorData(actor) {
		return {
			data: {
				description: {
					name: actor.name,
					image: actor.img
				}
			}
		}
	}

	_updateAbilityRanking(event) {
		const rankings = [];
		event.currentTarget.closest(".accordion-section__body").querySelectorAll("[name='data.gg5e_mm.blueprint.data.ability_modifiers.ranking']").forEach(x => rankings.push(x.value));
		this._updateObject(event, {
			[`data.gg5e_mm.blueprint.data.ability_modifiers.ranking`]: rankings
		});
	}

	_updateSaveRanking(event) {
		const rankings = [];
		event.currentTarget.closest(".accordion-section__body").querySelectorAll("[name='data.gg5e_mm.blueprint.data.saving_throws.ranking']").forEach(x => rankings.push(x.value));
		this._updateObject(event, {
			[`data.gg5e_mm.blueprint.data.saving_throws.ranking`]: rankings
		});
	}

	_toggleModeEdit(event) {
		const li = event.currentTarget.closest(".gg5e-mm-window");
		li.classList.toggle("expanded");
	}

	_getDefaultGui() {
		return {
			data: {
				accordions: {
					accordion_builder: 0
				},
				panels: {
					panel_abilities: "opened"
				},
				scrollbars: {
					monster_body: {
						x: 0,
						y: 0
					},
					options_body: {
						x: 0,
						y: 0
					}
				}
			}
		}
	}

	_makeARoll(event, message) {
		const li = event.currentTarget.closest("button");
		const modal = event.currentTarget.closest(".modal");
		const advantage = li.dataset.action;
		const modifier = modal.querySelector("[name='modifier']").value;
		const bonus = modal.querySelector("[name='bonus']").value;
		const mode = modal.querySelector("[name='mode']").value;

		try {
			const rollParts = [];
			const messageParts = [message];
			switch (advantage) {
				case "roll-advantage":
					rollParts.push("2d20kh");
					messageParts.push("(advantage)");
					break;
				case "roll-disadvantage":
					rollParts.push("2d20kl");
					messageParts.push("(disadvantage)");
					break;
				default: 
					rollParts.push("1d20");
					break;
			}
			rollParts.push(modifier);
			if (bonus) {
				rollParts.push(bonus);
			}
			const roll = new Roll(rollParts.join(" + ")).roll();
			roll.toMessage({
				speaker: ChatMessage.getSpeaker({actor: this.actor}),
				flavor: messageParts.join(" "),
				messageData: {"flags.dnd5e.roll": {type: "other", itemId: this.id }},
				rollMode: mode
			});
		} catch(err) {
			console.log(err);
			return;
		}

		Gui.closeModal(event);
	}

	_rollBasicAttack(event) {
		this._makeARoll(event, "Attack vs AC");
	}

	_rollBasicDamage(event) {
		const li = event.currentTarget.closest("button");
		const modal = event.currentTarget.closest(".modal");
		const critical = li.dataset.action;
		const modifier = modal.querySelector("[name='modifier']").value;
		const bonus = modal.querySelector("[name='bonus']").value;
		const mode = modal.querySelector("[name='mode']").value;

		try {
			const rollParts = [];
			const messageParts = ["Damage"];
			switch (critical) {
				case "roll-critical":
					rollParts.push(modifier);
					messageParts.push("(critical)");
					break;
			}
			rollParts.push(modifier);
			if (bonus) {
				rollParts.push(bonus);
			}
			const roll = new Roll(rollParts.join(" + ")).roll();
			roll.toMessage({
				speaker: ChatMessage.getSpeaker({actor: this.actor}),
				flavor: messageParts.join(" "),
				messageData: {"flags.dnd5e.roll": {type: "other", itemId: this.id }},
				rollMode: mode
			});
		} catch(err) {
			console.log(err);
			return;
		}

		Gui.closeModal(event);
	}

  	_updateObject(event, form) {
		if (event.currentTarget) {
			let window = event.currentTarget.closest(".gg5e-mm-window");
			form["data.gg5e_mm.gui.data.scrollbars.monster_body.y"] = window.querySelector("#monster-body").scrollTop;
			form["data.gg5e_mm.gui.data.scrollbars.options_body.y"] = window.querySelector("#options-body").scrollTop;
		}

		if (form["data.gg5e_mm.blueprint.data.saving_throws.method"] && form["data.gg5e_mm.blueprint.data.saving_throws.method"] === "sync") {
			form["data.gg5e_mm.blueprint.data.saving_throws.ranking"] = form["data.gg5e_mm.blueprint.data.ability_modifiers.ranking"];
		}

		if (form["data.gg5e_mm.blueprint.data.description.name"]) {
			form["name"] = form["data.gg5e_mm.blueprint.data.description.name"];
		}

		if (form["data.gg5e_mm.blueprint.data.description.image"]) {
			form["img"] = form["data.gg5e_mm.blueprint.data.description.image"];
		}

		if (event.currentTarget && event.currentTarget.name) {
			switch (event.currentTarget.name) {
				case "data.gg5e_mm.blueprint.data.combat.rank.type":
					for (const key in form) {
						if (/\.rank\.modifiers/.test(key)) delete form[key];
					}
					form["data.gg5e_mm.blueprint.data.combat.rank.custom_name"] = null;
					form["data.gg5e_mm.blueprint.data.combat.rank.modifiers"] = null;
					break;
				case "data.gg5e_mm.blueprint.data.combat.role.type":
					for (const key in form) {
						if (/\.role\.modifiers/.test(key)) delete form[key];
					}
					form["data.gg5e_mm.blueprint.data.combat.role.custom_name"] = null;
					form["data.gg5e_mm.blueprint.data.combat.role.modifiers"] = null;
					break;
			}
		}

		super._updateObject(event, form);
	}
}
