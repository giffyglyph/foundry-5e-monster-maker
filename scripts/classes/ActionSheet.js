import { GMM_GUI_COLORS } from "../consts/GmmGuiColors.js";
import { GMM_GUI_SKINS } from "../consts/GmmGuiSkins.js";
import { GMM_GUI_LAYOUTS } from "../consts/GmmGuiLayouts.js";
import { GMM_ACTION_ACTIVATION_TYPES } from "../consts/GmmActionActivationTypes.js";
import { GMM_ACTION_CONSUMPTION_TYPES } from "../consts/GmmActionConsumptionTypes.js";
import { GMM_ACTION_TIME_PERIODS } from "../consts/GmmActionTimePeriods.js";
import { GMM_ACTION_USE_PERIODS } from "../consts/GmmActionUsePeriods.js";
import { GMM_ACTION_RANGE_TYPES } from "../consts/GmmActionRangeTypes.js";
import { GMM_ACTION_TARGET_TYPES } from "../consts/GmmActionTargetTypes.js";
import { GMM_ACTION_ATTACK_TYPES } from "../consts/GmmActionAttackTypes.js";
import { GMM_ACTION_ATTACK_DAMAGE_TYPES } from "../consts/GmmActionAttackDamageTypes.js";
import { GMM_MONSTER_RANKS } from "../consts/GmmMonsterRanks.js";
import { GMM_MONSTER_ROLES } from "../consts/GmmMonsterRoles.js";
import { GMM_MODULE_TITLE } from "../consts/GmmModuleTitle.js";
import { GMM_5E_ABILITIES } from "../consts/Gmm5eAbilities.js";
import Gui from "./Gui.js";
import ActionBlueprint from "./ActionBlueprint.js";
import ActionForge from "./ActionForge.js";
import Templates from "./Templates.js";

export default class ActionSheet extends ItemSheet {

