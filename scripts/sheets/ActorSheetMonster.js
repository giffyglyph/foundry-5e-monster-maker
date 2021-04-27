import Blueprint from "../classes/Blueprint.js";
import Factory from "../classes/Factory.js";
import Gui from "../classes/Gui.js";
import ModalAbilityCheck from "../modals/ModalAbilityCheck.js";
import ModalBasicAttackAc from "../modals/ModalBasicAttackAc.js";
import ModalBasicAttackSave from "../modals/ModalBasicAttackSave.js";
import ModalBasicDamage from "../modals/ModalBasicDamage.js";
import ModalSavingThrow from "../modals/ModalSavingThrow.js";
import { DEFAULT_ABILITIES } from "../consts/DefaultAbilities.js";
import { DEFAULT_ALIGNMENTS } from "../consts/DefaultAlignments.js";
import { DEFAULT_CATEGORIES } from "../consts/DefaultCategories.js";
import { DEFAULT_CONDITIONS } from "../consts/DefaultConditions.js";
import { DEFAULT_DAMAGE_TYPES } from "../consts/DefaultDamageTypes.js";
import { DEFAULT_LANGUAGES } from "../consts/DefaultLanguages.js";
import { DEFAULT_SIZES } from "../consts/DefaultSizes.js";
import { DEFAULT_SKILLS } from "../consts/DefaultSkills.js";
import { DEFAULT_UNITS } from "../consts/DefaultUnits.js";
import { MONSTER_RANKS } from "../consts/MonsterRanks.js";
import { MONSTER_ROLES } from "../consts/MonsterRoles.js";
import MonsterBlueprint from "../classes/MonsterBlueprint.js";

export default class ActorSheetMonster extends ActorSheet {

	constructor(...args) {
		super(...args);

		// Prepare gui/blueprint/monster data
		let gui = Gui.prepareGui(this._getDefaultGui(), this.actor.data.data.gg5e_mm ? this.actor.data.data.gg5e_mm.gui : null);
		let blueprint = Blueprint.prepareBlueprint(
			"monster",
			this.actor.data.data.gg5e_mm ? this.actor.data.data.gg5e_mm.blueprint : null,
			MonsterBlueprint.extractBlueprintFromActor(this.actor.data)
		);
		let form = {
			data: {
				gg5e_mm: {
					gui: gui,
					blueprint: blueprint
				}
			}
		};

		this._updateObject(null, flattenObject(form));
	}

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

		let enums = {
			abilities: DEFAULT_ABILITIES,
			alignments: DEFAULT_ALIGNMENTS,
			categories: DEFAULT_CATEGORIES,
			conditions: DEFAULT_CONDITIONS,
			damage_types: DEFAULT_DAMAGE_TYPES,
			languages: DEFAULT_LANGUAGES,
			sizes: DEFAULT_SIZES.map((x) => x.name),
			skills: DEFAULT_SKILLS.map((x) => x.name),
			ranks: Object.keys(MONSTER_RANKS),
			roles: Object.keys(MONSTER_ROLES),
			units: DEFAULT_UNITS.map((x) => x.name)
		};

		// Pass enums to sheet
		if (data.data.gg5e_mm) {
			 data.data.gg5e_mm.enums = enums;
		} else {
			data.data.gg5e_mm = {
				enums: enums
			};
		}

