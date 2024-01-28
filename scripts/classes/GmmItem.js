
import ActionBlueprint from './ActionBlueprint.js';
import Shortcoder from './Shortcoder.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

/**
 * A patcher which controls item data based on the selected sheet.
 */
const GmmItem = (function () {
    function simplifyRollFormula(...args) {
        return dnd5e.dice.simplifyRollFormula(...args);
    }
    function damageRoll(...args) {
        return dnd5e.dice.damageRoll(...args);
    }
    /**
     * Patch the Foundry Item5e entity to control how data is prepared based on the active sheet.
     */
    function patchItem5e() {
        libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Item5e.prototype.prepareData', function (wrapped, ...args) {
            wrapped(...args);
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
                try {
                    const itemData = this.flags;
                    const actionBlueprint = ActionBlueprint.createFromItem(this);
                    itemData.gmm = {
                        blueprint: actionBlueprint
                    };
                } catch (error) {
                    console.error(error);
                }
            }
            return;
        }, 'WRAPPER');
        libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Item5e.prototype.getAttackToHit', function (wrapped, ...args) {
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
                return _getActionAttackToHit(this);
            } else {
                return wrapped(...args);
            }
        }, 'MIXED');

        libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Item5e.prototype.getSaveDC', function (wrapped, ...args) {
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
                return _getActionSaveDC(this);
            } else {
                return wrapped(...args);
            }
        }, 'MIXED');
        libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Item5e.prototype.rollDamage', function (wrapped, ...args) {
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet` && this.isOwnedByGmmMonster()) {
                return _rollActionDamage({
                    item: this,
                    critical: args[0]?.critical ?? false,
                    event: args[0]?.event ?? null,
                    spellLevel: args[0]?.spellLevel ?? null,
                    versatile: args[0]?.versatile ?? false,
                    options: args[0]?.options ?? {}
                });
            } else {
                return wrapped(...args);
            }
        }, 'MIXED');
        libWrapper.register('giffyglyph-monster-maker-continued', 'CONFIG.Item.documentClass.prototype.use', function (wrapped, ...args) {
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet` && this.isOwnedByGmmMonster()) {
                const gmmMonster = this.getOwningGmmMonster();
                this.system.damage.parts = this.system.damage.parts.map((x) =>
                    (gmmMonster) ? Shortcoder.replaceShortcodesAndAddDamageTypeDamageObject(x[0], gmmMonster, x[1]) : x[0]
                );
                this.system._source.description = this.system.description;
            }
            return wrapped(...args);
        }, 'WRAPPER');
        libWrapper.register('giffyglyph-monster-maker-continued', 'CONFIG.Item.documentClass.prototype.displayCard', function (wrapped, ...args) {
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet` && this.isOwnedByGmmMonster()) {
                const gmmMonster = this.getOwningGmmMonster();
                this.system.damage.parts = this.system.damage.parts.map((x) =>
                    (gmmMonster) ? Shortcoder.replaceShortcodesAndAddDamageTypeDamageObject(x[0], gmmMonster, x[1]) : x[0]
                );
                this.system._source.description = this.system.description;
            }
            return wrapped(...args);
        }, 'WRAPPER');
        libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Item5e.prototype.rollFormula', function (wrapped, ...args) {
            if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet` && this.isOwnedByGmmMonster()) {
                return _rollActionDamage({
                    item: this,
                    critical: false,
                    event: null,
                    spellLevel: args[0]?.spellLevel ?? null,
                    versatile: false,
                    options: {}
                });
            } else {
                return wrapped(...args);
            }
        }, 'MIXED');

        /*

        */
        game.dnd5e.documents.Item5e.prototype.prepare5eData = game.dnd5e.documents.Item5e.prototype.prepareData;
        //game.dnd5e.documents.Item5e.prototype.prepareData = _prepareData;
        game.dnd5e.documents.Item5e.prototype.get5eAttackToHit = game.dnd5e.documents.Item5e.prototype.getAttackToHit;
        //game.dnd5e.documents.Item5e.prototype.getAttackToHit = _getAttackToHit;
        game.dnd5e.documents.Item5e.prototype.get5eSaveDC = game.dnd5e.documents.Item5e.prototype.getSaveDC;
        //game.dnd5e.documents.Item5e.prototype.getSaveDC = _getSaveDC;
        game.dnd5e.documents.Item5e.prototype.roll5eDamage = game.dnd5e.documents.Item5e.prototype.rollDamage;
        //game.dnd5e.documents.Item5e.prototype.rollDamage = _rollDamage;
        //game.dnd5e.documents.Item5e.prototype.rollFormula = _rollFormula;

        game.dnd5e.documents.Item5e.prototype.prepareShortcodes = _prepareShortcodes;
        game.dnd5e.documents.Item5e.prototype.getSheetId = _getItemSheetId;

        game.dnd5e.documents.Item5e.prototype.getGmmActionBlueprint = _getGmmActionBlueprint;
        game.dnd5e.documents.Item5e.prototype.isOwnedByGmmMonster = _isOwnedByGmmMonster;
        game.dnd5e.documents.Item5e.prototype.getOwningGmmMonster = _getOwningGmmMonster;
        game.dnd5e.documents.Item5e.prototype.getSortingCategory = _getSortingCategory;
        game.dnd5e.documents.Item5e.prototype.getGmmLabels = _getGmmLabels;
        Object.defineProperty(game.dnd5e.documents.Item5e.prototype, "hasSave", {
            get: function () {
                if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
                    return ["save", "other"].includes(this.flags.gmm?.blueprint?.data?.attack?.type);
                } else {
                    // Copy existing Foundry behaviour.
                    const save = this.system?.save || {};
                    return !!(save.ability && save.scaling);
                }
            }
        });
    }

    async function _getGmmLabels() {
        const itemData = this.system;
        const labels = {};
        const rollData = this.getRollData();
        const gmmMonster = this.getOwningGmmMonster();

        labels.icon = (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) ? "fas fa-arrow-alt-circle-right" : "far fa-arrow-alt-circle-right";

        if (this.hasAttack) {
            labels.attack = game.i18n.format(`gmm.action.labels.attack.${itemData.actionType}`);
            if (this.labels.toHit) {
                labels.to_hit = game.i18n.format(`gmm.action.labels.attack.to_hit`, { bonus: this.labels.toHit.replace(/^\+ /, '+') });
            }
        } else if (this.hasSave && itemData.save.ability) {
            labels.attack = game.i18n.format(`gmm.action.labels.attack.${itemData.save.ability}`);
            if (this.system.save.dc) {
                labels.to_hit = game.i18n.format(`gmm.action.labels.attack.dc`, { bonus: this.system.save.dc });
            }
        }

        if (this.hasDamage) {
            const damages = this.system.damage.parts.map((x) => {
                let damage = rollData ? simplifyRollFormula(gmmMonster ? Shortcoder.replaceShortcodes(x[0], gmmMonster) : x[0], rollData).trim() : x[0];
                return `${damage}${x[1] ? ` ${game.i18n.format(`gmm.common.damage.${x[1]}`).toLowerCase()}` : ``} damage`;
            });
            if ((itemData.consume?.type === 'ammo') && !!this.actor?.items) {
                const ammoItemData = this.actor.items.get(itemData.consume.target)?.system;
                if (ammoItemData) {
                    const ammoItemQuantity = ammoItemData.quantity;
                    const ammoCanBeConsumed = ammoItemQuantity && (ammoItemQuantity - (itemData.consume.amount ?? 0) >= 0);
                    const ammoIsTypeConsumable = (ammoItemData.type === "consumable") && (ammoItemData.consumableType === "ammo")
                    if (ammoCanBeConsumed && ammoIsTypeConsumable) {
                        damages.push(...ammoItemData.damage.parts.map(x => {
                            let damage = simplifyRollFormula(gmmMonster ? Shortcoder.replaceShortcodes(x[0], gmmMonster) : x[0], rollData).trim();
                            return `${damage}${x[1] ? ` ${game.i18n.format(`gmm.common.damage.${x[1]}`).toLowerCase()}` : ``} damage`;
                        }));
                    }
                }
            }
            labels.damage_hit = damages.join(" plus ");
        }

        labels.isHealing = this.isHealing;

        if (this.isVersatile) {
            labels.damage_versatile = `${gmmMonster ? Shortcoder.replaceShortcodes(this.system.damage.versatile, gmmMonster) : this.system.damage.versatile} damage`;
        }

        if (this.system.formula) {
            labels.damage_miss = `${gmmMonster ? Shortcoder.replaceShortcodes(this.system.formula, gmmMonster) : this.system.formula} damage`;
        }

        switch (itemData.target?.type) {
            case "":
            case "none":
                switch (itemData.range.units) {
                    case "self":
                        labels.target = game.i18n.format(`gmm.action.labels.target.self`);
                        break;
                    case "touch":
                    case "ft":
                    case "mi":
                        if (itemData.target.units == "any") {
                            labels.target = game.i18n.format(`gmm.action.labels.target.any.all`);
                        } else {
                            labels.target = game.i18n.format(`gmm.action.labels.target.any.${itemData.target.value > 1 ? "multiple" : "single"}`, { quantity: Math.max(1, itemData.target.value) });
                        }
                        break;
                }
                break;
            case "self":
                labels.target = game.i18n.format(`gmm.action.labels.target.self`);
                break;
            case "ally":
            case "enemy":
            case "creature":
            case "object":
                if (itemData.target.units == "any") {
                    labels.target = game.i18n.format(`gmm.action.labels.target.${itemData.target.type}.all`);
                } else {
                    labels.target = game.i18n.format(`gmm.action.labels.target.${itemData.target.type}.${itemData.target.value > 1 ? "multiple" : "single"}`, { quantity: Math.max(1, itemData.target.value) });
                }
                break;
            case "line":
            case "wall":
                if (itemData.target.units) {
                    if (["ft", "mi"].includes(itemData.target.units)) {
                        let area = game.i18n.format(`gmm.action.labels.target.size.${itemData.target.units}.double`, { x: Math.max(1, itemData.target.value), y: Math.max(1, itemData.target.width) });
                        labels.target = game.i18n.format(`gmm.action.labels.target.${itemData.target.type}`, { area: area });
                    }
                }
                break;
            default:
                if (itemData.target?.units) {
                    if (["ft", "mi"].includes(itemData.target.units)) {
                        let size = game.i18n.format(`gmm.action.labels.target.size.${itemData.target.units}.single`, { x: Math.max(1, itemData.target.value) });
                        labels.target = game.i18n.format(`gmm.action.labels.target.${itemData.target.type}`, { size: size });
                    }
                }
                break;
        }

        switch (itemData.range?.units) {
            case "any":
            case "self":
            case "touch":
                labels.range = game.i18n.format(`gmm.action.labels.range.${itemData.range.units}`);
                break;
            case "ft":
            case "mi":
                if (itemData.range.value) {
                    let range = `${itemData.range.value}${itemData.range.long ? `/${itemData.range.long}` : ''}`;
                    if (["mwak", "msak"].includes(itemData.actionType)) {
                        labels.range = game.i18n.format(`gmm.action.labels.range.reach.${itemData.range.units}`, { range: range });
                    } else {
                        labels.range = game.i18n.format(`gmm.action.labels.range.${itemData.range.units}`, { range: range });
                    }
                }
                break;
        }
        let desc = await this.getChatData({ secrets: this.actor?.isOwner });
        labels.description = Shortcoder.replaceShortcodes(desc.description.value, gmmMonster);

        if (this.hasLimitedUses) {
            labels.uses = {
                current: itemData.uses.value,
                maximum: itemData.uses.max,
                per: itemData.uses.per
            };
        }

        if (itemData.recharge && itemData.recharge.value != null) {
            labels.recharge = {
                value: itemData.recharge.value < 6 ? `${itemData.recharge.value}-6` : itemData.recharge.value,
                charged: itemData.recharge.charged
            };
        }

        if (itemData.activation && itemData.activation.type != "") {
            labels.activation = this.labels.activation;
        }

        if (itemData.activation?.type == "legendary" && itemData.activation?.cost > 1) {
            labels.legendary_cost = itemData.activation.cost;
        }

        return labels;
    }

    function _isOwnedByGmmMonster() {
        return this.actor && this.actor.type == "npc" && (this.actor.getSheetId() == `${GMM_MODULE_TITLE}.MonsterSheet`);
    }

    function _getGmmActionBlueprint() {
        return this.flags.gmm?.blueprint?.data;
    }

    function _getOwningGmmMonster() {
        return this.actor?.flags?.gmm?.monster?.data;
    }
    /*
    function _prepareData() {
        game.dnd5e.documents.Item5e.prototype.prepare5eData.call(this);
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
            try {
                const itemData = this.flags;
                const actionBlueprint = ActionBlueprint.createFromItem(this);
                itemData.gmm = {
                    blueprint: actionBlueprint
                };
            } catch (error) {
                console.error(error);
            }
        }
    }*/

    function _prepareShortcodes() {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
            let gmmMonster = this.getOwningGmmMonster();
            if (gmmMonster && this.system.description && this.system.description.value) {
                this.system.description.value = Shortcoder.replaceShortcodes(this.system.description.value, gmmMonster);
            }
        }
    }
    /*
    function _getAttackToHit() {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
            return _getActionAttackToHit(this);
        } else {
            return game.dnd5e.documents.Item5e.prototype.get5eAttackToHit.call(this);
        }
    }

    function _getSaveDC() {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
            return _getActionSaveDC(this);
        } else {
            return game.dnd5e.documents.Item5e.prototype.get5eSaveDC.call(this);
        }
    }

    function _rollDamage({ critical = false, event = null, spellLevel = null, versatile = false, options = {} } = {}) {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet` && this.isOwnedByGmmMonster()) {
            return _rollActionDamage({
                item: this,
                critical: critical,
                event: event,
                spellLevel: spellLevel,
                versatile: versatile,
                options: options
            });
        } else {
            return game.dnd5e.documents.Item5e.prototype.roll5eDamage.call(this, {
                critical: critical,
                event: event,
                spellLevel: spellLevel,
                versatile: versatile,
                options: options
            });
        }
    }
    function _rollFormula({ spellLevel = null } = {}) {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet` && this.isOwnedByGmmMonster()) {
            return _rollActionDamage({
                item: this,
                critical: false,
                event: null,
                spellLevel: spellLevel,
                versatile: null,
                options: {}
            });
        } else {
            return game.dnd5e.documents.Item5e.prototype.rollFormula.call(this, {
                spellLevel: spellLevel
            });
        }
    }*/
    function _getActionAttackToHit(item) {
        const itemData = item.system;
        const rollData = item.getRollData();
        const gmmActionBlueprint = item.getGmmActionBlueprint();
        const gmmMonster = item.getOwningGmmMonster();

        // Define Roll bonuses
        const parts = [];

        // Add the actor's attack bonus
        if (gmmMonster) {
            switch (gmmActionBlueprint.attack.type) {
                case "mwak":
                case "msak":
                case "rwak":
                case "rsak":
                    if (gmmMonster.attack_bonus.value) {
                        parts.push("@attackBonus");
                        if (rollData) {
                            rollData["attackBonus"] = gmmMonster.attack_bonus.value;
                        }
                    }
                    if (item.flags?.gmm?.blueprint?.data?.attack?.related_stat) {
                        parts.push(`@abilityMod`);
                        rollData[`abilityMod`] = gmmMonster.ability_modifiers[item.flags.gmm.blueprint.data.attack.related_stat].value;
                    }
                    break;
            }
        } else {
            parts.push("[attackBonus]");
        }

        // Add the item's attack bonus
        if (itemData.attackBonus && itemData.attackBonus != 0) {
            parts.push(gmmMonster ? Shortcoder.replaceShortcodes(itemData.attackBonus, gmmMonster) : itemData.attackBonus);
        }

        // One-time bonus provided by consumed ammunition
        if ((itemData.consume?.type === 'ammo') && !!item.actor?.items) {
            const ammoItemData = item.actor.items.get(itemData.consume.target)?.system;
            if (ammoItemData) {
                const ammoItemQuantity = ammoItemData.quantity;
                const ammoCanBeConsumed = ammoItemQuantity && (ammoItemQuantity - (itemData.consume.amount ?? 0) >= 0);
                const ammoItemAttackBonus = ammoItem.system.attackBonus;
                const ammoIsTypeConsumable = (ammoItemData.type === "consumable") && (ammoItemData.consumableType === "ammo")
                if (ammoCanBeConsumed && ammoItemAttackBonus && ammoIsTypeConsumable) {
                    parts.push("@ammo");
                    if (rollData) {
                        rollData["ammo"] = ammoItemAttackBonus;
                    }
                }
            }
        }

        // Condense the resulting attack bonus formula into a simplified label
        let toHitLabel = simplifyRollFormula(Roll.replaceFormulaData(parts.join('+').trim(), rollData));
        item.labels.toHit = (toHitLabel.charAt(0) !== '-') ? `+ ${toHitLabel}` : toHitLabel;

        // Update labels and return the prepared roll data
        return { rollData, parts };
    }

    function _getActionSaveDC(item) {
        const itemData = item.system;

        if (["save", "other"].includes(itemData.actionType) && itemData.save?.ability) {
            let dc = "[dcPrimaryBonus]";
            if (itemData.attackBonus) {
                dc += ` + ${itemData.attackBonus}`;
            }
            if (item.flags?.gmm?.blueprint?.data?.attack?.related_stat) {
                dc += ` + [${item.flags.gmm.blueprint.data.attack.related_stat}Mod]`
            }
            const gmmMonster = item.getOwningGmmMonster();
            if (gmmMonster) {
                dc = Shortcoder.replaceShortcodes(dc, gmmMonster);
            }

            item.system.save.dc = simplifyRollFormula(dc);
            item.system.save.ability = itemData.save.ability;
            item.system.save.scaling = "flat";
            item.labels.save = game.i18n.format("DND5E.SaveDC", {
                dc: item.system.save.dc || "",
                ability: game.i18n.format(`gmm.common.ability.${itemData.save.ability}.name`)
            });
        } else {
            item.labels.save = null;
        }

        return item.system.save.dc;
    }

    function _rollActionDamage({ item = null, critical = false, event = null, options = {} } = {}) {
        if (!item.hasDamage) {
            throw new Error("You may not make a Damage Roll with this Item.");
        }
        const itemData = item.system;
        const messageData = { "flags.dnd5e.roll": { type: "damage", itemId: item.id } };
        const gmmActionBlueprint = item.getGmmActionBlueprint();

        // Get roll data
        const gmmMonster = item.getOwningGmmMonster();
        const parts = itemData.damage.parts.map((x) =>
            (gmmMonster) ? Shortcoder.replaceShortcodesAndAddDamageType(x[0], gmmMonster, x[1]) : x[0]
        );
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
            flavor: gmmActionBlueprint.attack.damage.type ? `${title} (${gmmActionBlueprint.attack.damage.type})` : title,
            speaker: ChatMessage.getSpeaker({ actor: item.actor }),
            dialogOptions: {
                width: 400,
                top: event ? event.clientY - 80 : null,
                left: window.innerWidth - 710
            },
            messageData: messageData
        };

        // Handle ammunition damage
        const ammoData = item._ammo?.system;
        if (item._ammo && (ammoData.type === "consumable") && (ammoData.consumableType === "ammo")) {
            parts.push("@ammo");
            rollData["ammo"] = ammoData.damage.parts.map(p => p[0]).join("+");
            rollConfig.flavor += ` [${item._ammo.name}]`;
            delete item._ammo;
        }

        // Call the roll helper utility
        return damageRoll(mergeObject(rollConfig, options));
    }
    function _getSortingCategory() {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
            const gmmActionBlueprint = this.getGmmActionBlueprint();
            if (gmmActionBlueprint) {
                switch (gmmActionBlueprint.activation.type) {
                    case "action":
                    case "crew":
                    case "minute":
                    case "hour":
                    case "day":
                    case "special":
                        return "action";
                    case "bonus":
                    case "reaction":
                    case "lair":
                    case "legendary":
                        return gmmActionBlueprint.activation.type;
                    default:
                        return "trait";
                }
            } else {
                return "trait";
            }
        } else {
            switch (this.type) {
                case "spell":
                    return "spell";
                case "weapon":
                case "feat":
                    if (this.system.activation?.type) {
                        switch (this.system.activation.type) {
                            case "bonus":
                                return "bonus";
                            case "reaction":
                                return "reaction";
                            case "lair":
                                return "lair";
                            case "legendary":
                                return "legendary";
                            default:
                                return "action";
                        }
                    } else if (this.type == "weapon") {
                        return "loot";
                    } else {
                        return "trait";
                    }
                case "class":
                    return "trait";
                default:
                    return "loot";
            }
        }
    }

    /**
     * Get the active sheet id for a specified item.
     * @param {Object} item - An Item5e entity.
     * @returns {String} - A sheet id.
     * @private
     */
    function _getItemSheetId() {
        try {
            return this.getFlag("core", "sheetClass") || game.settings.get("core", "sheetClasses").Item[this.type];
        } catch (error) {
            return "";
        }
    }

    return {
        patchItem5e: patchItem5e
    };
})();

export default GmmItem;