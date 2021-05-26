import { simplifyRollFormula, damageRoll } from "./../../../../systems/dnd5e/module/dice.js";
import ActionBlueprint from './ActionBlueprint.js';
import ActionForge from './ActionForge.js';

/**
 * A patcher which controls item data based on the selected sheet.
 */
const GmmItem = (function () {

	/**
	 * Patch the Foundry Item5e entity to control how data is prepared based on the active sheet.
	 */
	function patchItem5e() {
		game.dnd5e.entities.Item5e.prototype.prepare5eData = game.dnd5e.entities.Item5e.prototype.prepareData;
		game.dnd5e.entities.Item5e.prototype.prepareData = _prepareData;
		game.dnd5e.entities.Item5e.prototype.get5eAttackToHit = game.dnd5e.entities.Item5e.prototype.getAttackToHit;
		game.dnd5e.entities.Item5e.prototype.getAttackToHit = _getAttackToHit;
		game.dnd5e.entities.Item5e.prototype.get5eSaveDC = game.dnd5e.entities.Item5e.prototype.getSaveDC;
		game.dnd5e.entities.Item5e.prototype.getSaveDC = _getSaveDC;
		game.dnd5e.entities.Item5e.prototype.roll5eDamage = game.dnd5e.entities.Item5e.prototype.rollDamage;
		game.dnd5e.entities.Item5e.prototype.rollDamage = _rollDamage;
		game.dnd5e.entities.Item5e.prototype.prepareShortcodes = _prepareShortcodes;
		game.dnd5e.entities.Item5e.prototype.getSheetId = _getItemSheetId;
		Object.defineProperty(game.dnd5e.entities.Item5e.prototype, "hasAttack", {
			get: function () {
				if (this.getSheetId() == "gmm.ActionSheet") {
					return ["melee_attack_weapon", "melee_attack_spell", "ranged_attack_weapon", "ranged_attack_spell"].includes(this.data.data.gmm?.blueprint?.data?.attack?.type);
				} else {
					return ["mwak", "rwak", "msak", "rsak"].includes(this.data.data.actionType);
				}
			}
		});
		Object.defineProperty(game.dnd5e.entities.Item5e.prototype, "hasDamage", {
			get: function () {
				if (this.getSheetId() == "gmm.ActionSheet") {
					return !!(this.data.data.gmm?.blueprint?.data?.attack?.damage?.formula);
				} else {
					return !!(this.data.data.damage && this.data.data.damage.parts.length);
				}
			}
		});
		Object.defineProperty(game.dnd5e.entities.Item5e.prototype, "isHealing", {
			get: function () {
				if (this.getSheetId() == "gmm.ActionSheet") {
					return false;
				} else {
					return (this.data.data.actionType === "heal") && this.data.data.damage.parts.length;
				}
			}
		});
		Object.defineProperty(game.dnd5e.entities.Item5e.prototype, "isVersatile", {
			get: function () {
				if (this.getSheetId() == "gmm.ActionSheet") {
					return false;
				} else {
					return !!(this.hasDamage && this.data.data.damage.versatile);
				}
			}
		});
		Object.defineProperty(game.dnd5e.entities.Item5e.prototype, "hasSave", {
			get: function () {
				if (this.getSheetId() == "gmm.ActionSheet") {
					return ["dc_primary", "dc_secondary"].includes(this.data.data.gmm?.blueprint?.data?.attack?.type);
				} else {
					const save = this.data.data?.save || {};
					return !!(save.ability && save.scaling);
				}
			}
		});
	}

	function _prepareData() {
		game.dnd5e.entities.Item5e.prototype.prepare5eData.call(this);

		if (this.getSheetId() == "gmm.ActionSheet") {
			_prepareActionData(this);
		}
	}

	function _prepareActionData(item) {
		try {
			const itemData = item.data.data;
			const actionBlueprint = ActionBlueprint.createFromItem(item);
			const actionArtifact = ActionForge.createArtifact(actionBlueprint);
			itemData.gmm = {
				blueprint: actionBlueprint,
				action: actionArtifact
			};
		} catch (error) {
			console.error(error);
		}
	}

	function _prepareShortcodes() {
		if (this.getSheetId() == "gmm.ActionSheet" && this.actor !== null && this.actor.getSheetId() == "gmm.MonsterSheet") {
			if (this.actor.data.data.gmm && this.actor.data.data.gmm.monster) {
				let monster = this.actor.data.data.gmm.monster.data;
				if (this.data.data.description && this.data.data.description.value) {
					this.data.data.description.value = this.data.data.description.value.replace(/\[.*?\]/g, (token) => {
						return _applyShortcodes(token, monster);
					});
				}
			}
		}
	}

	function _applyShortcodes(description, monster) {
		const shortCodes = [
			{ code: "level", data: monster.level.value },
			{ code: "attack-bonus", data: monster.attack_bonus.value },
			{ code: "damage", data: monster.damage_per_action.value },
			{ code: "dc-primary-bonus", data: monster.attack_dcs.primary.value },
			{ code: "dc-secondary-bonus", data: monster.attack_dcs.secondary.value },
			{ code: "str-mod", data: monster.ability_modifiers.str.value },
			{ code: "dex-mod", data: monster.ability_modifiers.dex.value },
			{ code: "con-mod", data: monster.ability_modifiers.con.value },
			{ code: "int-mod", data: monster.ability_modifiers.int.value },
			{ code: "wis-mod", data: monster.ability_modifiers.wis.value },
			{ code: "cha-mod", data: monster.ability_modifiers.cha.value },
			{ code: "str-save", data: monster.saving_throws.str.value },
			{ code: "dex-save", data: monster.saving_throws.dex.value },
			{ code: "con-save", data: monster.saving_throws.con.value },
			{ code: "int-save", data: monster.saving_throws.int.value },
			{ code: "wis-save", data: monster.saving_throws.wis.value },
			{ code: "cha-save", data: monster.saving_throws.cha.value },
			{ code: "proficiency", data: monster.proficiency_bonus.value },
			{ code: "xp", data: monster.xp.value },
			{ code: "cr", data: monster.challenge_rating.value },
			{ code: "ac", data: monster.armor_class.value },
			{ code: "hp", data: monster.hit_points.maximum.value }
		]
		shortCodes.forEach((x) => {
			try {
				let regex = new RegExp(`\\b${x.code}\\b`, 'gi');
				description = description.replace(regex, x.data);
			} catch (e) {
				console.error(e);
			}
		});
		try {
			description = description.replace(/\[(.*?)(, *?d(\d+))?\]/g, (token, t1, t2, t3) => _numberToRandom(token, t1, t3));
		} catch (e) {
			console.error(e);
		}

		return description;
	}

	function _numberToRandom(token, value, die) {
		let valueMath = math.evaluate(value);
		if (die != undefined) {
			let scale = (Number(die) + 1) / 2;
			let dice = Math.floor(valueMath / scale);
			let modifier = valueMath - Math.floor(dice * scale);

			if (dice > 0) {
				return dice + "d" + die + ((modifier != 0) ? (" " + ((modifier > 0) ? "+ " : "− ") + Math.abs(modifier)) : "");
			} else {
				return valueMath;
			}
		} else {
			return valueMath;
		}
	}

	function _getAttackToHit() {
		if (this.getSheetId() == "gmm.ActionSheet" && this.actor !== null && this.actor.getSheetId() == "gmm.MonsterSheet") {
			return _getActionAttackToHit(this);
		} else {
			return game.dnd5e.entities.Item5e.prototype.get5eAttackToHit.call(this);
		}
	}

	function _getSaveDC() {
		if (this.getSheetId() == "gmm.ActionSheet" && this.actor !== null && this.actor.getSheetId() == "gmm.MonsterSheet") {
			return _getActionSaveDC(this);
		} else {
			return game.dnd5e.entities.Item5e.prototype.get5eSaveDC.call(this);
		}
	}

	function _rollDamage({critical=false, event=null, spellLevel=null, versatile=false, options={}}={}) {
		if (this.getSheetId() == "gmm.ActionSheet" && this.actor !== null && this.actor.getSheetId() == "gmm.MonsterSheet") {
			return _rollActionDamage({
				item: this,
				critical: critical,
				event: event,
				spellLevel: spellLevel,
				versatile: versatile,
				options: options
			});
		} else {
			return game.dnd5e.entities.Item5e.prototype.roll5eDamage.call(this, {
				critical: critical,
				event: event,
				spellLevel: spellLevel,
				versatile: versatile,
				options: options
			});
		}
	}

	function _getActionAttackToHit(item) {
		const itemData = item.data.data;
		const rollData = item.getRollData();

		// Define Roll bonuses
		const parts = [];

		// Include the item's innate attack bonus as the initial value and label
		if ( itemData.attackBonus ) {
			parts.push(itemData.attackBonus)
			item.labels.toHit = itemData.attackBonus;
		}

		// Actor-level global bonus to attack rolls
		if (item.actor.data.data.gmm?.monster) {
			switch (itemData.gmm.blueprint.data.attack.type) {
				case "melee_attack_weapon":
				case "melee_attack_spell":
				case "ranged_attack_weapon":
				case "ranged_attack_spell":
					if (item.actor.data.data.gmm.monster.data.attack_bonus.value) {
						parts.push(item.actor.data.data.gmm.monster.data.attack_bonus.value);
					}
			}
		}

		// One-time bonus provided by consumed ammunition
		if ( (itemData.consume?.type === 'ammo') && !!item.actor.items ) {
			const ammoItemData = item.actor.items.get(itemData.consume.target)?.data;

			if (ammoItemData) {
				const ammoItemQuantity = ammoItemData.data.quantity;
				const ammoCanBeConsumed = ammoItemQuantity && (ammoItemQuantity - (itemData.consume.amount ?? 0) >= 0);
				const ammoItemAttackBonus = ammoItemData.data.attackBonus;
				const ammoIsTypeConsumable = (ammoItemData.type === "consumable") && (ammoItemData.data.consumableType === "ammo")
				if ( ammoCanBeConsumed && ammoItemAttackBonus && ammoIsTypeConsumable ) {
				parts.push("@ammo");
				rollData["ammo"] = ammoItemAttackBonus;
				}
			}
		}

		// Condense the resulting attack bonus formula into a simplified label
		let toHitLabel = simplifyRollFormula(parts.join('+'), rollData).trim();
		if (toHitLabel.charAt(0) !== '-') {
			toHitLabel = '+ ' + toHitLabel
		}
		item.labels.toHit = toHitLabel;

		// Update labels and return the prepared roll data
		return {rollData, parts};
	}

	function _getActionSaveDC(item) {
		switch (item.data.data.gmm.blueprint.data.attack.type) {
			case "dc_primary":
				item.data.data.save.dc = item.actor.data.data.gmm.monster.data.attack_dcs.primary.value;
				item.data.data.save.ability = item.data.data.gmm.blueprint.data.attack.defense;
				item.data.data.save.scaling = "flat";
				item.labels.save = game.i18n.format("DND5E.SaveDC", {
					dc: item.actor.data.data.gmm.monster.data.attack_dcs.primary.value || "",
					ability: game.i18n.format(`gmm.common.ability.${item.data.data.gmm.blueprint.data.attack.defense}.name`)
				});
				break;
			case "dc_secondary":
				item.data.data.save.dc = item.actor.data.data.gmm.monster.data.attack_dcs.secondary.value;
				item.data.data.save.ability = item.data.data.gmm.blueprint.data.attack.defense;
				item.data.data.save.scaling = "flat";
				item.labels.save = game.i18n.format("DND5E.SaveDC", {
					dc: item.actor.data.data.gmm.monster.data.attack_dcs.secondary.value || "",
					ability: game.i18n.format(`gmm.common.ability.${item.data.data.gmm.blueprint.data.attack.defense}.name`)
				});
				break;
		}
		return item.data.data.save.dc;
	}

	function _rollActionDamage({item=null, critical=false, event=null, spellLevel=null, versatile=false, options={}}={}) {
		if ( !item.hasDamage ) {
			throw new Error("You may not make a Damage Roll with this Item.");
		}
		const itemData = item.data.data;
		const messageData = {"flags.dnd5e.roll": {type: "damage", itemId: item.id }};
	
		// Get roll data
		const parts = [itemData.gmm.blueprint.data.attack.damage.formula].map((x) => x.replace(/\[.*?\]/g, (token) => {
			return _applyShortcodes(token, item.actor.data.data.gmm.monster.data);
		}));
		const rollData = item.getRollData();
	
		// Configure the damage roll
		const actionFlavor = game.i18n.localize("DND5E.DamageRoll");
		const title = `${item.name} - ${actionFlavor}`;
		const rollConfig = {
		  actor: item.actor,
		  critical: critical ?? event?.altKey ?? false,
		  data: rollData,
		  event: event,
		  fastForward: event ? event.shiftKey || event.altKey || event.ctrlKey || event.metaKey : false,
		  parts: parts,
		  title: title,
		  flavor: itemData.gmm.blueprint.data.attack.damage.type ? `${title} (${itemData.gmm.blueprint.data.attack.damage.type})` : title,
		  speaker: ChatMessage.getSpeaker({actor: item.actor}),
		  dialogOptions: {
			width: 400,
			top: event ? event.clientY - 80 : null,
			left: window.innerWidth - 710
		  },
		  messageData: messageData
		};
	
		// Handle ammunition damage
		const ammoData = item._ammo?.data;
	
		// only add the ammunition damage if the ammution is a consumable with type 'ammo'
		if ( item._ammo && (ammoData.type === "consumable") && (ammoData.data.consumableType === "ammo") ) {
		  parts.push("@ammo");
		  rollData["ammo"] = ammoData.data.damage.parts.map(p => p[0]).join("+");
		  rollConfig.flavor += ` [${item._ammo.name}]`;
		  delete item._ammo;
		}
	
		// Call the roll helper utility
		return damageRoll(mergeObject(rollConfig, options));
	  }

	/**
	 * Get the active sheet id for a specified item.
	 * @param {Object} item - An Item5e entity.
	 * @returns {String} - A sheet id.
	 * @private
	 */
	function _getItemSheetId() {
		try {
			return this.getFlag("core", "sheetClass") || game.settings.get("core", "sheetClasses").Item;
		} catch (error) {
			return "";
		}
	}

	return {
		patchItem5e: patchItem5e
	};
})();

export default GmmItem;