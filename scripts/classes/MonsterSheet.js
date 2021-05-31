import { GMM_5E_ABILITIES } from "../consts/Gmm5eAbilities.js";
import { GMM_5E_ALIGNMENTS } from "../consts/Gmm5eAlignments.js";
import { GMM_5E_CATEGORIES } from "../consts/Gmm5eCategories.js";
import { GMM_5E_CONDITIONS } from "../consts/Gmm5eConditions.js";
import { GMM_5E_DAMAGE_TYPES } from "../consts/Gmm5eDamageTypes.js";
import { GMM_5E_LANGUAGES } from "../consts/Gmm5eLanguages.js";
import { GMM_5E_SIZES } from "../consts/Gmm5eSizes.js";
import { GMM_5E_SKILLS } from "../consts/Gmm5eSkills.js";
import { GMM_5E_UNITS } from "../consts/Gmm5eUnits.js";
import { GMM_GUI_COLORS } from "../consts/GmmGuiColors.js";
import { GMM_GUI_LAYOUTS } from "../consts/GmmGuiLayouts.js";
import { GMM_GUI_SKINS } from "../consts/GmmGuiSkins.js";
import { GMM_MONSTER_RANKS } from "../consts/GmmMonsterRanks.js";
import { GMM_MONSTER_ROLES } from "../consts/GmmMonsterRoles.js";
import Gui from "./Gui.js";
import ModalAbilityCheck from "../modals/ModalAbilityCheck.js";
import ModalBasicAttackAc from "../modals/ModalBasicAttackAc.js";
import ModalBasicAttackSave from "../modals/ModalBasicAttackSave.js";
import ModalBasicDamage from "../modals/ModalBasicDamage.js";
import ModalSavingThrow from "../modals/ModalSavingThrow.js";
import MonsterBlueprint from "./MonsterBlueprint.js";

export default class MonsterSheet extends ActorSheet {

