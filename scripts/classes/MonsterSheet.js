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
import { GMM_MODULE_TITLE } from "../consts/GmmModuleTitle.js";
import Gui from "./Gui.js";
import ModalAbilityCheck from "../modals/ModalAbilityCheck.js";
import ModalBasicAttackAc from "../modals/ModalBasicAttackAc.js";
import ModalBasicAttackSave from "../modals/ModalBasicAttackSave.js";
import ModalBasicDamage from "../modals/ModalBasicDamage.js";
import ModalSavingThrow from "../modals/ModalSavingThrow.js";
import MonsterBlueprint from "./MonsterBlueprint.js";
import Templates from "./Templates.js";
import CompatibilityHelpers from "./CompatibilityHelpers.js";
import Activities from "./Activities.js";

/* The Forge UI replaces the stock NPC parts entirely, so much of this class undoes inherited behavior. */
export default class MonsterSheet extends dnd5e.applications.actor.NPCActorSheet {

    constructor(options = {}) {
        // Merged rather than replaced, so a caller passing one axis does not lose the other.
        options.position = { ...MonsterSheet.DEFAULT_OPTIONS.position, ...(options.position ?? {}) };
        super(options);
        this._gui = new Gui();
        this._saveSheetPosition = () => {};
    }

    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ["gmm-window", "window--monster"],
        position: { width: 540, height: 900 },
        window: { resizable: true },
        actions: {
            "add-item": MonsterSheet.#actionAddItem,
            "edit-item": MonsterSheet.#actionEditItem,
            "delete-item": MonsterSheet.#actionDeleteItem,
            "roll-item": MonsterSheet.#actionRollItem,
            "display-item": MonsterSheet.#actionDisplayItem,
            "recharge-item": MonsterSheet.#actionRechargeItem,
            "create-effect": MonsterSheet.#actionCreateEffect,
            "toggle-effect-mode": MonsterSheet.#actionToggleEffectMode,
            "roll-hp": MonsterSheet.#actionRollHp,
            "edit-image": MonsterSheet.#actionEditImage
        }
    };

    /* PARTS is not merged across the inheritance chain, so this supplants the parent outright. @inheritDoc */
    static PARTS = {
        forge: {
            template: "modules/giffyglyph-monster-maker-continued/templates/monster/forge.html",
            scrollable: [".forge__blueprint", ".forge__artifact"]
        }
    };

    /* Clear the inherited `static TABS` so the framework doesn't try to render a `tabs` part we never declare. @inheritDoc */
    static TABS = [];

    /* Inherited dnd5e styling, kept out because the markup it targets is no longer rendered. */
    static #STRIPPED_CLASSES = new Set([
        "dnd5e2",
        "actor",
        "npc",
        "vertical-tabs",
        "standard-form",
        "hidden-title"
    ]);

    /** @inheritDoc */
    _initializeApplicationOptions(options) {
        const opts = super._initializeApplicationOptions(options);
        opts.classes = (opts.classes ?? []).filter(c => !MonsterSheet.#STRIPPED_CLASSES.has(c));
        return opts;
    }

    /** @inheritDoc */
    get title() {
        const name = this.actor?.name ?? this.document?.name ?? "";
        return name ? `${name} - GMMC Scaling Monster` : "GMMC Scaling Monster";
    }

    /** @inheritDoc */
    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actorData = this.actor.flags;
        const moduleVersion = game.modules.get(GMM_MODULE_TITLE)?.version ?? "";

        // The forge templates read `cssClass`, which ApplicationV2 does not populate.
        context.cssClass = this.isEditable ? "editable" : "locked";
        context.editable = this.isEditable;
        // dnd5e sets this in `_prepareHeaderContext`, which never runs because the forge part replaces its header.
        context.showRests = game.user.isGM || (this.actor.isOwner && game.settings.get("dnd5e", "allowRests"));

        context.gmm = {
            blueprint: actorData.gmm?.blueprint ? actorData.gmm.blueprint.data : null,
            monster: actorData.gmm?.monster ? actorData.gmm.monster.data : null,
            version: moduleVersion,
            forge: {
                layout: actorData.gmm?.blueprint?.data?.display?.layout ? actorData.gmm.blueprint.data.display.layout : game.settings.get(GMM_MODULE_TITLE, "monsterLayout"),
                colors: {
                    primary: actorData.gmm?.blueprint?.data?.display?.color?.primary ? actorData.gmm.blueprint.data.display.color.primary : game.settings.get(GMM_MODULE_TITLE, "monsterPrimaryColor"),
                    secondary: actorData.gmm?.blueprint?.data?.display?.color?.secondary ? actorData.gmm.blueprint.data.display.color.secondary : game.settings.get(GMM_MODULE_TITLE, "monsterSecondaryColor")
                },
                skins: {
                    artifact: actorData.gmm?.blueprint?.data?.display?.skin?.artifact ? actorData.gmm.blueprint.data.display.skin.artifact : game.settings.get(GMM_MODULE_TITLE, "monsterArtifactSkin"),
                    blueprint: actorData.gmm?.blueprint?.data?.display?.skin?.blueprint ? actorData.gmm.blueprint.data.display.skin.blueprint : game.settings.get(GMM_MODULE_TITLE, "monsterBlueprintSkin")
                }
            },
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

        if (context.gmm.blueprint) {
            if (context.gmm.blueprint.spellbook?.spells) {
                context.gmm.blueprint.spellbook.total = Object.entries(context.gmm.blueprint.spellbook.spells).reduce((a, b) => a + b[1].length, 0);
            }
        }

        if (context.gmm.monster) {
            const actionTypes = ["bonus_actions.items", "actions.items", "reactions.items", "lair_actions.items", "legendary_actions.items", "traits.items", "inventory.items", "spellbook.spells.0", "spellbook.spells.1", "spellbook.spells.2", "spellbook.spells.3", "spellbook.spells.4", "spellbook.spells.5", "spellbook.spells.6", "spellbook.spells.7", "spellbook.spells.8", "spellbook.spells.9", "spellbook.spells.other"];

            for (const type of actionTypes) {
                let promises = this._getItemMapping(type, context.gmm.monster);
                if (promises) {
                    await Promise.all(promises).then(function (results) {
                        CompatibilityHelpers.setProperty(context.gmm.monster, type, results);
                    });
                }
            }

            let maximum_spell_level = 0;
            for (let i = 1; i < 10; i++) {
                if (context.gmm.monster.spellbook.spells[i].length > 0 || context.gmm.monster.spellbook.slots[i].maximum > 0) {
                    maximum_spell_level = i;
                }
            }
            if (context.gmm.monster.spellbook.slots.pact.maximum > 0) {
                maximum_spell_level = Math.max(maximum_spell_level, context.gmm.monster.spellbook.slots.pact.level);
            }
            context.gmm.monster.spellbook.maximum_visible_spell_level = maximum_spell_level;

            ["bonus_actions", "actions", "reactions", "traits", "paragon_actions", "paragon_defenses", "legendary_actions", "lair_actions", "legendary_resistances"].forEach((x) => {
                if (context.gmm.monster[x].visible) {
                    if (context.gmm.monster.features) {
                        context.gmm.monster.features.visible = true;
                    } else {
                        context.gmm.monster.features = {
                            visible: true
                        };
                    }
                }
            });
        }

        // dnd5e populates this from `_preparePartContext("effects")`, which the single forge part never hits.
        try {
            await this._prepareEffectsContext(context, options);
            this._gmmEnrichEffectModes(context);
        } catch (e) {
            console.warn("GMM | MonsterSheet: _prepareEffectsContext failed", e);
        }

        return context;
    }

    /* Effects directly on the actor are skipped: they have no activity to attach to. */
    _gmmEnrichEffectModes(context) {
        const categories = context?.effects;
        if (!categories) return;
        for (const category of Object.values(categories)) {
            if (!Array.isArray(category?.effects)) continue;
            // GMMC forges these and rewrites them on every save. A mode toggle would misapply the doom.
            category.effects = category.effects.filter(e => !Activities.GMM_FORGED_EFFECT_IDS.has(e?.id));
            for (const entry of category.effects) {
                if (!entry?.parentId) continue;
                const item = this.actor.items.get(entry.parentId);
                if (!item) continue;
                if (!item.system?.activities?.has?.(Activities.GMM_ACTIVITY_ID)) continue;
                entry.gmmCanToggleMode = true;
                entry.gmmAlwaysMode = !Activities.isEffectAppliedByGmmActivity(item, entry.id);
            }
        }
    }

    _getItemMapping(type, monster) {
        let items = CompatibilityHelpers.getProperty(monster, type);
        let mappedItems;
        if (items) {
            mappedItems = items.map(async (y) => {
                let item = this.actor.items.get(y.id);
                item.gmmLabels = await item.getGmmLabels();
                return item;
            });
        }
        return mappedItems;
    }

    /* `_onRender` decorates stock parts the forge never renders, so these would throw. */
    _renderCreateInventory() {}
    _renderAttunement() {}
    _renderSpellbook() {}

    canExpand() {
        return false;
    }

    /* Suppress the dnd5e "mode slider" (`.mode-slider`): GMM's Forge UI is always editable and exposes its own controls. */
    _renderModeToggle() {
        const toggle = this.element?.querySelector(".window-header .mode-slider");
        if (toggle) toggle.remove();
    }

    /* The forge has its own per-section Add buttons, so dnd5e's footer button means nothing here. */
    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);
        this.element?.querySelector(".window-content > .create-child")?.remove();
    }

    /** @inheritDoc */
    async _onRender(context, options) {
        await super._onRender(context, options);

        // `renderNPCActorSheet` still fires despite the omitted `dnd5e2` class, and pre-v14 gets native DOM.
        const generation = game.release?.generation ?? (Number.parseInt(game.version, 10) || 0);
        if (generation < 14 && this.element && typeof this.element.hasClass !== "function") {
            this.element.hasClass = (cls) => cls === "dnd5e2" || this.element.classList.contains(cls);
        }

        this.element?.querySelector(".header-elements .cr-xp")?.remove();
        this.element?.querySelector(".header-elements .source-book")?.remove();

        // Bridge the GMM Gui controller and modal helpers (which still use jQuery) to the V2 root element.
        const $el = $(this.element);
        try {
            this._gui.activateListeners($el);
            this._gui.applyTo($el);
        } catch (e) {
            console.warn("GMM | MonsterSheet: Gui.activateListeners failed", e);
        }

        try {
            $el.find('.ability-ranking .move-up, .ability-ranking .move-down').click(this._updateAbilityRanking.bind(this));
            $el.find('.monster__panels .accordion-section__title').click((e) => e.stopPropagation());
            $el.find('.item .item__title input').click((e) => e.stopPropagation());
            $el.find('.item .item__title').click(this._toggleItemDetails.bind(this));
            // These inputs carry no `name`, so the V2 auto-submit ignores them and they write directly.
            $el.find('[data-action="update-item"]').change((e) => this._updateItem(e));

            [ModalAbilityCheck, ModalBasicAttackAc, ModalBasicAttackSave, ModalBasicDamage, ModalSavingThrow].forEach((x) => {
                x.activateListeners($el, this.actor);
            });
        } catch (e) {
            console.warn("GMM | MonsterSheet: listener attachment failed", e);
        }
    }

    /* Modal forms commit through their own roll buttons and must not submit the sheet. @inheritDoc */
    _onChangeForm(formConfig, event) {
        if (event?.target?.closest?.(".gmm-modal")) return;
        return super._onChangeForm(formConfig, event);
    }

    /* The form fields carry dotted names like `gmm.blueprint.combat.rank.type`. @inheritDoc */
    _processFormData(event, form, formData) {
        // The embedded modals sit inside the root form, so their named fields would submit as actor updates.
        for (const name of Object.keys(formData.object)) {
            const input = form.querySelector(`[name="${CSS.escape(name)}"]`);
            if (input?.closest(".gmm-modal")) delete formData.object[name];
        }
        // Call super so dnd5e's base handling runs (wildcard-token guard, flag `-=` cleanup, CR coercion).
        const expanded = super._processFormData(event, form, formData);
        const target = event?.target;

        if (target) {
            const window = target.closest(".gmm-window") ?? this.element;
            try {
                this._gui.updateFrom(window);
            } catch (e) {
                console.warn("GMM | MonsterSheet: Gui.updateFrom failed", e);
            }
        }

        if (CompatibilityHelpers.hasProperty(expanded, "gmm.blueprint")) {
            // `{{editor}}` writes under `flags.*`, so the blueprint envelope would otherwise miss it.
            const bioText = expanded.flags?.gmm?.blueprint?.data?.biography?.text;
            if (bioText !== undefined) {
                CompatibilityHelpers.setProperty(expanded, "gmm.blueprint.biography.text", bioText);
            }

            CompatibilityHelpers.setProperty(expanded, "flags.gmm.blueprint", {
                vid: 1,
                type: "monster",
                data: CompatibilityHelpers.getProperty(expanded, "gmm.blueprint")
            });
            delete expanded.gmm;

            if (target?.name === "gmm.blueprint.combat.rank.type") {
                expanded.flags.gmm.blueprint.data.combat.rank.custom_name = null;
                expanded.flags.gmm.blueprint.data.combat.rank.modifiers = GMM_MONSTER_RANKS[target.value];
            } else if (target?.name === "gmm.blueprint.combat.role.type") {
                expanded.flags.gmm.blueprint.data.combat.role.custom_name = null;
                expanded.flags.gmm.blueprint.data.combat.role.modifiers = GMM_MONSTER_ROLES[target.value];
            }

            $.extend(true, expanded, MonsterBlueprint.getActorDataFromBlueprint(expanded.flags.gmm.blueprint, this.actor));
        }

        return expanded;
    }

    /* The core handler reads `data-item-id`, so an item-owned effect would drag an empty payload. @inheritDoc */
    async _onDragStart(event) {
        const row = event.currentTarget?.closest?.(".effect[data-effect-id][data-parent-id]");
        const effect = row ? this.actor.items.get(row.dataset.parentId)?.effects?.get(row.dataset.effectId) : null;
        if (!effect) return super._onDragStart(event);
        event.dataTransfer.setData("text/plain", JSON.stringify(effect.toDragData()));
    }

    /** @inheritDoc */
    _onDropResetData(event, itemData) {
        super._onDropResetData(event, itemData);
        if (!itemData.system) return;
        ["proficient"].forEach(k => foundry.utils.deleteProperty(itemData.system, k));
    }

    /* Sorting is scoped to `getSortingCategory()`, so a trait never reorders against an action. @inheritDoc */
    _onSortItem(event, item) {
        if (this.actor.isToken) return;
        const source = item;
        // Two abilities may share a sort. The helper reindexes ties in the order it is handed them.
        const siblings = this.actor.items.contents.filter((i) => {
            return (i.getSortingCategory() === source.getSortingCategory()) && (i.id !== source.id);
        }).sort(MonsterBlueprint.compareItemsForDisplay);
        const dropTarget = event.target.closest(".item");
        const targetId = dropTarget ? dropTarget.dataset?.itemId : null;
        const target = siblings.find(s => s.id === targetId);
        if (target && (target.getSortingCategory() !== source.getSortingCategory())) return;

        const sortUpdates = foundry.utils.performIntegerSort(source, { target: target, siblings });
        const updateData = sortUpdates.map(u => {
            const update = u.update;
            update._id = u.target.id;
            return update;
        });

        return this.actor.updateEmbeddedDocuments("Item", updateData);
    }

    static async #actionAddItem(event, target) {
        const type = target.dataset.type;

        if (type === "loot") {
            // Loot is never a scaling action.
            const itemData = {
                name: game.i18n.format("DND5E.ItemNew", { type: game.i18n.localize(CONFIG.Item.typeLabels[type]) }),
                type
            };
            return this.actor.createEmbeddedDocuments("Item", [itemData]);
        }

        if (type === "spell") {
            // Spells keep the dnd5e sheet and never scale.
            const level = Number(target.dataset.level ?? 0) || 0;
            const preparationMode = target.dataset["preparation.mode"] || "prepared";
            let method = "spell";
            let prepared = 1;
            if (preparationMode === "always") {
                method = "spell";
                prepared = 2;
            } else if (preparationMode && preparationMode !== "prepared") {
                method = preparationMode;
                prepared = 0;
            }

            const itemData = {
                name: game.i18n.format("DND5E.ItemNew", { type: game.i18n.localize(CONFIG.Item.typeLabels.spell) }),
                type: "spell",
                system: { level, method, prepared }
            };
            return this.actor.createEmbeddedDocuments("Item", [itemData]);
        }

        const activationType = target.dataset["activation.type"] || "trait";

        // Minimal on purpose: `GMM_ACTION_BLUEPRINT` supplies the rest on the next prepare.
        const blueprint = {
            vid: 1,
            type: "action",
            data: {
                activation: {
                    cost: null,
                    // "trait" actions have no activation type. Everything else uses the dataset value.
                    type: activationType === "trait" ? null : activationType,
                    condition: null
                },
                attack: {
                    type: null,
                    defense: "str",
                    bonus: null,
                    related_stat: "max"
                }
            }
        };

        const activityData = Activities.buildActivityData(blueprint);
        const itemData = {
            name: game.i18n.format(`gmm.monster.artifact.add.${activationType}`),
            type,
            img: "icons/svg/clockwork.svg",
            system: {
                activities: { [Activities.GMM_ACTIVITY_ID]: activityData }
            },
            // Nested, because Foundry reads the bound sheet from `document.flags.core.sheetClass`.
            flags: {
                core: { sheetClass: `${GMM_MODULE_TITLE}.ActionSheet` },
                gmm: { blueprint }
            }
        };

        return this.actor.createEmbeddedDocuments("Item", [itemData]);
    }

    /** @this {MonsterSheet} */
    static #actionEditItem(event, target) {
        const li = target.closest(".item");
        const item = this.actor.items.get(li.dataset.itemId);
        item.sheet.render(true);
    }

    /** @this {MonsterSheet} */
    static #actionDeleteItem(event, target) {
        const li = target.closest(".item");
        return this.actor.deleteEmbeddedDocuments("Item", [li.dataset.itemId]);
    }

    /** @this {MonsterSheet} */
    static #actionRollItem(event, target) {
        const li = target.closest(".item");
        const item = this.actor.items.get(li.dataset.itemId);
        // `item.use()` would offer an activity chooser once a deferred action carries two.
        const primary = item.system?.activities?.get?.(Activities.GMM_ACTIVITY_ID);
        return primary ? primary.use() : item.use();
    }

    /** @this {MonsterSheet} */
    static async #actionDisplayItem(event, target) {
        const li = target.closest(".item");
        const item = this.actor.items.get(li.dataset.itemId);
        const data = await item.displayCard({ createMessage: false });
        if (!data) return;
        if (typeof data.content === "string") {
            const DIV = document.createElement("DIV");
            DIV.innerHTML = data.content;
            DIV.querySelector("div.card-buttons")?.remove();
            data.content = DIV.innerHTML;
        }
        return ChatMessage.create(data);
    }

    /** @this {MonsterSheet} */
    static #actionRechargeItem(event, target) {
        const li = target.closest(".item");
        const item = this.actor.items.get(li.dataset.itemId);
        if (!item) return;
        if (item.system?.uses?.rollRecharge) return item.system.uses.rollRecharge();
        return item.rollRecharge?.();
    }

    /** @this {MonsterSheet} */
    static #actionCreateEffect(event, target) {
        const li = target.closest(".effect-section");
        const isEnchantment = li.dataset.effectType.startsWith("enchantment");
        return this.document.createEmbeddedDocuments("ActiveEffect", [{
            type: isEnchantment ? "enchantment" : "base",
            name: game.i18n.localize("gmm.common.effect.new"),
            img: "icons/svg/aura.svg",
            origin: isEnchantment ? undefined : this.document.uuid,
            duration: li.dataset.effectType === "temporary" ? CompatibilityHelpers.effectRoundsDuration(1) : undefined,
            disabled: ["inactive", "enchantmentInactive"].includes(li.dataset.effectType)
        }]);
    }

    /* The owning item comes from the row's `data-parent-id`, not from the effect. @this {MonsterSheet} */
    static async #actionToggleEffectMode(event, target) {
        event?.preventDefault?.();
        const row = target.closest(".effect[data-effect-id]");
        const effectId = row?.dataset?.effectId;
        const parentId = row?.dataset?.parentId;
        if (!effectId || !parentId) return;
        const item = this.actor.items.get(parentId);
        const effect = item?.effects?.get?.(effectId);
        if (!item || !effect) return;
        const currentlyApplied = Activities.isEffectAppliedByGmmActivity(item, effectId);
        try {
            await Activities.setEffectMode(item, effect, currentlyApplied);
        } catch (e) {
            console.warn("GMM | MonsterSheet: setEffectMode failed", e);
        }
    }

    /** @this {MonsterSheet} */
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
                    update["flags.gmm.blueprint.type"] = "monster";
                }

                if (field === "flags.gmm.blueprint.data.description.image") {
                    const currentActorImg = this.document.img ?? "";
                    const currentTokenImg = this.document.prototypeToken?.texture?.src
                        ?? this.document._source?.prototypeToken?.texture?.src
                        ?? "";
                    const tokenImageIsSynced = currentTokenImg === currentActorImg;
                    update.img = path;
                    if (tokenImageIsSynced) {
                        update["prototypeToken.texture.src"] = path;
                    }
                }
                return this.document.update(update);
            },
            top: this.position?.top ? this.position.top + 40 : null,
            left: this.position?.left ? this.position.left + 10 : null
        }).render({ force: true });
    }

    /** @this {MonsterSheet} */
    static async #actionRollHp(event, target) {
        const button = target.closest("button");
        const roll = new Roll(button.dataset.formula);
        await roll.roll();
        foundry.audio.AudioHelper.play({ src: CONFIG.sounds.dice });
        return this.actor.update({
            [`system.attributes.hp.value`]: Math.max(1, roll.total),
            [`system.attributes.hp.max`]: Math.max(1, roll.total),
            [`flags.gmm.blueprint.data.hit_points.rolled_max`]: Math.max(1, roll.total),
        });
    }

    _toggleItemDetails(event) {
        if (event.target.closest("button, input, a")) return;
        const item = event.currentTarget.closest(".item");
        item.classList.toggle("expanded");
    }

    _updateItem(event) {
        const input = event.currentTarget.closest("input");
        const field = input.dataset.field;
        const target = input.dataset.target;
        const value = event.currentTarget.value;
        const item = this.actor.items.get(target);
        if (!item) return;

        // `uses.value` is derived in dnd5e 5.x, so a typed remaining count has to become `spent`.
        if (field === "system.uses.value") {
            const max = parseInt(item.system?.uses?.max);
            const remaining = Math.max(0, parseInt(value) || 0);
            const spent = Number.isFinite(max) ? Math.max(0, max - remaining) : 0;
            return item.update({ "system.uses.spent": spent });
        }

        return item.update({ [field]: value });
    }

    /* Written directly because Gui's reorder dispatches no `change` event to auto-submit. */
    _updateAbilityRanking(event) {
        const rankings = [];
        event.currentTarget.closest(".accordion-section__body")
            .querySelectorAll("[name='gmm.blueprint.ability_modifiers.ranking']")
            .forEach(x => rankings.push(x.value));
        return this.document.update({
            "flags.gmm.blueprint.data.ability_modifiers.ranking": rankings
        });
    }
}
