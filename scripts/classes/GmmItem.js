import ActionBlueprint from './ActionBlueprint.js';
import Activities from './Activities.js';
import Durations from './Durations.js';
import Shortcoder from './Shortcoder.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';
import CompatibilityHelpers from "./CompatibilityHelpers.js";
import { formatTargetLabel, formatRangeLabel } from "./Labels.js";


const GmmItem = (function () {
    function simplifyRollFormula(...args) {
        return dnd5e.dice.simplifyRollFormula(...args);
    }

    function patchItem5e() {
        // Rebuilt from the document every prepare, so it can never be stale.
        CompatibilityHelpers.safeWrap('game.dnd5e.documents.Item5e.prototype.prepareData', function (wrapped, ...args) {
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
        }, 'WRAPPER');

        // Guarded because several of these moved onto the Activity classes and no longer exist.
        const Item5eProto = game.dnd5e.documents.Item5e.prototype;
        if (typeof Item5eProto.prepareData === "function") Item5eProto.prepare5eData = Item5eProto.prepareData;

        Item5eProto.prepareShortcodes = _prepareShortcodes;
        Item5eProto.getSheetId = _getItemSheetId;
        Item5eProto.getGmmActionBlueprint = _getGmmActionBlueprint;
        Item5eProto.isOwnedByGmmMonster = _isOwnedByGmmMonster;
        Item5eProto.getOwningGmmMonster = _getOwningGmmMonster;
        Item5eProto.getSortingCategory = _getSortingCategory;
        Item5eProto.getGmmLabels = _getGmmLabels;

        // Listeners rather than wraps: the prototype hooks these replaced no longer exist.
        Hooks.on("dnd5e.preRollAttackV2", _onPreRollAttack);
        Hooks.on("dnd5e.preRollDamageV2", _onPreRollDamage);
        Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);

        // `attack.flat` suppresses dnd5e's own ammunition bonus, so GMM adds it after the config is built.
        Hooks.on("dnd5e.postBuildAttackRollConfig", _onPostBuildAttackConfig);
        Hooks.on("dnd5e.postBuildDamageRollConfig", _onPostBuildDamageConfig);
    }

    function _isOwnedByGmmMonster() {
        return this.actor && this.actor.type == "npc" && (this.actor.getSheetId?.() == `${GMM_MODULE_TITLE}.MonsterSheet`);
    }

    function _getGmmActionBlueprint() {
        return this.flags.gmm?.blueprint?.data;
    }

    function _getOwningGmmMonster() {
        return this.actor?.flags?.gmm?.monster?.data;
    }

    function _getItemSheetId() {
        try {
            return this.getFlag("core", "sheetClass") || game.settings.get("core", "sheetClasses").Item[this.type];
        } catch (error) {
            return "";
        }
    }

    function _isGmmActionItem(item) {
        return item?.getSheetId?.() === `${GMM_MODULE_TITLE}.ActionSheet`;
    }

    function _prepareShortcodes() {
        if (!_isGmmActionItem(this)) return;
        const gmmMonster = this.getOwningGmmMonster();
        if (!gmmMonster) return;
        // Ahead of the description, because `[featureDc]` reads the activity's resolved DC.
        Activities.resolveActivityFormulas(this, gmmMonster);
        Durations.resolveEffectFormulas(this, gmmMonster);
        if (this.system?.description?.value) {
            // `this` is passed so item-scoped shortcodes like `[target]` can reach the owning blueprint.
            this.system.description.value = Shortcoder.replaceShortcodes(this.system.description.value, gmmMonster, false, this);
        }
    }

    function _onPreRollAttack(rollConfig, dialogConfig, _messageConfig) {
        const activity = rollConfig?.subject;
        const monsterData = _gmmMonsterForActivity(activity);
        if (!monsterData) return;
        Activities.injectAttackBonusParts(rollConfig, activity, monsterData);
        Activities.injectAmmunition(rollConfig, dialogConfig, activity);
    }

    function _onPreRollDamage(rollConfig, _dialogConfig, _messageConfig) {
        const activity = rollConfig?.subject;
        const monsterData = _gmmMonsterForActivity(activity);
        if (!monsterData) return;

        // The chat save buttons read `activity.save.dc.value`, so it has to be resolved before the card.
        if (activity?.type === "save") {
            _computeAndApplySaveDc(activity, monsterData, rollConfig);
        }

        Activities.resolveDamageRollFormulas(rollConfig, monsterData);
    }


    /* The use runs against an item clone, which never sees the owning actor's derived pass. */
    function _onPreUseActivity(activity, _usageConfig, _dialogConfig, _messageConfig) {
        try {
            const item = activity?.item;
            if (!_isGmmActionItem(item)) return;
            const monsterData = item.getOwningGmmMonster?.();
            if (!monsterData) return;
            item.prepareShortcodes?.();
            // The button datasets are generated from the DC, so a zero here ships a broken card.
            if (Activities.isGmmActivityId(activity.id) && activity.type === "save") {
                _computeAndApplySaveDc(activity, monsterData, null);
            }
        } catch (e) {
            console.warn("GMM | preUseActivity clone preparation failed", e);
        }
    }

    function _gmmMonsterForActivity(activity) {
        if (!activity || !Activities.isGmmActivityId(activity.id)) return null;
        const item = activity.item;
        if (!_isGmmActionItem(item)) return null;
        return item.getOwningGmmMonster?.() ?? null;
    }

    function _computeAndApplySaveDc(activity, monsterData, rollConfig = null) {
        if (!activity?.save?.dc || !monsterData) return null;

        const item = activity.item;

        try {
            Activities.resolveActivityFormulas(item, monsterData);
        } catch (e) { /* swallow */ }

        let finalDc = Number(activity.save.dc.value);

        if (!Number.isFinite(finalDc) || finalDc <= 0) {
            const formula = Activities.buildSaveDcFormula(item?.flags?.gmm?.blueprint?.data ?? {});
            const resolved = Shortcoder.replaceShortcodes(formula, monsterData);
            try {
                const dcRoll = new Roll(String(resolved || "0"));
                if (dcRoll.isDeterministic) {
                    const total = dcRoll.evaluateSync().total;
                    if (Number.isFinite(total) && total > 0) finalDc = total + Activities.saveDcBonus(activity);
                }
            } catch (e) { /* swallow */ }
        }

        if (!Number.isFinite(finalDc) || finalDc <= 0) return null;

        activity.save.dc.value = finalDc;
        if (!activity.save.dc.formula || activity.save.dc.formula === "0") {
            activity.save.dc.formula = String(finalDc);
        }

        if (rollConfig) {
            rollConfig.target = finalDc;
            if (Array.isArray(rollConfig.rolls)) {
                for (const r of rollConfig.rolls) {
                    r.options ??= {};
                    r.options.target = finalDc;
                }
            }
        }

        return finalDc;
    }
    function _isGmmAttackActivity(activity) {
        if (!Activities.isGmmActivityId(activity?.id)) return false;
        if (activity?.type !== "attack") return false;
        return _isGmmActionItem(activity.item);
    }

    /* `config.options.ammunition` is where the dialog's chosen ammo arrives. */
    function _onPostBuildAttackConfig(process, config, index, _options = {}) {
        if (index !== 0) return;
        const activity = process?.subject;
        if (!_isGmmAttackActivity(activity)) return;
        const ammoId = config?.options?.ammunition;
        if (!ammoId) return;
        const ammo = activity.actor?.items.get(ammoId);
        Activities.injectAmmoMagicPart(config, ammo);
    }

    /* Unlike the attack config, the damage roll hands over a whole `Item5e` in `process.ammunition`. */
    function _onPostBuildDamageConfig(process, config, index, _options = {}) {
        if (index !== 0) return;
        const activity = process?.subject;
        if (!_isGmmAttackActivity(activity)) return;
        const ammo = process?.ammunition;
        Activities.injectAmmoMagicPart(config, ammo);
    }

    function _getSortingCategory() {
        if (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`) {
            const gmmActionBlueprint = this.getGmmActionBlueprint();
            if (gmmActionBlueprint) {
                switch (gmmActionBlueprint.activation?.type) {
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
                case "feat": {
                    // dnd5e v5+ moved activation off the item and onto each activity.
                    const activations = this.system?.activities?.contents?.map(a => a.activation?.type).filter(_ => _) ?? [];
                    const primaryActivation = activations[0];
                    if (primaryActivation) {
                        switch (primaryActivation) {
                            case "bonus": return "bonus";
                            case "reaction": return "reaction";
                            case "lair": return "lair";
                            case "legendary": return "legendary";
                            default: return "action";
                        }
                    } else if (this.type == "weapon") {
                        return "loot";
                    } else {
                        return "trait";
                    }
                }
                case "class":
                    return "trait";
                default:
                    return "loot";
            }
        }
    }

    /* Rarity and the other GMM-only concepts have no activity to read, so they come off the blueprint. */
    async function _getGmmLabels() {
        const labels = {};
        const blueprint = this.flags?.gmm?.blueprint?.data;
        const gmmMonster = this.getOwningGmmMonster();
        const activity = this.system?.activities?.get?.(Activities.GMM_ACTIVITY_ID);
        // Two activities on a deferred action: the primary is spent, the gate rolls, the payload lands.
        const payload = this.system?.activities?.get?.(Activities.payloadActivityId(this.flags?.gmm?.blueprint))
            ?? activity;
        const gate = this.system?.activities?.get?.(Activities.gateActivityId(this.flags?.gmm?.blueprint))
            ?? activity;

        labels.icon = (this.getSheetId() == `${GMM_MODULE_TITLE}.ActionSheet`)
            ? "fas fa-arrow-alt-circle-right"
            : "far fa-arrow-alt-circle-right";

        const rollData = this.getRollData();

        // HealActivity stores one `healing` DamageData where the others carry `damage.parts`.
        const damageParts = payload?.damage?.parts ?? [];
        const healingPart = payload?.healing ?? null;
        const blueprintAttackType = blueprint?.attack?.type ?? "";
        const isHealingAction = (blueprintAttackType === "heal") || !!healingPart || _hasHealingPart(damageParts);

        if (gate?.type === "attack") {
            labels.attack = game.i18n.format(`gmm.action.labels.attack.${blueprintAttackType || "mwak"}`);
            const toHit = _computeAttackToHit(gate, blueprint, gmmMonster, rollData);
            if (toHit !== null) {
                labels.to_hit = game.i18n.format(`gmm.action.labels.attack.to_hit`, { bonus: toHit });
            }
        } else if (gate?.type === "save") {
            labels.attack = _formatSaveLabel(gate);
            const dc = gate.save?.dc?.value;
            if (dc) {
                labels.to_hit = game.i18n.format(`gmm.action.labels.attack.dc`, { bonus: dc });
            }
        } else if (blueprintAttackType) {
            labels.attack = game.i18n.format(`gmm.common.attack_type.${blueprintAttackType}`);
        }

        const blueprintDamageRaw = blueprint?.attack?.hit?.damage;
        const blueprintDamage = Array.isArray(blueprintDamageRaw)
            ? blueprintDamageRaw
            : (blueprintDamageRaw && typeof blueprintDamageRaw === "object")
                ? Object.keys(blueprintDamageRaw)
                    .filter(k => /^\d+$/.test(k))
                    .sort((a, b) => Number(a) - Number(b))
                    .map(k => blueprintDamageRaw[k])
                : [];

        if (healingPart) {
            const label = _formatDamagePart(healingPart, gmmMonster, rollData, blueprintDamage[0]?.formula);
            if (label) labels.damage_hit = label;
        } else if (damageParts.length) {
            labels.damage_hit = damageParts
                .map((part, idx) => _formatDamagePart(part, gmmMonster, rollData, blueprintDamage[idx]?.formula))
                .filter(_ => _)
                .join(" plus ");
        } else if (blueprintDamage.length) {
            // No GMM activity to read: a compendium or unmigrated item falls back to the blueprint.
            labels.damage_hit = blueprintDamage
                .map(d => _formatDamagePart({ formula: d.formula, types: d.type ? [d.type] : [] }, gmmMonster, rollData, d.formula))
                .filter(_ => _)
                .join(" plus ");
        }

        const condition = activity?.activation?.condition ?? blueprint?.activation?.condition ?? "";
        labels.condition = gmmMonster ? Shortcoder.replaceShortcodes(condition, gmmMonster, false, this) : condition;

        labels.duration = (payload?.duration?.units === "inst")
            ? ""
            : payload?.labels?.duration ?? this.labels?.duration ?? "";
        labels.isHealing = isHealingAction || !!this.isHealing;
        labels.isConcentration = !!activity?.duration?.concentration;

        if (blueprint?.attack?.versatile?.damage) {
            const v = blueprint.attack.versatile.damage;
            labels.damage_versatile = `${gmmMonster ? Shortcoder.replaceShortcodes(v, gmmMonster, true, this) : v} damage`;
        }
        /* Miss takes a fraction of the rolled damage rather than rolling its own. */
        const missPercentage = Activities.missPercentage(blueprint);
        if (missPercentage > 0) {
            labels.damage_miss = game.i18n.format("gmm.common.attack.miss_damage", { percentage: missPercentage });
        }

        labels.bpRarity = blueprint?.rarity ?? "";
        switch (blueprint?.rarity) {
            case "default":
            case "common":
                labels.rarity = game.i18n.format(`gmm.common.rarity.common`);
                break;
            case "uncommon":
                labels.rarity = game.i18n.format(`gmm.common.rarity.uncommon`);
                break;
            case "rare":
                labels.rarity = game.i18n.format(`gmm.common.rarity.rare`);
                break;
        }

        const range = blueprint?.range ?? activity?.range ?? {};
        labels.range = formatRangeLabel(range, blueprintAttackType);

        // From the blueprint, whose target vocabulary is richer than dnd5e's.
        const target = blueprint?.target ?? {};
        labels.target = formatTargetLabel(target, range);

        try {
            const desc = await this.getChatData({ secrets: this.actor?.isOwner });
            const descValue = (typeof desc?.description === "string")
                ? desc.description
                : (desc?.description?.value ?? this.system?.description?.value ?? blueprint?.description?.text ?? "");
            labels.description = gmmMonster ? Shortcoder.replaceShortcodes(descValue, gmmMonster, false, this) : descValue;
        } catch (e) {
            labels.description = "";
        }

        const uses = this.system?.uses;
        const rechargeRecovery = uses?.recovery?.find?.(r => r.period === "recharge");
        if (uses && (uses.max || uses.spent !== undefined)) {
            const max = parseInt(uses.max);
            const spent = parseInt(uses.spent ?? 0);
            const value = (Number.isFinite(max) && Number.isFinite(spent)) ? Math.max(0, max - spent) : null;
            // An unrecovered pool writes no recovery rule, so the authored period is all that names it.
            const per = rechargeRecovery ? "" : (uses.recovery?.[0]?.period || blueprint?.uses?.per || "");
            if (max && per) {
                labels.uses = { current: value, maximum: max, per };
            }
        }

        const gmmDeferral = Activities.readDeferral(this.flags?.gmm?.blueprint);
        if (gmmDeferral) {
            labels.deferral = {
                type: game.i18n.format(`gmm.common.deferral_type.${gmmDeferral.type}`),
                timer: gmmDeferral.timer,
                cancel: gmmDeferral.cancel,
                isDelayed: gmmDeferral.type === "delayed",
                isDooming: gmmDeferral.type === "dooming"
            };
        }

        // The book prints a deferred payload under `Delay:` or `Doom:` rather than `Hit:`.
        labels.hitClause = isHealingAction ? "heal"
            : gmmDeferral?.type === "delayed" ? "delay"
                : gmmDeferral?.type === "dooming" ? "doom"
                    : "hit";

        if (rechargeRecovery) {
            const formula = rechargeRecovery.formula;
            const v = parseInt(formula);
            labels.recharge = {
                value: Number.isFinite(v) && v < 6 ? `${v}-6` : (Number.isFinite(v) ? `${v}` : formula),
                charged: (parseInt(uses.spent ?? 0) === 0)
            };
        } else {
            labels.recharge = null;
        }

        const activation = activity?.activation;
        if (activation?.type) {
            labels.activation = activity?.labels?.activation ?? this.labels?.activation ?? "";
            if (activation.type === "legendary" && activation.value > 1) {
                labels.legendary_cost = activation.value;
            }
        }

        return labels;
    }

    /* A string, not a number, because the actor's attack bonus permits dice. */
    function _computeAttackToHit(activity, blueprint, monsterData, rollData = {}) {
        if (!monsterData) return null;

        /* No attackMode: it only exists mid-roll, so the sheet cannot know a thrown attack became rwak. */
        const { parts, data } = Activities.buildAttackToHitTerms(activity, blueprint, monsterData, { attackMode: "" });

        const bonusFormula = activity?.attack?.bonus;
        if (bonusFormula) parts.push(String(bonusFormula));
        if (!parts.length) return null;

        try {
            const formula = new Roll(parts.join(" + "), { ...rollData, ...data }).formula;
            const simplified = simplifyRollFormula(formula).trim() || "0";
            return /^[+-]/.test(simplified) ? simplified : `+${simplified}`;
        } catch (e) {
            return null;
        }
    }

    /* Multi-ability saves go through the locale's disjunction formatter, not a hardcoded "or". */
    function _formatSaveLabel(activity) {
        const raw = activity.save?.ability;
        const abilities = raw instanceof Set ? Array.from(raw)
            : Array.isArray(raw) ? Array.from(raw)
                : (raw ? [raw] : []);
        if (abilities.length === 1) {
            return game.i18n.format(`gmm.action.labels.attack.${abilities[0]}`);
        }
        if (abilities.length > 1) {
            const formatter = game.i18n.getListFormatter({ style: "short", type: "disjunction" });
            const names = abilities.map(a => CONFIG.DND5E?.abilities?.[a]?.label ?? a);
            return `${formatter.format(names)} ${game.i18n.localize("DND5E.SavingThrow")}`;
        }
        return game.i18n.localize("DND5E.SavingThrow");
    }

    /* A healing part reads "1d6 healing", a damage part "1d6 + 2 fire damage". */
    function _formatDamagePart(part, monsterData, rollData, rawBlueprintFormula) {
        const formula = _resolvePartFormula(part, monsterData, rollData, rawBlueprintFormula);
        if (!formula) return "";
        const types = part.types instanceof Set ? Array.from(part.types)
            : Array.isArray(part.types) ? part.types : [];
        const type = types[0];
        if (!type) return `${formula} damage`;
        const typeLabel = _localizeDamageType(type);
        return _isHealingType(type)
            ? `${formula} ${typeLabel.toLowerCase()}`
            : `${formula} ${typeLabel.toLowerCase()} damage`;
    }

    function _localizeDamageType(type) {
        const dnd = CONFIG.DND5E?.damageTypes?.[type]?.label
            ?? CONFIG.DND5E?.healingTypes?.[type]?.label;
        if (dnd) return game.i18n.localize(dnd);
        return game.i18n.localize(`gmm.common.damage.${type}`);
    }

    function _isHealingType(type) {
        return !!(type && CONFIG.DND5E?.healingTypes?.[type]);
    }

    function _hasHealingPart(damageParts) {
        if (!damageParts?.length) return false;
        return damageParts.some(part => {
            const types = part.types instanceof Set ? Array.from(part.types)
                : Array.isArray(part.types) ? part.types : [];
            return types.some(_isHealingType);
        });
    }

    /* Four sources in preference order, because any one of them can be the only populated one. */
    function _resolvePartFormula(part, monsterData, rollData, rawBlueprintFormula) {
        let formula = "";
        try {
            // The standalone action sheet previews before `resolveActivityFormulas` has run.
            if (typeof rawBlueprintFormula === "string" && rawBlueprintFormula.includes("[")) {
                formula = rawBlueprintFormula;
            } else if (typeof part?.formula === "string" && part.formula) {
                formula = part.formula;
            } else if (part?.custom?.enabled) {
                formula = part.custom.formula ?? "";
            } else if (part?.number && part?.denomination) {
                formula = `${part.number}d${part.denomination}`;
                if (part.bonus) {
                    const bonus = String(part.bonus).trim();
                    formula += bonus.startsWith("-") ? ` - ${bonus.slice(1)}` : ` + ${bonus}`;
                }
            } else if (part?.bonus) {
                formula = String(part.bonus);
            }
        } catch (e) { /* fall through to empty */ }
        if (!formula) return "";

        if (formula.includes("[") && monsterData) {
            formula = Shortcoder.replaceShortcodes(formula, monsterData, true);
        }
        try {
            const replaced = CompatibilityHelpers.replaceFormulaData(formula, rollData);
            return simplifyRollFormula(replaced).trim() || formula;
        } catch (e) {
            return formula;
        }
    }

    return {
        patchItem5e: patchItem5e
    };
})();

export default GmmItem;