	constructor(...args) {
		super(...args);

		this._gui = new Gui();
	}

	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["gmm-window window--monster"],
				height: 900,
				width: 540,
				template: 'modules/giffyglyphs-5e-monster-maker/templates/monster/forge.html',
				resizable: true
			}
		);
	}

	activateListeners($el) {
		try {
			super.activateListeners($el);
		} catch (e) {
			console.log(e);
		}
		try {
			this._gui.activateListeners($el);
			this._gui.applyTo($el);
			$el.find('.ability-ranking .move-up, .ability-ranking .move-down').click(this._updateAbilityRanking.bind(this));
			$el.find('.save-ranking .move-up, .save-ranking .move-down').click(this._updateSaveRanking.bind(this));
			$el.find('[data-action="edit-item"]').click(this._editItem.bind(this));
			$el.find('[data-action="delete-item"]').click(this._deleteItem.bind(this));
			$el.find('[data-action="add-item"]').click(this._addItem.bind(this));
			$el.find('[data-action="roll-item"]').click(this._rollItem.bind(this));
			$el.find('[data-action="recharge-item"]').click(this._rechargeItem.bind(this));
			$el.find('[data-action="update-item"]').change((e) => this._updateItem(e));

			[ModalAbilityCheck, ModalBasicAttackAc, ModalBasicAttackSave, ModalBasicDamage, ModalSavingThrow].forEach((x) => {
				x.activateListeners($el, this.actor, this.id)
			});
		} catch (e) {
			console.log(e);
		}
	}

	getData() {
		const data = super.getData();

		data.gmm = {
			blueprint: data.actor.data.gmm?.blueprint ? data.actor.data.gmm.blueprint.data : null,
			monster: data.actor.data.gmm?.monster ? data.actor.data.gmm.monster.data : null,
			gui: this._gui,
			enums: {
				abilities: GMM_5E_ABILITIES,
				alignments: GMM_5E_ALIGNMENTS,
				categories: GMM_5E_CATEGORIES,
				conditions: GMM_5E_CONDITIONS,
				damage_types: GMM_5E_DAMAGE_TYPES,
				colors: GMM_GUI_COLORS,
				skins: GMM_GUI_SKINS,
				languages: GMM_5E_LANGUAGES,
				sizes: GMM_5E_SIZES.map((x) => x.name),
				skills: GMM_5E_SKILLS.map((x) => x.name),
				ranks: Object.keys(GMM_MONSTER_RANKS),
				roles: Object.keys(GMM_MONSTER_ROLES),
				units: GMM_5E_UNITS.map((x) => x.name),
				layouts: GMM_GUI_LAYOUTS
			}
		};

		if (data.gmm.blueprint) {
			
			// Set total number of spells.
			if (data.gmm.blueprint.spellbook.spells) {
				data.gmm.blueprint.spellbook.total = Object.entries(data.gmm.blueprint.spellbook.spells).reduce((a, b) => a + b[1].length, 0);
			}
		}

		if (data.gmm.monster) {

			// Beautify monster item data.
			["bonus_actions.items", "actions.items", "reactions.items", "lair_actions.items", "legendary_actions.items", "traits.items", "inventory.items", "spellbook.spells.0", "spellbook.spells.1", "spellbook.spells.2", "spellbook.spells.3", "spellbook.spells.4", "spellbook.spells.5", "spellbook.spells.6", "spellbook.spells.7", "spellbook.spells.8", "spellbook.spells.9", "spellbook.spells.other"].forEach((x) => {
				let items = getProperty(data.gmm.monster, x);
				if (items) {
					setProperty(data.gmm.monster, x, items.map((y) => {
						let item = this.actor.getOwnedItem(y.id);
						item.gmmLabels = item.getGmmLabels();
						return item;
					}));
				}
			});

			// Set maximum active spell level
			let maximum_spell_level = 0;
			for (let i = 1; i < 10; i++) {
				if (data.gmm.monster.spellbook.spells[i].length > 0 || data.gmm.monster.spellbook.slots[i].maximum > 0) {
					maximum_spell_level = i;
				}
			}
			if (data.gmm.monster.spellbook.slots.pact.maximum > 0) {
				maximum_spell_level = Math.max(maximum_spell_level, data.gmm.monster.spellbook.slots.pact.level);
			}
			data.gmm.monster.spellbook.maximum_visible_spell_level = maximum_spell_level;

			// Show/hide features panel
			["bonus_actions", "actions", "reactions", "traits", "paragon_actions", "legendary_actions", "lair_actions", "legendary_resistances"].forEach((x) => {
				if (data.gmm.monster[x].visible) {
					if (data.gmm.monster.features) {
						data.gmm.monster.features.visible = true;
					} else {
						data.gmm.monster.features = {
							visible: true
						};
					}
				}
			});
		}

		return data;
	}

	async _onDropItemCreate(itemData) {
		if ( itemData.data ) {
			["attunement", "equipped", "proficient", "prepared"].forEach((x) => delete itemData.data[x]);
		}
		return super._onDropItemCreate(itemData);
	}

	_getItemTags(item) {
		return item.getChatData({secrets: this.actor.owner});
	}

	_updateItem(event) {
		const input = event.currentTarget.closest("input");
		const field = input.dataset.field;
		const target = input.dataset.target;
		const value = event.currentTarget.value;
		return this.actor.updateEmbeddedEntity("OwnedItem", { _id: target, [field] : value});
	}

	_rechargeItem(event) {
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getOwnedItem(li.dataset.itemId);
		return item.rollRecharge();
	}

	_rollItem(event) {
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getOwnedItem(li.dataset.itemId);
		return item.roll();
	}

	_editItem(event) {
		const li = event.currentTarget.closest(".item");
		const item = this.actor.getOwnedItem(li.dataset.itemId);
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

	_updateAbilityRanking(event) {
		const rankings = [];
		event.currentTarget.closest(".accordion-section__body").querySelectorAll("[name='gmm.blueprint.ability_modifiers.ranking']").forEach(x => rankings.push(x.value));
		this._updateObject(event, {
			[`gmm.blueprint.ability_modifiers.ranking`]: rankings
		});
	}

	_updateSaveRanking(event) {
		const rankings = [];
		event.currentTarget.closest(".accordion-section__body").querySelectorAll("[name='gmm.blueprint.saving_throws.ranking']").forEach(x => rankings.push(x.value));
		this._updateObject(event, {
			[`gmm.blueprint.saving_throws.ranking`]: rankings
		});
	}

	_onSortItem(event, itemData) {
		// TODO - for now, don't allow sorting for Token Actor overrides
		if (this.actor.isToken) {
			return;
		}
		// Get the drag source and its siblings
		const source = this.actor.getOwnedItem(itemData._id);
		const siblings = this.actor.items.filter((i) => {
			return (i.getSortingCategory() === source.getSortingCategory()) && (i.data._id !== source.data._id);
		});
		// Get the drop target
		const dropTarget = event.target.closest(".item");
		const targetId = dropTarget ? dropTarget.dataset.itemId : null;
		const target = siblings.find(s => s.data._id === targetId);
		// Ensure we are only sorting like-types
		if (target && (target.getSortingCategory() !== source.getSortingCategory())) {
			return;
		}
		// Perform the sort
		const sortUpdates = SortingHelpers.performIntegerSort(source, {target: target, siblings});
		const updateData = sortUpdates.map(u => {
			const update = u.update;
			update._id = u.target.data._id;
			return update;
		});
		// Perform the update
		return this.actor.updateEmbeddedEntity("OwnedItem", updateData);
	}

 	_updateObject(event, form) {
		if (event && event.currentTarget && event.currentTarget.closest(".gmm-modal") != null) {
			return null;
		}

		if (event && event.currentTarget) {
			this._gui.updateFrom(event.currentTarget.closest(".gmm-window"));
		}

		let formData = {
			data: {
				gmm: {
					blueprint: {
						vid: 1,
						type: "monster",
						data: expandObject(form).gmm.blueprint
					}
				}
			}
		};

		if (event && event.currentTarget) {
			switch (event.currentTarget.name) {
				case "gmm.blueprint.combat.rank.type":
					formData.data.gmm.blueprint.data.combat.rank.custom_name = null;
					formData.data.gmm.blueprint.data.combat.rank.modifiers = GMM_MONSTER_RANKS[event.currentTarget.value];
					break;
				case "gmm.blueprint.combat.role.type":
					formData.data.gmm.blueprint.data.combat.role.custom_name = null;
					formData.data.gmm.blueprint.data.combat.role.modifiers = GMM_MONSTER_ROLES[event.currentTarget.value];
					break;
			}
		}

		
		$.extend(true, formData, MonsterBlueprint.getActorDataFromBlueprint(formData.data.gmm.blueprint));

		return this.entity.update(formData);
	}
}