	constructor(...args) {
		super(...args);

		this._gui = new Gui();
	}

	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["gmm-window window--action"],
				height: 600,
				width: 500,
				template: Templates.getRelativePath('action/forge.html'),
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
			$el.find('[data-action="add-damage"]').click((e) => this._addDamage(e));
			$el.find('[data-action="remove-damage"]').click((e) => this._removeDamage(e));
		} catch (error) {
			console.error(error);
		}
	}

	_addDamage(event) {
		event.preventDefault();
		const damage = this.item.system.damage;
		return this.item.update({"data.damage.parts": damage.parts.concat([["", ""]])});
	}

	_removeDamage(event) {
		event.preventDefault();
		const a = event.currentTarget;
		const li = a.closest(".form-group--damage");
		const damage = duplicate(this.item.system.damage);
		damage.parts.splice(Number(li.dataset.index), 1);
		return this.item.update({"data.damage.parts": damage.parts});
	}

	getData() {
		const data = super.getData();
		const itemData = data.item.flags;

		data.gmm = {
			blueprint: itemData.gmm?.blueprint ? itemData.gmm.blueprint.data : null,
			action: itemData.gmm?.blueprint ? ActionForge.createArtifact(itemData.gmm.blueprint).data : null,
			forge: {
				layout: itemData.gmm?.blueprint.data.display.layout ? itemData.gmm.blueprint.data.display.layout : game.settings.get(GMM_MODULE_TITLE, "actionLayout"),
				colors: {
					primary: itemData.gmm?.blueprint.data.display.color.primary ? itemData.gmm.blueprint.data.display.color.primary : game.settings.get(GMM_MODULE_TITLE, "actionPrimaryColor"),
					secondary: itemData.gmm?.blueprint.data.display.color.secondary ? itemData.gmm.blueprint.data.display.color.secondary : game.settings.get(GMM_MODULE_TITLE, "actionSecondaryColor")
				},
				skins: {
					artifact: itemData.gmm?.blueprint.data.display.skin.artifact ? itemData.gmm.blueprint.data.display.skin.artifact : game.settings.get(GMM_MODULE_TITLE, "actionArtifactSkin"),
					blueprint: itemData.gmm?.blueprint.data.display.skin.blueprint ? itemData.gmm.blueprint.data.display.skin.blueprint : game.settings.get(GMM_MODULE_TITLE, "actionBlueprintSkin"),
				}
			},
			gui: this._gui,
			enums: {
				colors: GMM_GUI_COLORS,
				skins: GMM_GUI_SKINS,
				activation_types: GMM_ACTION_ACTIVATION_TYPES,
				consumption_types: GMM_ACTION_CONSUMPTION_TYPES,
				time_periods: GMM_ACTION_TIME_PERIODS,
				use_periods: GMM_ACTION_USE_PERIODS,
				range_types: GMM_ACTION_RANGE_TYPES,
				target_types: GMM_ACTION_TARGET_TYPES,
				consumption_targets: this._getActionConsumptionTargets(data.item),
				ranks: Object.keys(GMM_MONSTER_RANKS).filter((x) => x != "custom"),
				roles: Object.keys(GMM_MONSTER_ROLES).filter((x) => x != "custom"),
				layouts: GMM_GUI_LAYOUTS,
				attack_types: GMM_ACTION_ATTACK_TYPES,
				attack_damage_types: GMM_ACTION_ATTACK_DAMAGE_TYPES,
				abilities: GMM_5E_ABILITIES,
			}
		};

		if (data.gmm.action) {
			data.gmm.action.gmmLabels = this.item.getGmmLabels();
		}

		return data;
	}

	_getActionConsumptionTargets(item) {
		const consume = item.system.consume || {};
		if ( !consume.type ) {
			return [];
		}
		const actor = this.item.actor;
		if ( !actor ) {
			return {};
		}
	
		// Ammunition
		if ( consume.type === "ammo" ) {
			return actor.itemTypes.consumable.reduce((ammo, i) =>  {
				if ( i.system.consumableType === "ammo" ) {
					ammo[i.id] = `${i.name} (${i.system.quantity})`;
				}
				return ammo;
			}, {[item.id]: `${item.name} (${item.system.quantity})`});
		} else if ( consume.type === "attribute" ) {
			const attributes = TokenDocument.getTrackedAttributes(actor.system);
			attributes.bar.forEach(a => a.push("value"));
			return attributes.bar.concat(attributes.value).reduce((obj, a) => {
				let k = a.join(".");
				obj[k] = k;
				return obj;
			}, {});
		} else if ( consume.type === "material" ) {
			return actor.items.contents.reduce((obj, i) => {
				if ( ["consumable", "loot"].includes(i.data.type) && !i.system.activation ) {
					obj[i.id] = `${i.name} (${i.system.quantity})`;
				}
				return obj;
			}, {});
		} else if ( consume.type === "charges" ) {
			return actor.items.contents.reduce((obj, i) => {
				const uses = i.system.uses || {};
				if ( uses.per && uses.max ) {
					const label = uses.per === "charges" ?
					` (${game.i18n.format("DND5E.AbilityUseChargesLabel", {value: uses.value})})` :
					` (${game.i18n.format("DND5E.AbilityUseConsumableLabel", {max: uses.max, per: uses.per})})`;
					obj[i.id] = i.name + label;
				}
				const recharge = i.system.recharge || {};
				if ( recharge.value ) {
					obj[i.id] = `${i.name} (${game.i18n.format("DND5E.Recharge")})`;
				}
				return obj;
			}, {})
		} else return {};
	}

 	_updateObject(event, form) {
		if (event && event.currentTarget && event.currentTarget.closest(".gmm-modal") != null) {
			return null;
		}

		if (event && event.currentTarget) {
			this._gui.updateFrom(event.currentTarget.closest(".gmm-window"));
		}

		let formData = expandObject(form);
		if (hasProperty(formData, "gmm.blueprint")) {
			setProperty(formData, "flags.gmm.blueprint", {
				vid: 1,
				type: "action",
				data: getProperty(formData, "gmm.blueprint")
			});
			delete formData.gmm;

			$.extend(true, formData, ActionBlueprint.getItemDataFromBlueprint(formData.flags.gmm.blueprint));
		}

		return this.document.update(formData);
	}
}
