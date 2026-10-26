import { GMM_GUI_COLORS } from "../consts/GmmGuiColors.js";
import { GMM_GUI_SKINS } from "../consts/GmmGuiSkins.js";
import { GMM_GUI_LAYOUTS } from "../consts/GmmGuiLayouts.js";
import { GMM_ACTION_ACTIVATION_TYPES } from "../consts/GmmActionActivationTypes.js";
import { GMM_ACTION_CONSUMPTION_TYPES } from "../consts/GmmActionConsumptionTypes.js";
import { GMM_ACTION_TIME_PERIODS } from "../consts/GmmActionTimePeriods.js";
import { GMM_ACTION_USE_PERIODS } from "../consts/GmmActionUsePeriods.js";
import { GMM_ACTION_RANGE_TYPES } from "../consts/GmmActionRangeTypes.js";
import { GMM_ACTION_RARITIES } from "../consts/GmmActionRarities.js";
import { GMM_ACTION_ATTACK_TYPES } from "../consts/GmmActionAttackTypes.js";
import { GMM_DEFERRAL_TYPES } from "../consts/GmmDeferralTypes.js";
import { GMM_ACTION_DURATION_TYPES } from "../consts/GmmActionDurationTypes.js";
import { GMM_ACTION_REAPPLY_MODES } from "../consts/GmmActionReapplyModes.js";
import { GMM_ACTION_ATTACK_DAMAGE_TYPES } from "../consts/GmmActionAttackDamageTypes.js";
import { GMM_MONSTER_RANKS } from "../consts/GmmMonsterRanks.js";
import { GMM_MONSTER_ROLES } from "../consts/GmmMonsterRoles.js";
import { GMM_MODULE_TITLE } from "../consts/GmmModuleTitle.js";
import { GMM_5E_ABILITIES } from "../consts/Gmm5eAbilities.js";
import { GMM_ZONE_TERRAIN_TYPES } from "../consts/GmmZoneTerrain.js";
import { GMM_ZONE_TRIGGERS } from "../consts/GmmZoneTriggers.js";
import { GMM_ZONE_PAYLOADS } from "../consts/GmmZonePayloads.js";
import { GMM_ZONE_AUDIENCES } from "../consts/GmmZoneAudiences.js";
import Gui from "./Gui.js";
import ActionBlueprint from "./ActionBlueprint.js";
import ActionForge from "./ActionForge.js";
import Templates from "./Templates.js";
import CompatibilityHelpers from "./CompatibilityHelpers.js";
import Activities from "./Activities.js";
import Durations from "./Durations.js";

