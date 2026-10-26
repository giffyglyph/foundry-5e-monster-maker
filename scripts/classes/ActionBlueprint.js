import { GMM_ACTION_BLUEPRINT } from "../consts/GmmActionBlueprint.js";
import { GMM_DESCRIPTION_REPLACEMENTS, isDescriptionEffectivelyEmpty } from "../consts/GmmDescriptionReplacements.js";
import Activities from "./Activities.js";
import CompatibilityHelpers from "./CompatibilityHelpers.js";

/* In dnd5e v5.x the per-use fields live on the activity, so the blueprint mirrors two documents, not one. */
const ActionBlueprint = (function () {

    /* The fields dnd5e v5.x left on the document rather than moving to the activity. */
    const itemMappings = [
        { from: "description.image", to: "img" },
        { from: "description.name", to: "name" },
        { from: "description.text", to: "system.description.value" }
    ];

    function createFromItem(item) {
        const blueprint = $.extend(true, {}, GMM_ACTION_BLUEPRINT, item.flags.gmm ? _verifyBlueprint(item.flags.gmm.blueprint) : null);
        return _syncItemDataToBlueprint(blueprint, item);
    }

    function _verifyBlueprint(blueprint) {
        // A direct-leaf write to `flags.gmm.blueprint.data.<x>` leaves the envelope without a `vid`.
        if (blueprint && blueprint.vid === undefined && blueprint.data) {
            blueprint.vid = 1;
            if (!blueprint.type) blueprint.type = "action";
        }
        switch (blueprint?.vid) {
            case 1:
                return blueprint;
            default:
                console.error(game.i18n.format("gmm.action.errors.invalid_version", { vid: blueprint?.vid }), blueprint);
                return null;
        }
    }

    function _syncItemDataToBlueprint(blueprint, item) {
        const blueprintData = blueprint.data;
        try {
            itemMappings.forEach((x) => {
                if (CompatibilityHelpers.hasProperty(item, x.to)) {
                    CompatibilityHelpers.setProperty(blueprintData, x.from, CompatibilityHelpers.getProperty(item, x.to));
                }
            });

            // A deferral splits these across two activities. Falling back to the primary covers an unmigrated item.
            const activities = item.system?.activities;
            const primaryActivity = activities?.get?.(Activities.GMM_ACTIVITY_ID);
            const gateActivity = activities?.get?.(Activities.gateActivityId(blueprint)) ?? primaryActivity;
            const damageActivity = activities?.get?.(Activities.payloadActivityId(blueprint)) ?? primaryActivity;
            if (primaryActivity) {
                Activities.readActivityIntoBlueprintData(primaryActivity, blueprintData, {
                    gate: gateActivity === primaryActivity,
                    damage: damageActivity === primaryActivity,
                    authoredType: item._source?.flags?.gmm?.blueprint?.data?.duration?.type ?? null
                });
            }
            if (gateActivity && gateActivity !== primaryActivity) {
                Activities.readActivityIntoBlueprintData(gateActivity, blueprintData, {
                    shared: false,
                    damage: damageActivity === gateActivity
                });
            }
            if (damageActivity && damageActivity !== primaryActivity && damageActivity !== gateActivity) {
                Activities.readActivityIntoBlueprintData(damageActivity, blueprintData, { shared: false, gate: false });
            }

            Activities.readItemUsesIntoBlueprintData(item, blueprintData);

            return blueprint;
        } catch (error) {
            console.error("Failed to load blueprint data from the current item", error);
            return blueprint;
        }
    }

    /* Returns a mix of nested item-level fields and dotted activity paths, not one uniform shape. */
    function getItemDataFromBlueprint(blueprint, item = null) {
        const itemData = {};

        itemMappings.forEach((x) => {
            if (CompatibilityHelpers.hasProperty(blueprint.data, x.from)) {
                CompatibilityHelpers.setProperty(itemData, x.to, CompatibilityHelpers.getProperty(blueprint.data, x.from));
            }
        });

        if (!CompatibilityHelpers.hasProperty(blueprint.data, "description.text")) {
            CompatibilityHelpers.setProperty(itemData, "system.description.value", "");
        }

        const activityUpdate = Activities.buildActivityUpdate(item, blueprint);
        // On v13 `item.update` silently drops a dotted `system.*` key beside a nested `system` object.
        for (const [key, value] of Object.entries(activityUpdate)) {
            CompatibilityHelpers.setProperty(itemData, key, value);
        }

        return itemData;
    }

    /* For an item that has never been a scaling action, so nothing may be assumed already present. */
    function deriveFromVanillaItem(item) {
        const blueprint = $.extend(true, {}, GMM_ACTION_BLUEPRINT, { vid: 1, type: "action" });
        const blueprintData = blueprint.data;

        itemMappings.forEach((x) => {
            if (CompatibilityHelpers.hasProperty(item, x.to)) {
                CompatibilityHelpers.setProperty(blueprintData, x.from, CompatibilityHelpers.getProperty(item, x.to));
            }
        });

        // An imported description carries vanilla enricher syntax that GMMC shortcodes have to replace.
        try {
            _applyDescriptionReplacements(blueprintData);
        } catch (e) {
            console.warn("GMM | deriveFromVanillaItem: description replacement pass failed", e);
        }

        const primary = Activities.pickPrimaryActivity(item);
        if (primary) {
            try {
                Activities.readActivityIntoBlueprintData(primary, blueprintData);
            } catch (e) {
                console.warn("GMM | deriveFromVanillaItem: readActivityIntoBlueprintData failed", e);
            }
        }

        try {
            Activities.readItemUsesIntoBlueprintData(item, blueprintData);
        } catch (e) {
            console.warn("GMM | deriveFromVanillaItem: readItemUsesIntoBlueprintData failed", e);
        }

        try {
            Activities.applyItemLevelFallbacks(item, blueprintData);
        } catch (e) {
            console.warn("GMM | deriveFromVanillaItem: applyItemLevelFallbacks failed", e);
        }

        try {
            blueprintData.attack ??= {};
            const current = blueprintData.attack.type;
            if (current === undefined || current === null || current === "") {
                const inferred = Activities.inferAttackType(item, primary);
                if (inferred) blueprintData.attack.type = inferred;
            }
            if (["mwak", "msak", "rwak", "rsak"].includes(blueprintData.attack.type)) {
                blueprintData.attack.related_stat = "max";
            }
        } catch (e) {
            console.warn("GMM | deriveFromVanillaItem: attack-type inference failed", e);
        }

        return blueprint;
    }

    /* Substitution can leave only HTML scaffolding behind, which would render as an empty `<p></p>`. */
    function _applyDescriptionReplacements(blueprintData) {
        const text = blueprintData?.description?.text;
        if (typeof text !== "string" || !text.length) return;
        let next = text;
        for (const rule of GMM_DESCRIPTION_REPLACEMENTS) {
            if (!rule?.pattern) continue;
            next = next.replace(rule.pattern, rule.replacement ?? "");
        }
        if (isDescriptionEffectivelyEmpty(next)) next = "";
        if (next !== text) {
            blueprintData.description ??= {};
            blueprintData.description.text = next;
        }
    }

    return {
        createFromItem,
        getItemDataFromBlueprint,
        deriveFromVanillaItem
    };
})();

export default ActionBlueprint;