		return data;
	}

	activateListeners(html) {
		super.activateListeners(html);
		Gui.activateListeners(html);
		html.find('.toggle-mode--edit').click(this._toggleModeEdit.bind(this));
		html.find('.ability-ranking .move-up, .ability-ranking .move-down').click(this._updateAbilityRanking.bind(this));
		html.find('.save-ranking .move-up, .save-ranking .move-down').click(this._updateSaveRanking.bind(this));
		html.find('.input--thp, .input--hp, .paragon--current, .legendary--current').change(this._updateConfigurationField.bind(this));
		html.find('.options__close-all').click(this._closeAccordion.bind(this));

		[ModalAbilityCheck, ModalBasicAttackAc, ModalBasicAttackSave, ModalBasicDamage, ModalSavingThrow].forEach((x) => {
			x.activateListeners(html, this.actor, this.id)
		});

		let guiData = this.object.data.data.gg5e_mm ? this.object.data.data.gg5e_mm.gui : Gui.prepareGui(this._getDefaultGui());
		Gui.setAccordions(html, guiData.data.accordions);
		Gui.setPanels(html, guiData.data.panels);
		Gui.setScrollbars(html, guiData.data.scrollbars);
	}

	_closeAccordion(event) {
		const input = event.currentTarget.closest(".gg5e-mm-monster-options").querySelector('input[name="data.gg5e_mm.gui.data.accordions.accordion_builder"]');
		$(input).val("").trigger("change");
	}

	_updateConfigurationField(event) {
		const input = event.currentTarget.closest("input");
		const field = input.dataset.field;
		const type = input.dataset.type ? input.dataset.type : "text";
		const output = event.currentTarget.closest(".gg5e-mm-window").querySelector(`input[name='${field}']`);

		switch (type) {
			case "number":
				const value = event.currentTarget.value;
				if (["+", "-"].includes(value[0])) {
					output.value = Number(output.value) + parseFloat(value);
				} else if (value[0] === "=") {
					output.value = Number(value.slice(1));
				} else {
					output.value = Number(event.currentTarget.value);
				}
				break;
			default:
				output.value = event.currentTarget.value;
				break;
		}

		output.dispatchEvent(new Event('change'));
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
					accordion_builder: ""
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

  	_updateObject(event, form) {
		if (event && event.currentTarget && event.currentTarget.closest(".gg5e-mm-modal") != null) {
			return null;
		}

		if (event && event.currentTarget) {
			let window = event.currentTarget.closest(".gg5e-mm-window");
			form["data.gg5e_mm.gui.data.scrollbars.monster_body.y"] = window.querySelector("#monster-body").scrollTop;
			form["data.gg5e_mm.gui.data.scrollbars.options_body.y"] = window.querySelector("#options-body").scrollTop;

			if (event.currentTarget.name) {
				switch (event.currentTarget.name) {
					case "data.gg5e_mm.blueprint.data.combat.rank.type":
						form["data.gg5e_mm.blueprint.data.combat.rank.custom_name"] = null;
						form = $.extend(true, form, flattenObject({
							data: {
								gg5e_mm: {
									blueprint: {
										data: {
											combat: {
												rank: {
													modifiers: MONSTER_RANKS[event.currentTarget.value]
												}
											}
										}
									}
								}
							}
						}));
						break;
					case "data.gg5e_mm.blueprint.data.combat.role.type":
						form["data.gg5e_mm.blueprint.data.combat.role.custom_name"] = null;
						form = $.extend(true, form, flattenObject({
							data: {
								gg5e_mm: {
									blueprint: {
										data: {
											combat: {
												role: {
													modifiers: MONSTER_ROLES[event.currentTarget.value]
												}
											}
										}
									}
								}
							}
						}));
						break;
				}
			}
		}

		if (typeof form["data.gg5e_mm.blueprint.data.saving_throws.method"] !== "undefined") {
			if (form["data.gg5e_mm.blueprint.data.saving_throws.method"] === "sync") {
				form["data.gg5e_mm.blueprint.data.saving_throws.ranking"] = form["data.gg5e_mm.blueprint.data.ability_modifiers.ranking"];
			}
		}

		let expandedForm = expandObject(form);
		if (typeof expandedForm.data.gg5e_mm.blueprint !== "undefined") {
			let blueprint = Blueprint.prepareBlueprint(
				"monster",
				this.actor.data.data.gg5e_mm ? this.actor.data.data.gg5e_mm.blueprint : {},
				expandedForm.data.gg5e_mm.blueprint
			);
			let monster = Factory.createEntity(blueprint);
			let actorInit = this.actor.data.data.attributes.init;
			let monsterData = {
				data: {
					gg5e_mm: {
						monster: monster
					},
					attributes: {
						ac: {
							value: monster.data.armor_class.value
						},
						hp: {
							max: monster.data.hit_points.maximum.value,
							formula: ""
						},
						init: {
							value: monster.data.initiative.value - (actorInit.mod + actorInit.prof + (actorInit.bonus - actorInit.value))
						}
					}
				}
			};
			form = $.extend(true, form, flattenObject(monsterData));
		}

		$.extend(true, form, MonsterBlueprint.convertBlueprintToActor(form));

		super._updateObject(event, form);
	}
}
