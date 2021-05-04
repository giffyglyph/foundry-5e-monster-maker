import Blueprint from "../classes/Blueprint.js";
import Factory from "../classes/Factory.js";
import Gui from "../classes/Gui.js";
import ModalAbilityCheck from "../modals/ModalAbilityCheck.js";
import ModalBasicAttackAc from "../modals/ModalBasicAttackAc.js";
import ModalBasicAttackSave from "../modals/ModalBasicAttackSave.js";
import ModalBasicDamage from "../modals/ModalBasicDamage.js";
import ModalSavingThrow from "../modals/ModalSavingThrow.js";
import MonsterBlueprint from "../classes/MonsterBlueprint.js";
import { DEFAULT_ABILITIES } from "../consts/DefaultAbilities.js";
import { DEFAULT_ALIGNMENTS } from "../consts/DefaultAlignments.js";
import { DEFAULT_CATEGORIES } from "../consts/DefaultCategories.js";
import { DEFAULT_COLORS } from "../consts/DefaultColors.js";
import { DEFAULT_CONDITIONS } from "../consts/DefaultConditions.js";
import { DEFAULT_DAMAGE_TYPES } from "../consts/DefaultDamageTypes.js";
import { DEFAULT_LANGUAGES } from "../consts/DefaultLanguages.js";
import { DEFAULT_SIZES } from "../consts/DefaultSizes.js";
import { DEFAULT_SKILLS } from "../consts/DefaultSkills.js";
import { DEFAULT_SKINS } from "../consts/DefaultSkins.js";
import { DEFAULT_UNITS } from "../consts/DefaultUnits.js";
import { DEFAULT_RANKS } from "../consts/DefaultRanks.js";
import { DEFAULT_ROLES } from "../consts/DefaultRoles.js";

export default class ActorSheetMonster extends ActorSheet {

	constructor(...args) {
		super(...args);

		// Prepare gui/blueprint/monster data
		this._gui = new Gui();
		let blueprint = Blueprint.prepareBlueprint(
			"monster",
			this.actor.data.data.gg5e_mm ? this.actor.data.data.gg5e_mm.blueprint : null,
			MonsterBlueprint.getBlueprintFromActor(this.actor.data)
		);
		let form = {
			data: {
				gg5e_mm: {
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
			colors: DEFAULT_COLORS,
			skins: DEFAULT_SKINS,
			languages: DEFAULT_LANGUAGES,
			sizes: DEFAULT_SIZES.map((x) => x.name),
			skills: DEFAULT_SKILLS.map((x) => x.name),
			ranks: Object.keys(DEFAULT_RANKS),
			roles: Object.keys(DEFAULT_ROLES),
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

		let monster = data.data.gg5e_mm.monster.data;
		if (monster.skills || monster.speeds || monster.damage_vulnerabilities || monster.damage_resistances || monster.damage_vulnerabilities || monster.condition_immunities || monster.senses || monster.languages) {
			data.data.gg5e_mm.monster.data.show_properties = true;
		}

		return data;
	}

	activateListeners($el) {
		super.activateListeners($el);
		this._gui.activateListeners($el);
		this._gui.applyTo($el);
		$el.find('.ability-ranking .move-up, .ability-ranking .move-down').click(this._updateAbilityRanking.bind(this));
		$el.find('.save-ranking .move-up, .save-ranking .move-down').click(this._updateSaveRanking.bind(this));

		[ModalAbilityCheck, ModalBasicAttackAc, ModalBasicAttackSave, ModalBasicDamage, ModalSavingThrow].forEach((x) => {
			x.activateListeners($el, this.actor, this.id)
		});
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

 	_updateObject(event, form) {
		if (event && event.currentTarget && event.currentTarget.closest(".gg5e-mm-modal") != null) {
			return null;
		}

		if (event && event.currentTarget) {
			this._gui.updateFrom(event.currentTarget.closest(".gg5e-mm-window"));
		}

		if (event && event.currentTarget) {
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
												modifiers: DEFAULT_RANKS[event.currentTarget.value]
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
												modifiers: DEFAULT_ROLES[event.currentTarget.value]
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

		$.extend(true, form, MonsterBlueprint.getActorFromBlueprint(form));

		super._updateObject(event, form);
	}
}