/* The Forge UI replaces the stock item parts entirely, so much of this class undoes inherited chrome. */
export default class ActionSheet extends dnd5e.applications.item.ItemSheet5e {
    constructor(options = {}) {
        super(options);
        this._gui = new Gui();
    }

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ["gmm-window", "window--action"],
        position: { width: 500, height: 600 },
        window: { resizable: true },
        actions: {
            "add-damage": ActionSheet.#actionAddDamage,
            "remove-damage": ActionSheet.#actionRemoveDamage,
            "add-terrain": ActionSheet.#actionAddTerrain,
            "remove-terrain": ActionSheet.#actionRemoveTerrain,
            "add-zone-rule": ActionSheet.#actionAddZoneRule,
            "remove-zone-rule": ActionSheet.#actionRemoveZoneRule,
            "open-region-behaviors": ActionSheet.#actionOpenRegionBehaviors,
            "create-effect": ActionSheet.#actionCreateEffect,
            "toggle-effect-mode": ActionSheet.#actionToggleEffectMode,
            "edit-image": ActionSheet.#actionEditImage
        }
    };

    /* PARTS is not merged across the inheritance chain, so this supplants the parent outright. */
    static PARTS = {
        forge: {
            template: "modules/giffyglyph-monster-maker-continued/templates/action/forge.html",
            scrollable: [".forge__blueprint", ".forge__artifact"]
        }
    };

    /* Clear the inherited `static TABS` so the framework doesn't try to render a `tabs` part we never declare. */
    static TABS = [];

    /* Inherited dnd5e styling, kept out because the markup it targets is no longer rendered. */
    static #STRIPPED_CLASSES = new Set([
        "dnd5e2",
        "item",
        "vertical-tabs",
        "standard-form",
        "hidden-title"
    ]);

    /** @inheritDoc */
    _initializeApplicationOptions(options) {
        const opts = super._initializeApplicationOptions(options);
        opts.classes = (opts.classes ?? []).filter(c => !ActionSheet.#STRIPPED_CLASSES.has(c));
        return opts;
    }

    /** @inheritDoc */
    get title() {
        const name = this.item?.name ?? this.document?.name ?? "";
        return name ? `${name} - GMMC Scaling Ability` : "GMMC Scaling Ability";
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const itemData = this.item.flags;
        const moduleVersion = game.modules.get(GMM_MODULE_TITLE)?.version ?? "";

        // The forge template reads `cssClass`, which ApplicationV2 does not populate.
        context.cssClass = this.isEditable ? "editable" : "locked";
        context.editable = this.isEditable;

        context.gmm = {
            blueprint: itemData.gmm?.blueprint ? itemData.gmm.blueprint.data : null,
            action: itemData.gmm?.blueprint ? ActionForge.createArtifact(itemData.gmm.blueprint).data : null,
            version: moduleVersion,
            forge: {
                layout: itemData.gmm?.blueprint?.data?.display?.layout ? itemData.gmm.blueprint.data.display.layout : game.settings.get(GMM_MODULE_TITLE, "actionLayout"),
                colors: {
                    primary: itemData.gmm?.blueprint?.data?.display?.color?.primary ? itemData.gmm.blueprint.data.display.color.primary : game.settings.get(GMM_MODULE_TITLE, "actionPrimaryColor"),
                    secondary: itemData.gmm?.blueprint?.data?.display?.color?.secondary ? itemData.gmm.blueprint.data.display.color.secondary : game.settings.get(GMM_MODULE_TITLE, "actionSecondaryColor")
                },
                skins: {
                    artifact: itemData.gmm?.blueprint?.data?.display?.skin?.artifact ? itemData.gmm.blueprint.data.display.skin.artifact : game.settings.get(GMM_MODULE_TITLE, "actionArtifactSkin"),
                    blueprint: itemData.gmm?.blueprint?.data?.display?.skin?.blueprint ? itemData.gmm.blueprint.data.display.skin.blueprint : game.settings.get(GMM_MODULE_TITLE, "actionBlueprintSkin")
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
                rarities: GMM_ACTION_RARITIES,
                target_types: Activities.targetTypeOptions(),
                consumption_targets: this._getActionConsumptionTargets(this.item),
                ranks: Object.keys(GMM_MONSTER_RANKS).filter((x) => x != "custom"),
                roles: Object.keys(GMM_MONSTER_ROLES).filter((x) => x != "custom"),
                layouts: GMM_GUI_LAYOUTS,
                attack_types: GMM_ACTION_ATTACK_TYPES,
                attack_damage_types: GMM_ACTION_ATTACK_DAMAGE_TYPES,
                deferral_types: GMM_DEFERRAL_TYPES,
                duration_types: GMM_ACTION_DURATION_TYPES,
                reapply_modes: GMM_ACTION_REAPPLY_MODES,
                abilities: GMM_5E_ABILITIES,
                zone_terrain: GMM_ZONE_TERRAIN_TYPES,
                zone_triggers: GMM_ZONE_TRIGGERS,
                zone_payloads: GMM_ZONE_PAYLOADS,
                zone_audiences: GMM_ZONE_AUDIENCES
            }
        };

        context.gmm.target = { area: Activities.isAreaTarget(context.gmm.blueprint ?? {}) };
        context.gmm.zone = this._getZoneContext(context.gmm.blueprint);

        const duration = Durations.describe(context.gmm.blueprint);
        context.gmm.duration = {
            ...duration,
            missingLabel: duration.missing.map(id => game.modules.get(id)?.title ?? id).join(", ")
        };

        if (context.gmm.action) {
            try {
                context.gmm.action.gmmLabels = await this.item.getGmmLabels();
            } catch (e) {
                console.warn("GMM | ActionSheet: getGmmLabels failed", e);
            }
        }

        // dnd5e populates this from `_preparePartContext("effects")`, which the single forge part never hits.
        try {
            await this._prepareEffectsContext(context, options);
            this._gmmEnrichEffectModes(context);
        } catch (e) {
            console.warn("GMM | ActionSheet: _prepareEffectsContext failed", e);
        }

        return context;
    }

    /* `parentId` is left unset: `<dnd5e-effects>` resolves it through a `.items` collection an item has not got. */
    _gmmEnrichEffectModes(context) {
        const categories = context?.effects;
        if (!categories) return;
        const item = this.item;
        if (!item?.system?.activities?.has?.(Activities.GMM_ACTIVITY_ID)) return;
        for (const category of Object.values(categories)) {
            if (!Array.isArray(category?.effects)) continue;
            // GMMC forges these and rewrites them on every save. Offering them for editing would mislead.
            category.effects = category.effects.filter(e => !Activities.GMM_FORGED_EFFECT_IDS.has(e?.id));
            for (const entry of category.effects) {
                if (!entry) continue;
                entry.gmmCanToggleMode = true;
                entry.gmmAlwaysMode = !Activities.isEffectAppliedByGmmActivity(item, entry.id);
            }
        }
    }

    /* The legacy `item.system.consume.*` schema that used to drive this picker is gone from dnd5e v5.x. */
    _getActionConsumptionTargets(item) {
        try {
            const blueprintType = item?.flags?.gmm?.blueprint?.data?.resource_consumption?.type;
            if (!blueprintType) return {};
            const actor = item?.actor;
            if (!actor) return {};

            switch (blueprintType) {
                case "ammo":      return this._gmmAmmoTargets(actor, item);
                case "attribute": return this._gmmAttributeTargets(actor);
                case "material":  return this._gmmMaterialTargets(actor, item);
                case "charges":   return this._gmmChargesTargets(actor, item);
                default:          return {};
            }
        } catch (e) {
            console.warn("GMM | ActionSheet: _getActionConsumptionTargets failed", e);
            return {};
        }
    }

    _gmmAmmoTargets(actor, currentItem) {
        const targets = {};
        const isAmmo = (i) => (i.type === "consumable") && (i.system?.type?.value === "ammo");
        if (isAmmo(currentItem)) {
            targets[currentItem.id] = `${currentItem.name} (${currentItem.system.quantity ?? 0})`;
        }
        for (const i of actor.itemTypes?.consumable ?? []) {
            if (i === currentItem) continue;
            if (isAmmo(i)) targets[i.id] = `${i.name} (${i.system.quantity ?? 0})`;
        }
        return targets;
    }

    _gmmAttributeTargets(actor) {
        const targets = {};
        let attrs;
        try {
            attrs = TokenDocument.implementation?.getConsumedAttributes?.(actor.type) ?? null;
        } catch (e) { /* fall through */ }
        attrs ??= CONFIG?.DND5E?.consumableResources ?? [];
        for (const attr of attrs) targets[attr] = attr;
        return targets;
    }

    _gmmMaterialTargets(actor, currentItem) {
        const targets = {};
        for (const i of actor.items ?? []) {
            if (i === currentItem) continue;
            if (!["consumable", "loot"].includes(i.type)) continue;
            targets[i.id] = `${i.name} (${i.system?.quantity ?? 0})`;
        }
        return targets;
    }

    _gmmChargesTargets(actor, currentItem) {
        const targets = {};
        const fmt = (name, uses) => {
            if (!uses?.max) return name;
            const recovery = uses.recovery?.[0];
            if (recovery && (recovery.type === "recoverAll") && (recovery.period !== "recharge")
                && (uses.recovery.length === 1)) {
                const per = CONFIG.DND5E.limitedUsePeriods?.[recovery.period]?.abbreviation ?? recovery.period;
                return `${name} (${game.i18n.format("DND5E.AbilityUseConsumableLabel", { max: uses.max, per })})`;
            }
            if (recovery?.period === "recharge") {
                return `${name} (${game.i18n.localize("DND5E.Recharge")})`;
            }
            return `${name} (${game.i18n.format("DND5E.AbilityUseChargesLabel", { value: uses.value ?? uses.max })})`;
        };

        targets[""] = fmt(game.i18n.localize("DND5E.CONSUMPTION.Target.ThisItem") || currentItem.name,
            currentItem.system?.uses);
        for (const i of actor.items ?? []) {
            if (i === currentItem) continue;
            if (!i.system?.uses?.max) continue;
            targets[i.id] = fmt(i.name, i.system.uses);
        }
        return targets;
    }

    canExpand() {
        return false;
    }

    /* Suppress the dnd5e "mode slider" (`.mode-slider`): GMM's Forge UI is always editable and exposes its own controls. */
    _renderModeToggle() {
        const toggle = this.element?.querySelector(".window-header .mode-slider");
        if (toggle) toggle.remove();
    }

    /* The Forge UI provides its own controls, so dnd5e's create-child footer button means nothing here. */
    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        this.element?.querySelector(".window-content > .create-child")?.remove();
    }

    /* Insurance. */
    _activateEditor(_div) {}

    /* The Forge UI has no read-only variant to swap into. */
    _configureRenderOptions(options) {
        super._configureRenderOptions(options);
        this._mode = this.constructor.MODES.EDIT;
    }

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);
        this.element?.querySelector(".header-elements .source-book")?.remove();

        // Bridge the GMM Gui controller (still jQuery-based) to the V2 root element.
        const $el = $(this.element);
        try {
            this._gui.activateListeners($el);
            this._gui.applyTo($el);
        } catch (e) {
            console.warn("GMM | ActionSheet: Gui.activateListeners failed", e);
        }
    }

    /* Modal forms commit through their own roll buttons and must not submit the sheet. @inheritDoc */
    _onChangeForm(formConfig, event) {
        if (event?.target?.closest?.(".gmm-modal")) return;
        return super._onChangeForm(formConfig, event);
    }

    /** @inheritDoc */
    _processFormData(event, form, formData) {
        // The embedded modals sit inside the root form, so their named fields would submit as item updates.
        for (const name of Object.keys(formData.object)) {
            const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
            if (input?.closest(".gmm-modal")) delete formData.object[name];
        }
        // Call super so dnd5e's base item handling runs (system.properties filtering, etc.).
        const expanded = super._processFormData(event, form, formData);
        const target = event?.target;

        if (target) {
            const window = target.closest(".gmm-window") ?? this.element;
            try {
                this._gui.updateFrom(window);
            } catch (e) {
                console.warn("GMM | ActionSheet: Gui.updateFrom failed", e);
            }
        }

        // These blueprint fields are strings, and an emptied input submits null rather than "".
        if (expanded.gmm?.blueprint?.duration?.value === null) {
            expanded.gmm.blueprint.duration.value = "";
        } else if (expanded.gmm?.blueprint?.duration?.value !== undefined) {
            expanded.gmm.blueprint.duration.value = `${expanded.gmm.blueprint.duration.value}`;
        }
        if (expanded.gmm?.blueprint?.uses?.max === null) {
            expanded.gmm.blueprint.uses.max = "";
        }

        // The editor writes under `flags.*`, so the repackaging below would otherwise miss the description.
        const descText = expanded.flags?.gmm?.blueprint?.data?.description?.text;
        if (descText !== undefined) {
            CompatibilityHelpers.setProperty(expanded, "gmm.blueprint.description.text", descText);
        }

        if (CompatibilityHelpers.hasProperty(expanded, "gmm.blueprint")) {
            CompatibilityHelpers.setProperty(expanded, "flags.gmm.blueprint", {
                vid: 1,
                type: "action",
                data: CompatibilityHelpers.getProperty(expanded, "gmm.blueprint")
            });
            delete expanded.gmm;

            if (Activities.chargesWithoutPool(expanded.flags.gmm.blueprint)) {
                ui.notifications?.warn(game.i18n.localize("gmm.action.blueprint.activation_cost.charges_no_pool"));
            }

            // `this.item` lets ActionBlueprint pair a `-=<id>` deletion when an attack.type change swaps the activity.
            $.extend(true, expanded, ActionBlueprint.getItemDataFromBlueprint(expanded.flags.gmm.blueprint, this.item));
        }

        return expanded;
    }

    /** @this {ActionSheet} */
    static async #actionAddDamage(event, target) {
        event.preventDefault();
        return ActionSheet.#mutateBlueprintDamage.call(this, entries => {
            entries.push({ formula: "", type: "" });
        });
    }

    /** @this {ActionSheet} */
    static async #actionRemoveDamage(event, target) {
        event.preventDefault();
        const li = target.closest(".form-group--damage");
        const index = Number(li?.dataset?.index);
        return ActionSheet.#mutateBlueprintDamage.call(this, entries => {
            if (Number.isInteger(index) && index >= 0 && index < entries.length) {
                entries.splice(index, 1);
            }
        });
    }

    /* The blueprint flag is the UI source of truth, so a mutation drives off it rather than the activity. */
    static async #mutateBlueprintDamage(mutate) {
        const stored = this.item.flags?.gmm?.blueprint;
        const blueprint = foundry.utils.deepClone(stored ?? { vid: 1, type: "action", data: {} });
        blueprint.vid = 1;
        blueprint.type = "action";
        blueprint.data ??= {};

        // An earlier submit can have left the flag as a dotted-object shape (`{"0":{...},"1":{...}}`).
        const raw = foundry.utils.getProperty(blueprint.data, "attack.hit.damage");
        let entries;
        if (Array.isArray(raw)) {
            entries = raw.map(e => ({ formula: e?.formula ?? "", type: e?.type ?? "" }));
        } else if (raw && typeof raw === "object") {
            entries = Object.keys(raw)
                .filter(k => /^\d+$/.test(k))
                .sort((a, b) => Number(a) - Number(b))
                .map(k => ({ formula: raw[k]?.formula ?? "", type: raw[k]?.type ?? "" }));
        } else {
            entries = [];
        }

        mutate(entries);
        foundry.utils.setProperty(blueprint.data, "attack.hit.damage", entries);

        // The flag is rewritten wholesale, because a merge would leave a legacy dotted-object shape in place.
        const update = ActionBlueprint.getItemDataFromBlueprint(blueprint, this.item);
        update["flags.gmm.blueprint"] = blueprint;
        return this.item.update(update);
    }

    /* Normalized for the template, so a dotted-object shape left by an earlier submit still draws its rows. */
    _getZoneContext(blueprintData) {
        return {
            ...Activities.readZoneLists(blueprintData),
            available: Activities.isAreaTarget(blueprintData ?? {}),
            midi: !!game.modules.get("midi-qol")?.active
        };
    }

    /** @this {ActionSheet} */
    static async #actionAddTerrain(event, target) {
        event.preventDefault();
        return ActionSheet.#mutateBlueprintZone.call(this, "terrain", entries => {
            entries.push({ category: "difficult", custom: "" });
        });
    }

    /** @this {ActionSheet} */
    static async #actionRemoveTerrain(event, target) {
        event.preventDefault();
        const index = Number(target.closest(".form-group--terrain")?.dataset?.index);
        return ActionSheet.#mutateBlueprintZone.call(this, "terrain", entries => {
            if (Number.isInteger(index)) entries.splice(index, 1);
        });
    }

    /** @this {ActionSheet} */
    static async #actionAddZoneRule(event, target) {
        event.preventDefault();
        return ActionSheet.#mutateBlueprintZone.call(this, "rules", entries => {
            entries.push({ triggers: ["enter"], payload: "damage" });
        });
    }

    /** @this {ActionSheet} */
    static async #actionRemoveZoneRule(event, target) {
        event.preventDefault();
        const index = Number(target.closest(".form-group--zone-rule")?.dataset?.index);
        return ActionSheet.#mutateBlueprintZone.call(this, "rules", entries => {
            if (Number.isInteger(index)) entries.splice(index, 1);
        });
    }

    /* The twin of #mutateBlueprintDamage, down to rewriting the whole list to flatten a legacy shape. */
    static async #mutateBlueprintZone(key, mutate) {
        const stored = this.item.flags?.gmm?.blueprint;
        const blueprint = foundry.utils.deepClone(stored ?? { vid: 1, type: "action", data: {} });
        blueprint.vid = 1;
        blueprint.type = "action";
        blueprint.data ??= {};

        const entries = Activities.readZoneLists(blueprint.data)[key];
        mutate(entries);
        foundry.utils.setProperty(blueprint.data, `zone.${key}`, entries);

        const update = ActionBlueprint.getItemDataFromBlueprint(blueprint, this.item);
        update["flags.gmm.blueprint"] = blueprint;
        return this.item.update(update);
    }

    /* midi never exports the editor. Its sheet's action map is the only handle, and the handler reads nothing but `this.activity`. */
    static #actionOpenRegionBehaviors(event) {
        event.preventDefault();
        const activity = this.item.system?.activities?.get?.(Activities.GMM_ACTIVITY_ID);
        const open = activity?.constructor?.metadata?.sheetClass?.DEFAULT_OPTIONS?.actions?.openRegionBehaviorEditor;
        if (!open) return void ui.notifications?.warn(game.i18n.localize("gmm.action.blueprint.zone.no_editor"));
        open.call({ activity });
    }

    /** @this {ActionSheet} */
    static async #actionCreateEffect(event, target) {
        const li = target.closest(".effect-section");
        const effectType = li.dataset.effectType;
        const isEnchantment = effectType.startsWith("enchantment");

        // A temporary effect wants the chat card's Apply Effect button. A passive one wants to transfer.
        const defaultOnUse = effectType === "temporary";
        // An enchantment is magical by schema default. Only a plain effect takes the item's `mgc` property.
        const system = (!isEnchantment && CompatibilityHelpers.dnd5eAtLeast(6))
            ? { magical: !!this.document.system?.properties?.has?.("mgc") }
            : undefined;
        const created = await this.document.createEmbeddedDocuments("ActiveEffect", [{
            type: isEnchantment ? "enchantment" : "base",
            name: game.i18n.localize("gmm.common.effect.new"),
            img: this.document.img,
            origin: isEnchantment ? undefined : this.document.uuid,
            duration: effectType === "temporary" ? CompatibilityHelpers.effectRoundsDuration(1) : undefined,
            disabled: ["inactive", "enchantmentInactive"].includes(effectType),
            transfer: !isEnchantment && !defaultOnUse,
            system
        }]);

        if (!isEnchantment && defaultOnUse && this.item.system?.activities?.has?.(Activities.GMM_ACTIVITY_ID)) {
            const effect = created?.[0];
            if (effect) {
                try {
                    await Activities.setEffectMode(this.item, effect, false);
                } catch (e) {
                    console.warn("GMM | ActionSheet: default-onUse setEffectMode failed", e);
                }
            }
        }
        return created;
    }

    /** @this {ActionSheet} */
    static async #actionToggleEffectMode(event, target) {
        event?.preventDefault?.();
        const row = target.closest(".effect[data-effect-id]");
        const effectId = row?.dataset?.effectId;
        if (!effectId) return;
        const item = this.item;
        const effect = item?.effects?.get?.(effectId);
        if (!item || !effect) return;
        const currentlyApplied = Activities.isEffectAppliedByGmmActivity(item, effectId);
        try {
            await Activities.setEffectMode(item, effect, currentlyApplied);
        } catch (e) {
            console.warn("GMM | ActionSheet: setEffectMode failed", e);
        }
    }

    /** @this {ActionSheet} */
    static #actionEditImage(event, target) {
        const field = target.dataset.editImage;
        if (!field) return;
        const current = foundry.utils.getProperty(this.document, field) ?? "";
        return new foundry.applications.apps.FilePicker.implementation({
            type: "image",
            current,
            callback: path => {
                const update = { [field]: path };
                // Without the envelope's `vid`, `_verifyBlueprint` rejects the blueprint on the next render.
                if (field.startsWith("flags.gmm.blueprint.")) {
                    update["flags.gmm.blueprint.vid"] = 1;
                    update["flags.gmm.blueprint.type"] = "action";
                }

                if (field === "flags.gmm.blueprint.data.description.image") {
                    update.img = path;
                }
                return this.document.update(update);
            },
            top: this.position?.top ? this.position.top + 40 : null,
            left: this.position?.left ? this.position.left + 10 : null
        }).render({ force: true });
    }
}
