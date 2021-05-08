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

	activateListeners($el) {
		super.activateListeners($el);
		this._gui.activateListeners($el);
		this._gui.applyTo($el);
		$el.find('.ability-ranking .move-up, .ability-ranking .move-down').click(this._updateAbilityRanking.bind(this));
		$el.find('.save-ranking .move-up, .save-ranking .move-down').click(this._updateSaveRanking.bind(this));
		$el.find('[data-action="edit-item"]').click(this._editItem.bind(this));
		$el.find('[data-action="delete-item"]').click(this._deleteItem.bind(this));
		$el.find('[data-action="add-item"]').click(this._addItem.bind(this));
		$el.find('.item .item__title').click(this._toggleItemDetails.bind(this));
		$el.find('[data-action="roll-item"]').click(this._rollItem.bind(this));

		[ModalAbilityCheck, ModalBasicAttackAc, ModalBasicAttackSave, ModalBasicDamage, ModalSavingThrow].forEach((x) => {
			x.activateListeners($el, this.actor, this.id)
		});
	}

	getData() {
		const data = super.getData();

		// Pass enums to sheet
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
		if (data.data.gg5e_mm) {
			 data.data.gg5e_mm.enums = enums;
		} else {
			data.data.gg5e_mm = {
				enums: enums
			};
		}

		// Get legacy item details
		let legacy_items = {
			attacks: [],
			actions: [],
			features: [],
			inventory: [],
			spells: {
				total_spells: 0,
				level_0: [],
				level_1: [],
				level_2: [],
				level_3: [],
				level_4: [],
				level_5: [],
				level_6: [],
				level_7: [],
				level_8: [],
				level_9: []
			}
		};
		data.items.forEach((x) => {
			switch (x.type) {
				case "spell":
					let spell = this._renderItem(x, "spell");
					legacy_items.spells[`level_${spell.spell_level}`].push(spell);
					legacy_items.spells.total_spells++;
					break;
				case "weapon":
					legacy_items.attacks.push(this._renderItem(x, "attack"));
					break;
				case "feat":
					if (x.data.activation.type) {
						legacy_items.actions.push(this._renderItem(x, "action"));
					} else {
			  			legacy_items.features.push(this._renderItem(x, "feature"));
					}
					break;
				default:
					legacy_items.inventory.push(this._renderItem(x, "inventory"));
					break;
			}
		});
		data.data.gg5e_mm.monster.data.legacy_items = legacy_items;

		// Create legacy view parameters
		["attacks", "actions", "features", "inventory"].forEach((x) => {
			if (legacy_items[x] && legacy_items[x].length > 0) {
				data.data.gg5e_mm.monster.data.show_legacy = true;
			}
		});
		if (legacy_items.spells.total_spells > 0) {
			data.data.gg5e_mm.monster.data.show_legacy = true;
		}
		return data;
	}

	async _onDropItemCreate(itemData) {
		if ( itemData.data ) {
			["attunement", "equipped", "proficient", "prepared"].forEach((x) => delete itemData.data[x]);
		}
		return super._onDropItemCreate(itemData);
	}

	_renderItem(item, type) {
		let properties = this.actor.getOwnedItem(item._id).getChatData({secrets: this.actor.owner});
		let data = {
			id: item._id,
			name: item.name,
			img: item.img,
			description: properties.description.value,
			tags: properties.properties
		};
		switch (type) {
			case "spell":
				data.spell_level = item.data.level || 0
				break;
		}
		return data;
	}

	_getItemTags(item) {
		return item.getChatData({secrets: this.actor.owner});
	}

	_rollItem(event) {
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getOwnedItem(li.dataset.itemId);
		return item.roll();
	}

	_editItem(event) {
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getOwnedItem(li.dataset.itemId);
		console.log(li, item);
		item.sheet.render(true);
	}

	_deleteItem(event) {
		const li = event.currentTarget.closest(".item");
		this.actor.deleteOwnedItem(li.dataset.itemId);
	}

	_addItem(event) {
		const header = event.currentTarget;
		const type = header.dataset.type;
		const itemData = {
			name: game.i18n.format("DND5E.ItemNew", {type: type.capitalize()}),
			type: type,
			data: duplicate(header.dataset)
		};
		delete itemData.data["type"];
		return this.actor.createEmbeddedEntity("OwnedItem", itemData);
	}

	_toggleItemDetails(event) {
		const item = event.currentTarget.closest(".item");
		$(item.querySelector(".item__detail")).slideToggle("fast");
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
