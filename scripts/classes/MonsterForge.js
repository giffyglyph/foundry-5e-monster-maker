import Dice from "./Dice.js";
import MonsterHelpers from "./MonsterHelpers.js";
import { GMM_5E_ABILITIES } from "../consts/Gmm5eAbilities.js";
import { GMM_5E_LANGUAGES } from "../consts/Gmm5eLanguages.js";
import { GMM_5E_DAMAGE_TYPES } from "../consts/Gmm5eDamageTypes.js";
import { GMM_5E_CONDITIONS } from "../consts/Gmm5eConditions.js";
import { GMM_5E_SKILLS } from "../consts/Gmm5eSkills.js";
import { GMM_5E_SIZES } from "../consts/Gmm5eSizes.js";
import { GMM_5E_SPEEDS } from "../consts/Gmm5eSpeeds.js";
import { GMM_5E_SENSES } from "../consts/Gmm5eSenses.js";
import DerivedAttribute from "./DerivedAttribute.js";
import CompatibilityHelpers from "./CompatibilityHelpers.js";

const MonsterForge = (function () {

    function createArtifact(blueprint, options = {}) {
        const derivedAttributes = MonsterHelpers.getDerivedAttributes(
            blueprint.data.combat.level,
            blueprint.data.combat.rank,
            blueprint.data.combat.role
        );
        const monsterProficiency = _parseProficiency(derivedAttributes, blueprint.data.proficiency_bonus);
        const monsterAbilityModifiers = _parseAbilityModifiers(derivedAttributes, blueprint.data.ability_modifiers);
        const monsterCheckModifiers = _parseCheckModifiers(options.checkBonuses);
        const monsterRank = _parseRank(derivedAttributes.rank);
        const monsterRole = _parseRole(derivedAttributes.role);
        const monsterSkills = _parseSkills(monsterProficiency.value, blueprint.data.skills, derivedAttributes.role);
        const monsterInventoryWeight = _getInventoryWeight(blueprint.data);
        const monsterInventoryCapacity = _getInventoryCapacity(monsterAbilityModifiers, blueprint.data);
        const monsterClasses = blueprint.data.traits.items.filter((x) => x.class);
        const showLegendaryActions = blueprint.data.legendary_actions.always_show || blueprint.data.legendary_actions.maximum > 0 || blueprint.data.legendary_actions.items.length > 0;
        const ignoreItemRequirements = blueprint.data.display.ignore_item_requirements;
        const monsterParagonDefenses = _parseParagonDefenses(derivedAttributes.rank, blueprint.data.paragon_defenses, derivedAttributes.level);

        return {
            vid: 1,
            type: blueprint.type,
            data: {
                ability_modifiers: monsterAbilityModifiers,
                actions: _parseActions(derivedAttributes, blueprint.data.actions, ignoreItemRequirements),
                armor_class: _parseArmorClass(derivedAttributes, blueprint.data.armor_class),
                attack_bonus: _parseAttackBonus(monsterProficiency.value, blueprint.data.attack_bonus),
                attack_dcs: _parseAttackDcs(monsterProficiency.value, blueprint.data.attack_dcs),
                biography: _parseBiography(blueprint.data.biography),
                bonus_actions: _parseBonusActions(derivedAttributes, blueprint.data.bonus_actions, ignoreItemRequirements),
                challenge_rating: _parseChallengeRating(derivedAttributes, blueprint.data.challenge_rating),
                check_modifiers: monsterCheckModifiers,
                condition_immunities: _parseCollection(GMM_5E_CONDITIONS, blueprint.data.condition_immunities, "condition"),
                damage_immunities: _parseCollection(GMM_5E_DAMAGE_TYPES, blueprint.data.damage_immunities, "damage"),
                damage_per_action: _parseDamagePerAction(derivedAttributes, blueprint.data.damage_per_action),
                damage_resistances: _parseCollection(GMM_5E_DAMAGE_TYPES, blueprint.data.damage_resistances, "damage"),
                damage_vulnerabilities: _parseCollection(GMM_5E_DAMAGE_TYPES, blueprint.data.damage_vulnerabilities, "damage"),
                description: _parseDescription(blueprint.data.description),
                hit_points: _parseHitPoints(derivedAttributes, blueprint.data.hit_points),
                image: blueprint.data.description.image,
                initiative: _parseInitiative(monsterAbilityModifiers, derivedAttributes.rank, derivedAttributes.role, blueprint.data.initiative, monsterProficiency.value),
                inventory: _parseInventory(monsterInventoryWeight, monsterInventoryCapacity, blueprint.data.inventory),
                lair_actions: _parseLairActions(derivedAttributes, blueprint.data.lair_actions, ignoreItemRequirements),
                languages: _parseCollection(GMM_5E_LANGUAGES, blueprint.data.languages, "language"),
                legendary_actions: _parseLegendaryActions(derivedAttributes, blueprint.data.legendary_actions, showLegendaryActions, ignoreItemRequirements),
                legendary_resistances: _parseLegendaryResistances(blueprint.data.legendary_resistances, monsterParagonDefenses.maximum.value > 0),
                level: _parseLevel(derivedAttributes.level),
                name: _parseName(blueprint.data.description.name),
                paragon_actions: _parseParagonActions(derivedAttributes.rank, blueprint.data.paragon_actions, showLegendaryActions),
                paragon_defenses: monsterParagonDefenses,
                passive_perception: _parsePassivePerception(monsterSkills, monsterAbilityModifiers, derivedAttributes.rank, derivedAttributes.role, blueprint.data.passive_perception),
                phase: _parsePhase(derivedAttributes.rank),
                proficiency_bonus: monsterProficiency,
                rank: monsterRank,
                reactions: _parseReactions(derivedAttributes, blueprint.data.reactions, ignoreItemRequirements),
                role: monsterRole,
                saving_throws: _parseSavingThrows(blueprint.data.trained_saves, monsterProficiency, monsterAbilityModifiers, blueprint.data.ability_modifiers.ranking, derivedAttributes.trainedSavingThrowCount),
                senses: _parseSenses(blueprint.data.senses),
                skills: monsterSkills,
                speeds: _parseSpeeds(blueprint.data.speeds, derivedAttributes.role),
                spellbook: _parseSpellbook(monsterAbilityModifiers, monsterProficiency, monsterClasses, blueprint.data.spellbook),
                traits: _parseTraits(derivedAttributes, blueprint.data.traits, ignoreItemRequirements),
                tst_count: derivedAttributes.trainedSavingThrowCount,
                xp: _parseXp(derivedAttributes, blueprint.data.xp)
            }
        };
    }

    /* Shares getDerivedAttributes and its parsers with createArtifact so the two passes cannot drift. */
    function createBaseAttributes(blueprint) {
        const derivedAttributes = MonsterHelpers.getDerivedAttributes(
            blueprint.data.combat.level,
            blueprint.data.combat.rank,
            blueprint.data.combat.role
        );
        const proficiency = _parseProficiency(derivedAttributes, blueprint.data.proficiency_bonus);
        const abilityModifiers = _parseAbilityModifiers(derivedAttributes, blueprint.data.ability_modifiers);
        _resolveTrainedSaves(blueprint.data.trained_saves, blueprint.data.ability_modifiers.ranking, derivedAttributes.trainedSavingThrowCount);

        return {
            ability_modifiers: abilityModifiers,
            armor_class: _parseArmorClass(derivedAttributes, blueprint.data.armor_class),
            challenge_rating: _parseChallengeRating(derivedAttributes, blueprint.data.challenge_rating),
            hit_points: _parseHitPoints(derivedAttributes, blueprint.data.hit_points),
            proficiency_bonus: proficiency,
            xp: _parseXp(derivedAttributes, blueprint.data.xp),
            skills: Object.fromEntries(GMM_5E_SKILLS.map((x) =>
                [x.foundry, _skillProficiency(blueprint.data.skills, derivedAttributes.role?.modifiers?.skill, x.name).multiplier])),
            trained_saves: Object.fromEntries(GMM_5E_ABILITIES.map((x) => [x, !!blueprint.data.trained_saves[x]?.trained]))
        };
    }

    /* Only concepts dnd5e exposes in no canonical, language-independent form. The rest is already on the actor. */
    function _rollDataSurface(blueprint, { level, attackBonus, saveDc, damage, naturalMax }) {
        return {
            level: level,
            rank: blueprint.data.combat.rank?.type ?? "",
            role: blueprint.data.combat.role?.type ?? "",
            /* The label written to system.details.alignment is localized, so a gate cannot read it. */
            alignment: blueprint.data.description?.alignment?.category ?? "",
            attackBonus: attackBonus,
            saveDc: saveDc,
            damage: damage,
            naturalMax: naturalMax
        };
    }

    /* The base pass runs before any artifact exists. A reference read there sees pre-effect numbers. */
    function createBaseRollData(blueprint) {
        const derivedAttributes = MonsterHelpers.getDerivedAttributes(
            blueprint.data.combat.level,
            blueprint.data.combat.rank,
            blueprint.data.combat.role
        );
        const monsterProficiency = _parseProficiency(derivedAttributes, blueprint.data.proficiency_bonus);
        const hitPoints = _parseHitPoints(derivedAttributes, blueprint.data.hit_points);
        const rolled = Number(blueprint.data.hit_points.rolled_max) || 0;

        return _rollDataSurface(blueprint, {
            level: derivedAttributes.level,
            attackBonus: _parseAttackBonus(monsterProficiency.value, blueprint.data.attack_bonus).value,
            saveDc: _parseAttackDcs(monsterProficiency.value, blueprint.data.attack_dcs).primary.value
                + _parseAbilityModifiers(derivedAttributes, blueprint.data.ability_modifiers).max.value,
            damage: _parseDamagePerAction(derivedAttributes, blueprint.data.damage_per_action).value,
            naturalMax: (hitPoints.use_formula && rolled) ? rolled : hitPoints.natural_maximum
        });
    }

    function createRollData(blueprint, monsterData) {
        return _rollDataSurface(blueprint, {
            level: monsterData.level.value,
            attackBonus: monsterData.attack_bonus.value,
            saveDc: monsterData.attack_dcs.primary.value + monsterData.ability_modifiers.max.value,
            damage: monsterData.damage_per_action.value,
            naturalMax: monsterData.hit_points.natural_maximum
        });
    }

    function _parseName(name) {
        return (name && name.trim().length > 0) ? name.trim() : "???";
    }

    function _parseDescription(description) {
        return { text: _describeCreature(description), source: null, moved: false };
    }

    function _describeCreature(description) {
        const parts = [];

        if (description.size) {
            parts.push(game.i18n.format(`gmm.common.size.${description.size}`));
        }

        let category = "";
        if (!description.type.category) {
            if (description.type.custom?.trim().length > 0) {
                category = description.type.custom;
            }
        } else {
            category = game.i18n.format(`gmm.common.category.${description.type.swarm ? "multiple" : "single"}.${description.type.category}`).toLowerCase();
        }

        const tags = description.type.tags ? description.type.tags.split(";").map(x => x.trim()).filter(x => x.length > 0).sort() : "";
        if (tags.length > 0) {
            category += `${category.length == 0 ? '' : ' '}(${tags.join(", ")})`;
        }

        if (description.type.swarm) {
            let swarmSize = game.i18n.format(`gmm.common.size.${description.type.swarm}`).toLowerCase();
            parts.push(game.i18n.format(`gmm.monster.artifact.description.swarm`, {
                size: swarmSize,
                category: category
            }));
        } else {
            parts.push(category);
        }

        let alignment = "";
        if (description.alignment.category) {
            alignment = game.i18n.format(`gmm.common.alignment.${description.alignment.category}`).toLowerCase();
        } else {
            alignment = description.alignment.custom?.trim();
        }
        return `${parts.join(' ')}${alignment ? `, ${alignment}` : ``}`;
    }

    function _parseLevel(level) {
        return {
            value: level,
            label: game.i18n.format('gmm.monster.artifact.combat.level', { level: level })
        };
    }

    function _parseRank(rank) {
        let name = (rank.type == "custom") ? rank.custom_name : game.i18n.format(`gmm.common.rank.${rank.type}`);
        if (!name || name.trim().length == 0) {
            name = "???";
        }
        if (rank.modifiers.scale_with_players && rank.modifiers.target_players != 1) {
            name = game.i18n.format(`gmm.monster.artifact.combat.rank.vs`, { name: name, players: rank.modifiers.target_players });
        }
        return {
            name: name,
            threat: rank.modifiers.threat
        };
    }

    function _parsePhase(rank) {
        if (rank.modifiers.has_phases && rank.modifiers.phases.maximum > 1) {
            return game.i18n.format('gmm.monster.artifact.combat.phase', rank.modifiers.phases);
        } else {
            return null;
        }
    }

    function _parseRole(role) {
        const name = (role.type == "custom") ? role.custom_name : game.i18n.format(`gmm.common.role.${role.type}`);
        return {
            name: (!name || name.trim().length == 0) ? "???" : name,
            icon: role.modifiers.icon,
            skill_prof: role.modifiers.skill
        };
    }

    function _parseHitPoints(derivedAttributes, hitPoints) {
        const maximumHp = derivedAttributes.maximumHitPoints;
        maximumHp.applyModifier(hitPoints.maximum.modifier.value, hitPoints.maximum.modifier.override);
        maximumHp.setMinimumValue(1);
        maximumHp.ceil();

        const formula = Dice.getDiceRoll(maximumHp.value, hitPoints.maximum.die_size, hitPoints.maximum.maximum_dice);

        return {
            use_formula: hitPoints.maximum.use_formula,
            formula: formula ? formula : null,
            current: hitPoints.current,
            temporary: hitPoints.temporary,
            temporary_maximum: hitPoints.temporary_maximum,
            maximum: maximumHp,
            // Placeholders until the settled pass stamps what the schema settled on, so a shortcode always resolves.
            natural_maximum: maximumHp.value,
            effective_maximum: maximumHp.value
        };
    }

    function _parseArmorClass(derivedAttributes, armorClass) {
        const ac = derivedAttributes.armorClass;
        ac.applyModifier(armorClass.modifier.value, armorClass.modifier.override);
        ac.setMinimumValue(1);
        ac.ceil();

        return $.extend(ac, { type: armorClass.type });
    }

    function _parseAttackBonus(proficiencyBonus, attackBonus) {
        const ab = new DerivedAttribute();
        ab.add(proficiencyBonus, game.i18n.format('gmm.common.derived_source.proficiency'));
        ab.applyModifier(attackBonus.modifier.value, attackBonus.modifier.override);
        ab.setMinimumValue(1);
        ab.ceil();

        return $.extend(ab, { type: attackBonus.type });
    }

    function _parseAttackDcs(proficiencyBonus, attackDcs) {
        const primary = new DerivedAttribute();
        primary.add(8, game.i18n.format('gmm.common.derived_source.base'));
        primary.add(proficiencyBonus, game.i18n.format('gmm.common.derived_source.proficiency'));
        primary.applyModifier(attackDcs.primary.modifier.value, attackDcs.primary.modifier.override);
        primary.setMinimumValue(0);
        primary.ceil();

        return {
            primary: $.extend(primary, { type: attackDcs.primary.type })
        };
    }

    function _parseDamagePerAction(derivedAttributes, damagePerAction) {
        const damage = derivedAttributes.damagePerAction;
        damage.applyModifier(damagePerAction.modifier.value, damagePerAction.modifier.override);
        damage.setMinimumValue(1);
        damage.ceil();

        const dice = Dice.getDiceRoll(damage.value, damagePerAction.die_size, damagePerAction.maximum_dice);

        return $.extend(damage, {
            dice: dice ? dice : "-",
            type: damagePerAction.type,
            die_size: damagePerAction.die_size ? `d${damagePerAction.die_size}` : null,
            maximum_dice: damagePerAction.maximum_dice
        });
    }

    /* Copies, so two calls against one getDerivedAttributes result give two independent bundles. */
    function _parseAbilityModifiers(derivedAttributes, abilityModifiers) {
        const ams = {};
        GMM_5E_ABILITIES.forEach((x) => {
            let ranking = abilityModifiers.ranking.indexOf(x);
            ams[x] = derivedAttributes.abilityModifiers[ranking].clone();
            if (ranking === 0)
                ams["max"] = ams[x];
        });

        Object.entries(_parseModifierList(abilityModifiers.modifier.value)).forEach(([ability, value]) => {
            ams[ability].applyModifier(value, abilityModifiers.modifier.override);
        });

        for (const am in ams) {
            ams[am].ceil();
            ams[am].score = 10 + (2 * ams[am].value);
        }

        return ams;
    }

    /* A skill-scoped bonus belongs on the skill, not on every check made with the ability. */
    function _parseCheckModifiers(checkBonuses) {
        const cms = {};
        GMM_5E_ABILITIES.forEach((x) => {
            cms[x] = new DerivedAttribute();
            cms[x].add(Number(checkBonuses?.[x]) || 0, game.i18n.format('gmm.common.derived_source.check_bonus'));
        });
        return cms;
    }

    function _parseModifierList(value) {
        const modifiers = {};
        String(value ?? "").split(";").forEach((entry) => {
            const [key, amount] = entry.split("=");
            const ability = (key ?? "").trim().toLowerCase();
            const number = Number(amount);
            if (GMM_5E_ABILITIES.includes(ability) && amount !== undefined && !isNaN(number)) {
                modifiers[ability] = number;
            }
        });
        return modifiers;
    }

    /* The trained flag is a `sync`/`custom-unique` output, and the base pass needs it without parsing a save. */
    function _resolveTrainedSaves(savingThrows, abilityRankings, tst) {
        if (savingThrows.method !== "sync" && savingThrows.method !== "custom-unique") return;
        const trained = new Set((savingThrows.method === "sync") ? abilityRankings.slice(0, tst) : []);
        GMM_5E_ABILITIES.forEach((x) => {
            if (savingThrows[x]) savingThrows[x].trained = trained.has(x);
        });
    }

    function _parseSavingThrows(savingThrows, pb, abilityModifiers, abilityRankings, tst) {
        const sts = {};
        const isUnique = savingThrows.method === "custom-unique";
        const isProficient = savingThrows.method === "custom" || savingThrows.method === "sync";
        const modifiers = _parseModifierList(savingThrows.modifier.value);
        _resolveTrainedSaves(savingThrows, abilityRankings, tst);
        GMM_5E_ABILITIES.forEach(function (attrName) {
            if (savingThrows[attrName]) {
                sts[attrName] = new DerivedAttribute();
                sts[attrName].value = 0;
                if (isProficient && savingThrows[attrName].trained) {
                    sts[attrName].applyModifier(pb.value, savingThrows[attrName].modifier.override);
                }
                if (!isUnique) {
                    sts[attrName].applyModifier(abilityModifiers[attrName].value, savingThrows[attrName].modifier.override);
                }
                if (savingThrows[attrName].modifier.value) {
                    sts[attrName].applyModifier(savingThrows[attrName].modifier.value, savingThrows[attrName].modifier.override);
                }
                if (attrName in modifiers) {
                    sts[attrName].applyModifier(modifiers[attrName], false);
                }
            }
        });
        return sts;
    }

    function _parseProficiency(derivedAttributes, proficiencyBonus) {
        const prof = new DerivedAttribute();
        prof.setValue(MonsterHelpers.getProficiencyBonus(derivedAttributes.level), game.i18n.format('gmm.common.derived_source.base'));
        prof.applyModifier(proficiencyBonus.modifier.value, proficiencyBonus.modifier.override);
        prof.setMinimumValue(1);
        prof.ceil();

        return prof;
    }

    /* The multiplier dnd5e stores, and the tooltip line that names it. */
    const GMM_SKILL_LEVELS = {
        "half-proficient": { multiplier: 0.5, source: "half_proficiency" },
        "proficient": { multiplier: 1, source: "proficiency" },
        "expert": { multiplier: 2, source: "expertise" }
    };

    /* The authored level and the Role's grant are one axis. The higher wins, and a tie goes to the
       authored level because that is the number a builder typed. */
    function _skillProficiency(monsterSkills, roleSkills, skillName) {
        const authored = GMM_SKILL_LEVELS[monsterSkills[skillName]];
        const granted = (roleSkills ?? []).includes(skillName);
        if (authored && (!granted || authored.multiplier >= 1)) return authored;
        return granted ? { multiplier: 1, source: "role" } : { multiplier: 0, source: null };
    }

    /* `floor(prof * multiplier)` is what dnd5e's Proficiency gives for all three levels. */
    function _parseSkills(proficiencyBonus, monsterSkills, monsterRole) {
        return GMM_5E_SKILLS.map((defaultSkill) => {
            const { multiplier, source } = _skillProficiency(monsterSkills, monsterRole.modifiers.skill, defaultSkill.name);
            const skill = new DerivedAttribute();
            if (source) skill.add(Math.floor(proficiencyBonus * multiplier), game.i18n.format(`gmm.common.derived_source.${source}`));
            return $.extend(skill, {
                code: defaultSkill.name,
                ability: defaultSkill.ability,
                title: game.i18n.format(`gmm.common.skill.${defaultSkill.name}`)
            });
        });
    }

    function _parseSpeeds(monsterSpeeds, role) {
        const speeds = [];
        GMM_5E_SPEEDS.forEach(function (defaultSpeed) {
            if (monsterSpeeds[defaultSpeed]) {
                const speed = new DerivedAttribute();
                /* A mode is a FormulaField, so the Stored Value is a string and adding it would build
                   text. An authored formula reads as 0 here and is corrected by the settled read. */
                speed.add(Number(monsterSpeeds[defaultSpeed]) || 0, game.i18n.format('gmm.common.derived_source.base'));
                speed.add(role.modifiers.speed, game.i18n.format('gmm.common.derived_source.role'));
                /* 0 rather than the 1 every other attribute floors at, because dnd5e clamps a speed there. */
                speed.setMinimumValue(0);
                speed.ceil();

                const details = {};
                details.code = defaultSpeed;
                details.title = game.i18n.format(`gmm.common.speed.${defaultSpeed}`);
                details.units = monsterSpeeds.units;
                if (defaultSpeed == "fly" && monsterSpeeds.can_hover) {
                    details.detail = game.i18n.format(`gmm.common.speed.can_hover`).toLowerCase();
                }

                speeds.push($.extend(speed, details));
            }
        });

        return speeds.concat(_parseFreeTextDistances(monsterSpeeds.other, monsterSpeeds.units));
    }

    function _parseFreeTextDistances(text, units) {
        if (!text) return [];
        return text.split(";").map(x => x.split("=")).map((x) => ({
            title: x[0].trim().toLowerCase(),
            value: Number(x[1]) ? Number(x[1]) : null,
            units: units
        }));
    }

    function _parseSenses(monsterSenses) {
        const senses = [];
        GMM_5E_SENSES.forEach(function (type) {
            if (monsterSenses[type]) {
                const sense = new DerivedAttribute();
                sense.add(monsterSenses[type], game.i18n.format('gmm.common.derived_source.base'));
                senses.push($.extend(sense, {
                    code: type,
                    title: game.i18n.format(`gmm.common.sense.${type}`),
                    units: monsterSenses.units
                }));
            }
        });

        return senses.concat(_parseFreeTextDistances(monsterSenses.other, monsterSenses.units));
    }

    function _parsePassivePerception(skills, abilityModifiers, rank, role, passivePerception) {
        const basePerc = 10;
        const percep = new DerivedAttribute();
        percep.add(basePerc, game.i18n.format('gmm.common.derived_source.base'));

        const perception = skills.find((x) => x.code == "perception");
        if (perception) {
            percep.add(abilityModifiers[perception.ability].getValue(), game.i18n.format('gmm.common.derived_source.ability_modifier'));
            percep.add(perception.getValue(), game.i18n.format('gmm.common.derived_source.proficiency'));
        }

        percep.applyModifier(passivePerception.modifier.value, passivePerception.modifier.override);
        percep.setMinimumValue(1);
        percep.ceil();

        return percep;
    }

    /* `source` is what moved an entry into the row, and null for one the build authored. */
    function _parseCollection(collection, options, key) {
        let output = [];
        collection.forEach(function (type) {
            if (options[type]) {
                output.push({ code: type, label: game.i18n.format(`gmm.common.${key}.${type}`), source: null });
            }
        });

        if (options.other) {
            options.other.split(";").forEach((x) => output.push({ code: null, label: x, source: null }));
        }

        return output;
    }

    /* Each row the stat block prints straight from a schema field an effect can reach. `path` is
       relative to `system`, because the stored and the settled reads start from different objects. */
    const GMM_SETTLED_COLLECTIONS = [
        { row: "damage_resistances", collection: GMM_5E_DAMAGE_TYPES, key: "damage", path: "traits.dr" },
        { row: "damage_immunities", collection: GMM_5E_DAMAGE_TYPES, key: "damage", path: "traits.di" },
        { row: "damage_vulnerabilities", collection: GMM_5E_DAMAGE_TYPES, key: "damage", path: "traits.dv" },
        { row: "condition_immunities", collection: GMM_5E_CONDITIONS, key: "condition", path: "traits.ci" },
        { row: "languages", collection: GMM_5E_LANGUAGES, key: "language", path: "traits.languages" }
    ];

    function _storedSystem(actor) {
        return actor._source?.system ?? {};
    }

    /* Foundry applies every Change itself, so nothing else records which effect moved a field. */
    function _settledSource(actor, key, matches) {
        const keys = new Set(Array.isArray(key) ? key : [key]);
        const names = new Set();
        for (const effect of (actor.appliedEffects ?? [])) {
            for (const change of (effect.system?.changes ?? effect.changes ?? [])) {
                if (!keys.has(change?.key)) continue;
                if (matches && !matches(change)) continue;
                names.add(effect.name);
            }
        }
        if (names.size == 1) {
            return [...names][0];
        }
        return (names.size > 1)
            ? game.i18n.format('gmm.common.derived_source.active_effects', { count: names.size })
            : game.i18n.format('gmm.common.derived_source.in_play');
    }

    /* A free-text row is a string on both sides, so an entry is new when its name is. */
    function _reconcileFreeTextDistances(stored, settled, units, source) {
        const known = new Set(_parseFreeTextDistances(stored, units).map((x) => x.title));
        return _parseFreeTextDistances(settled, units).map((x) => known.has(x.title)
            ? x
            : $.extend(x, { source: source, moved: true }));
    }

    function _reconcileFreeTextLabels(stored, settled, source) {
        const pieces = (text) => String(text ?? "").split(";").map((x) => x.trim()).filter((x) => x.length > 0);
        const known = new Set(pieces(stored));
        return pieces(settled).map((x) => ({
            code: null,
            label: x,
            source: known.has(x) ? null : source,
            moved: !known.has(x)
        }));
    }


    /* The difference between two bundles, not between a parse and the node: measuring against the node
       erases the bonuses _foldActorBonuses had already folded into it. */
    function reparseSettledDependents(monsterData, blueprint, settled, actor) {
        const derivedAttributes = MonsterHelpers.getDerivedAttributes(
            blueprint.data.combat.level,
            blueprint.data.combat.rank,
            blueprint.data.combat.role
        );
        const builtAbilities = _parseAbilityModifiers(derivedAttributes, blueprint.data.ability_modifiers);
        const settledAbilities = _parseAbilityModifiers(derivedAttributes, blueprint.data.ability_modifiers);
        const movedKeys = [];

        GMM_5E_ABILITIES.forEach((x) => {
            const keys = [`system.abilities.${x}.value`, `system.abilities.${x}.mod`];
            const delta = Number(settled.abilityModifiers?.[x]) - builtAbilities[x].value;
            if (!Number.isFinite(delta) || !delta) return;
            movedKeys.push(...keys);
            const source = _settledSource(actor, keys);
            // `max` aliases the top-ranked ability, so it follows this and must never be folded again.
            settledAbilities[x].add(delta, source);
            monsterData.ability_modifiers[x].add(delta, source);
        });

        const builtProficiency = { value: Number(actor._gmmBaseProf) || 0 };
        const settledProficiency = { value: settled.proficiency };
        if (settledProficiency.value !== builtProficiency.value) movedKeys.push("system.attributes.prof");

        /* dnd5e owns the multiplier arithmetic, so the settled side is the schema's flat. The built side
           stays a parse, or the fold would erase the check bonuses already on the node. */
        const builtSkills = _parseSkills(builtProficiency.value, blueprint.data.skills, derivedAttributes.role);
        const skillDeltas = GMM_5E_SKILLS.map((x) => ({
            skill: x,
            delta: (Number(actor.system?.skills?.[x.foundry]?.prof?.flat) || 0)
                - (builtSkills.find((y) => y.code == x.name)?.value ?? 0)
        })).filter((x) => x.delta);
        skillDeltas.forEach((x) => movedKeys.push(`system.skills.${x.skill.foundry}.value`));

        /* Only the multiplier moved here: the bonus behind it is already folded through savingThrows. */
        const saveProfDeltas = GMM_5E_ABILITIES.map((x) => ({
            ability: x,
            delta: ((Number(settled.saveProficiencies?.[x]) || 0) - (blueprint.data.trained_saves[x]?.trained ? 1 : 0))
                * settledProficiency.value
        })).filter((x) => x.delta);
        saveProfDeltas.forEach((x) => movedKeys.push(`system.abilities.${x.ability}.proficient`));

        if (!movedKeys.length) return;

        // The schema's score is canonical, so an UPGRADE to an odd one is not rounded away here.
        GMM_5E_ABILITIES.forEach((x) => {
            const score = Number(actor.system?.abilities?.[x]?.value);
            if (Number.isFinite(score)) monsterData.ability_modifiers[x].score = score;
        });

        const classes = blueprint.data.traits.items.filter((x) => x.class);
        const parse = (abilities, proficiency) => ({
            attackBonus: _parseAttackBonus(proficiency.value, blueprint.data.attack_bonus).value,
            attackDc: _parseAttackDcs(proficiency.value, blueprint.data.attack_dcs).primary.value,
            capacity: _getInventoryCapacity(abilities, blueprint.data).value,
            initiative: _parseInitiative(abilities, derivedAttributes.rank, derivedAttributes.role, blueprint.data.initiative, proficiency.value).value,
            passive: _parsePassivePerception(monsterData.skills, abilities, derivedAttributes.rank, derivedAttributes.role, blueprint.data.passive_perception).value,
            savingThrows: _parseSavingThrows(blueprint.data.trained_saves, proficiency, abilities, blueprint.data.ability_modifiers.ranking, derivedAttributes.trainedSavingThrowCount),
            spellDc: _parseSpellbook(abilities, proficiency, classes, blueprint.data.spellbook).spellcasting.dc.value
        });
        const built = parse(builtAbilities, builtProficiency);
        const settledParse = parse(settledAbilities, settledProficiency);

        const source = _settledSource(actor, movedKeys);
        const fold = (node, delta) => {
            if (node && Number.isFinite(delta) && delta) node.add(delta, source);
        };
        fold(monsterData.proficiency_bonus, settledProficiency.value - builtProficiency.value);
        fold(monsterData.attack_bonus, settledParse.attackBonus - built.attackBonus);
        fold(monsterData.attack_dcs?.primary, settledParse.attackDc - built.attackDc);
        fold(monsterData.inventory?.capacity, settledParse.capacity - built.capacity);
        fold(monsterData.initiative, settledParse.initiative - built.initiative);
        fold(monsterData.passive_perception, settledParse.passive - built.passive);
        fold(monsterData.spellbook?.spellcasting?.dc, settledParse.spellDc - built.spellDc);
        GMM_5E_ABILITIES.forEach((x) => {
            fold(monsterData.saving_throws?.[x], (settledParse.savingThrows[x]?.value ?? 0) - (built.savingThrows[x]?.value ?? 0));
        });
        saveProfDeltas.forEach(({ ability, delta }) => fold(monsterData.saving_throws?.[ability], delta));
        skillDeltas.forEach(({ skill, delta }) => {
            fold(monsterData.skills.find((y) => y.code == skill.name), delta);
            // The forge's own floor and Modifier are deliberately not re-applied over the settled number.
            if (skill.name == "perception") fold(monsterData.passive_perception, delta);
        });
    }

    /* The stat block prints what the game will use, so every row built from a schema field an effect
       can reach is re-read once the final change phase has landed. */
    function reconcileWithSettledActor(monsterData, blueprint, actor) {
        monsterData.speeds = _reconcileSpeeds(monsterData.speeds, blueprint.data.speeds, actor, blueprint.data.combat.role);
        monsterData.senses = _reconcileSenses(monsterData.senses, blueprint.data.senses, actor);
        GMM_SETTLED_COLLECTIONS.forEach((x) => {
            monsterData[x.row] = _reconcileCollection(monsterData[x.row], x, actor);
        });
        _reconcileDescription(monsterData, blueprint.data.description, actor);
    }

    function _reconcileSpeeds(speeds, blueprintSpeeds, actor, role) {
        const stored = _storedSystem(actor).attributes?.movement ?? {};
        const applied = actor._gmmAppliedMovement ?? {};
        const settled = actor.system?.attributes?.movement ?? {};
        const modes = [];
        // A mode is a FormulaField, so an effect's contribution can be a reference rather than a number.
        const rollData = actor.getRollData();

        GMM_5E_SPEEDS.forEach((mode) => {
            const value = Number(CompatibilityHelpers.movementSpeed(settled, mode)) || 0;
            let speed = speeds.find((x) => x.code == mode);
            if (!speed) {
                if (!value) return;
                speed = $.extend(new DerivedAttribute(), {
                    code: mode,
                    title: game.i18n.format(`gmm.common.speed.${mode}`),
                    units: blueprintSpeeds.units
                });
                /* dnd5e adds the bonus to every non-zero mode, including one nobody authored. Without
                   this term the Role's amount would read as something the table did. */
                speed.add(Number(role?.modifiers?.speed) || 0, game.i18n.format('gmm.common.derived_source.role'));
            }
            /* A mode is a formula until prepareMovement replaces it with a number. A number here means
               the stash was taken too late to credit anyone. */
            const effects = (typeof applied[mode] !== "string")
                ? 0
                : dnd5e.utils.simplifyBonus(applied[mode], rollData)
                    - dnd5e.utils.simplifyBonus(CompatibilityHelpers.movementSpeed(stored, mode), rollData);
            if (effects) speed.add(effects, _settledSource(actor, CompatibilityHelpers.movementSpeedKeys(mode)));
            const remainder = value - speed.value;
            if (remainder) speed.add(remainder, game.i18n.format('gmm.common.derived_source.in_play'));
            speed.moved = !!(speed.moved || effects || remainder);
            modes.push(speed);
        });

        const fly = modes.find((x) => x.code == "fly");
        if (fly) {
            if (settled.hover) fly.detail = game.i18n.format(`gmm.common.speed.can_hover`).toLowerCase();
            else delete fly.detail;
            if (!!settled.hover != !!stored.hover) fly.moved = true;
        }

        return modes.concat(speeds.filter((x) => !x.code));
    }

    function _reconcileSenses(senses, blueprintSenses, actor) {
        const stored = _storedSystem(actor).attributes?.senses ?? {};
        const settled = actor.system?.attributes?.senses ?? {};
        const ranges = [];

        GMM_5E_SENSES.forEach((type) => {
            const value = Number(settled.ranges?.[type]) || 0;
            let sense = senses.find((x) => x.code == type);
            // A range of 0 is the absence of the sense, where a speed of 0 is a state a creature is in.
            if (!value) return;
            if (!sense) {
                sense = $.extend(new DerivedAttribute(), {
                    code: type,
                    title: game.i18n.format(`gmm.common.sense.${type}`),
                    units: blueprintSenses.units
                });
            }
            const delta = value - sense.value;
            if (delta) sense.add(delta, _settledSource(actor, `system.attributes.senses.ranges.${type}`));
            sense.moved = !!(sense.moved || delta);
            ranges.push(sense);
        });

        const special = _reconcileFreeTextDistances(stored.special, settled.special, blueprintSenses.units,
            _settledSource(actor, "system.attributes.senses.special"));
        return ranges.concat(special);
    }

    function _reconcileCollection(row, entry, actor) {
        const path = `${entry.path}.value`;
        const settled = [...(foundry.utils.getProperty(actor.system, path) ?? [])];
        const key = `system.${path}`;
        const authored = (code) => row.find((x) => x.code == code);
        const granted = (code) => ({
            code: code,
            label: entry.collection.includes(code) ? game.i18n.format(`gmm.common.${entry.key}.${code}`) : code,
            source: _settledSource(actor, key, (x) => String(x.value).includes(code)),
            moved: true
        });

        const known = entry.collection.filter((x) => settled.includes(x)).map((x) => authored(x) ?? granted(x));
        const unknown = settled.filter((x) => !entry.collection.includes(x)).map((x) => authored(x) ?? granted(x));
        const custom = _reconcileFreeTextLabels(
            foundry.utils.getProperty(_storedSystem(actor), `${entry.path}.custom`),
            foundry.utils.getProperty(actor.system, `${entry.path}.custom`),
            _settledSource(actor, `system.${entry.path}.custom`)
        );

        return known.concat(unknown, custom);
    }

    function _reconcileDescription(monsterData, blueprintDescription, actor) {
        const sizeName = (value) => GMM_5E_SIZES.find((x) => x.foundry == value)?.name;
        const stored = _storedSystem(actor);
        const size = actor.system?.traits?.size;
        const swarm = actor.system?.details?.type?.swarm;
        if (size == stored.traits?.size && swarm == stored.details?.type?.swarm) return;

        const settled = $.extend(true, {}, blueprintDescription);
        // An unmappable size keeps the authored one. An empty swarm is a creature that stopped being one.
        settled.size = sizeName(size) ?? settled.size;
        settled.type.swarm = sizeName(swarm) ?? "";
        monsterData.description = {
            text: _describeCreature(settled),
            source: _settledSource(actor, (size == stored.traits?.size) ? "system.details.type.swarm" : "system.traits.size"),
            moved: true
        };
    }

    function _parseXp(derivedAttributes, xpModifier) {
        const xp = derivedAttributes.xp;
        xp.applyModifier(xpModifier.modifier.value, xpModifier.modifier.override);
        xp.setMinimumValue(0);
        xp.ceil();

        return xp;
    }

    function _parseChallengeRating(derivedAttributes, crModifier) {
        const cr = derivedAttributes.challengeRating;
        cr.applyModifier(crModifier.modifier.value, crModifier.modifier.override);
        cr.setMinimumValue(0);

        return cr;
    }

    function _parseInitiative(monsterAbilityModifiers, rank, role, initiative, proficiencyBonus) {
        const init = new DerivedAttribute();
        init.add(monsterAbilityModifiers[initiative.ability].value, game.i18n.format('gmm.common.derived_source.ability_modifier'));
        init.add(_getInitiativeBonus(rank.modifiers, proficiencyBonus), game.i18n.format('gmm.common.derived_source.rank'));
        init.add(_getInitiativeBonus(role.modifiers, proficiencyBonus), game.i18n.format('gmm.common.derived_source.role'));
        init.applyModifier(initiative.modifier.value, initiative.modifier.override);
        init.ceil();

        return $.extend(init, {
            ability: initiative.ability,
            advantage: initiative.advantage
        });
    }

    function _getInitiativeBonus(modifiers, proficiencyBonus) {
        return Math.floor(proficiencyBonus * (modifiers.initiative_pb ?? 0)) + (modifiers.initiative ?? 0);
    }

    function _parseBiography(biography) {
        return biography;
    }

    function _parseParagonActions(rank, paragonActions, showLegendaryActions) {
        let mx = new DerivedAttribute();
        let maximum = rank.modifiers.paragon_actions;
        if (rank.modifiers.scale_with_players) {
            maximum *= Math.max(0, rank.modifiers.target_players - 1);
        }
        mx.add(maximum, game.i18n.format('gmm.common.derived_source.rank'));
        mx.applyModifier(paragonActions.maximum.modifier.value, paragonActions.maximum.modifier.override);
        mx.ceil();

        const current = CompatibilityHelpers.clamped(paragonActions.current ?? mx.value, 0, mx.value);

        return {
            visible: paragonActions.always_show || (!showLegendaryActions && (mx.value > 0)),
            current: current,
            maximum: mx
        };
    }

    function _parseParagonDefenses(rank, paragonDefenses, level) {
        if (paragonDefenses.maximum === null)
            paragonDefenses.maximum = {
                modifier: {
                    value: 0,
                    override: false
                }
            };
        let mx = new DerivedAttribute();
        let maximum = rank.modifiers.paragon_defenses;
        if (rank.modifiers.scale_with_players) {
            maximum *= Math.floor(rank.modifiers.target_players / 2);
        }
        mx.add(maximum, game.i18n.format('gmm.common.derived_source.rank'));
        mx.applyModifier(paragonDefenses.maximum.modifier.value, paragonDefenses.maximum.modifier.override);
        mx.ceil();

        return {
            visible: paragonDefenses.always_show || (mx.value > 0),
            current: paragonDefenses.current,
            maximum: mx,
            cost: (level * 2)
        };
    }

    function _parseLegendaryResistances(legendaryResistances, replacedByParagonDefenses) {
        return {
            visible: legendaryResistances.always_show || (!replacedByParagonDefenses && legendaryResistances.maximum > 0),
            current: legendaryResistances.current,
            maximum: legendaryResistances.maximum
        };
    }

    function _parseLegendaryActions(derivedAttributes, legendaryActions, showLegendaryActions, ignoreItemRequirements) {
        return {
            visible: showLegendaryActions,
            current: legendaryActions.current,
            maximum: legendaryActions.maximum,
            items: _filterItems(derivedAttributes, legendaryActions.items, ignoreItemRequirements)
        };
    }

    function _parseLairActions(derivedAttributes, lairActions, ignoreItemRequirements) {
        return {
            visible: lairActions.always_show || lairActions.items.length > 0,
            initiative: lairActions.initiative,
            items: _filterItems(derivedAttributes, lairActions.items, ignoreItemRequirements)
        };
    }

    function _parseActions(derivedAttributes, actions, ignoreItemRequirements) {
        return {
            visible: actions.always_show || actions.items.length > 0,
            items: _filterItems(derivedAttributes, actions.items, ignoreItemRequirements)
        };
    }

    function _parseReactions(derivedAttributes, reactions, ignoreItemRequirements) {
        return {
            visible: reactions.always_show || reactions.items.length > 0,
            items: _filterItems(derivedAttributes, reactions.items, ignoreItemRequirements)
        };
    }

    function _parseTraits(derivedAttributes, traits, ignoreItemRequirements) {
        return {
            visible: traits.always_show || traits.items.length > 0,
            items: _filterItems(derivedAttributes, traits.items, ignoreItemRequirements)
        };
    }

    function _parseBonusActions(derivedAttributes, bonusActions, ignoreItemRequirements) {
        return {
            visible: bonusActions.always_show || bonusActions.items.length > 0,
            items: _filterItems(derivedAttributes, bonusActions.items, ignoreItemRequirements)
        };
    }

    function _parseSpellbook(monsterAbilityModifiers, monsterProficiency, monsterClasses, spellbook) {
        const dc = new DerivedAttribute();
        dc.add(8, game.i18n.format('gmm.common.derived_source.base'));
        dc.add(monsterAbilityModifiers[spellbook.spellcasting.ability]?.value, game.i18n.format('gmm.common.derived_source.ability_modifier'));
        dc.add(monsterProficiency.value, game.i18n.format('gmm.common.derived_source.proficiency'));
        dc.applyModifier(spellbook.spellcasting.dc.modifier.value, spellbook.spellcasting.dc.modifier.override);
        dc.ceil();

        let slots = _getSpellSlots(monsterClasses.filter((x) => x.class.spellcasting), spellbook.spellcasting.level, spellbook.slots);
        let totalSlots = Object.values(slots).reduce((x, y) => x + y.maximum, 0);
        let totalSpells = Object.values(spellbook.spells).reduce((x, y) => x + y.length, 0);

        return {
            visible: spellbook.always_show || totalSlots > 0 || totalSpells > 0,
            spellcasting: {
                level: spellbook.spellcasting.level,
                ability: spellbook.spellcasting.ability,
                dc: dc
            },
            slots: slots,
            spells: spellbook.spells
        };
    }

    function _parseInventory(inventoryWeight, inventoryCapacity, inventory) {
        const currencyCoins = inventory.currency.cp + inventory.currency.sp + inventory.currency.ep + inventory.currency.gp + inventory.currency.pp;
        const currencyValuation = Math.round((((inventory.currency.cp || 0) / 100) + ((inventory.currency.sp || 0) / 10) + ((inventory.currency.ep || 0) / 2) + (inventory.currency.gp || 0) + ((inventory.currency.pp || 0) * 10)) * 100) / 100;

        return {
            visible: inventory.always_show || inventory.currency.always_show || inventory.encumbrance.always_show || inventory.items.length > 0 || currencyCoins > 0,
            items: inventory.items,
            weight: inventoryWeight || 0,
            capacity: inventoryCapacity || 0,
            encumbrance: Math.round((inventoryWeight.value * 100) / inventoryCapacity.value),
            show_currencies: inventory.currency.always_show || currencyCoins > 0,
            show_encumbrance: inventory.encumbrance.always_show,
            currency: {
                pp: inventory.currency.pp || 0,
                gp: inventory.currency.gp || 0,
                ep: inventory.currency.ep || 0,
                sp: inventory.currency.sp || 0,
                cp: inventory.currency.cp || 0,
                valuation: currencyValuation || 0,
                total_coins: currencyCoins
            }
        };
    }

    function _getInventoryWeight(data) {
        const weight = new DerivedAttribute();
        const displayUnit = data.display.units;
        ["bonus_actions.items", "actions.items", "reactions.items", "lair_actions.items", "legendary_actions.items", "traits.items", "inventory.items", "spellbook.spells.0", "spellbook.spells.1", "spellbook.spells.2", "spellbook.spells.3", "spellbook.spells.4", "spellbook.spells.5", "spellbook.spells.6", "spellbook.spells.7", "spellbook.spells.8", "spellbook.spells.9", "spellbook.spells.other"].forEach((x) => {
            if (CompatibilityHelpers.hasProperty(data, x)) {
                CompatibilityHelpers.getProperty(data, x).forEach((y) => {
                    weight.add(CompatibilityHelpers.weight(y.weight, displayUnit) * y.quantity, y.name)
                });
            }
        });
        if (game.settings.get("dnd5e", "currencyWeight")) {
            let currency = ["cp", "sp", "ep", "gp", "pp"].map((x) => data.inventory.currency[x]).reduce((val, denom) => val += Math.max(denom, 0), 0);
            if (displayUnit === "imperial") {
                weight.add(currency / CONFIG.DND5E.encumbrance.currencyPerWeight.imperial, "currency");
            } else if (displayUnit === "metric") {
                weight.add(currency / CONFIG.DND5E.encumbrance.currencyPerWeight.metric, "currency");
            }
        }
        weight.applyModifier(data.inventory.encumbrance.weight.modifier.value, data.inventory.encumbrance.weight.modifier.override);
        weight.round(100);

        return weight;
    }

    function _getInventoryCapacity(monsterAbilityModifiers, data) {
        const capacity = new DerivedAttribute();
        capacity.add((monsterAbilityModifiers["str"].value * 2) + 10, game.i18n.format('gmm.common.derived_source.ability_score'));

        capacity.multiply(CompatibilityHelpers.getEncumbranceMultiplier(data.display.units), "display unit adjustment");

        var sizeCategory = GMM_5E_SIZES.findIndex((x) => x.name == data.description.size);
        sizeCategory = data.inventory.encumbrance.powerful_build ? (sizeCategory < 5 ? sizeCategory + 1 : sizeCategory) : sizeCategory;
        capacity.multiply(GMM_5E_SIZES[sizeCategory].inventory_capacity, "size");
        capacity.applyModifier(data.inventory.encumbrance.capacity.modifier.value, data.inventory.encumbrance.capacity.modifier.override);

        return capacity;
    }

    function _getSpellSlots(classes, spellLevel, slotModifiers) {

        const progression = {
            total: 0,
            slot: 0,
            pact: 0
        };
        classes.forEach((x) => {
            const levels = x.class.level;
            const prog = x.class.spellcasting;

            if (prog !== "pact") {
                progression.total++;
            }
            switch (prog) {
                case 'third':
                    progression.slot += Math.floor(levels / 3);
                    break;
                case 'half':
                    progression.slot += Math.floor(levels / 2);
                    break;
                case 'full':
                    progression.slot += levels;
                    break;
                case 'artificer':
                    progression.slot += Math.ceil(levels / 2);
                    break;
                case 'pact':
                    progression.pact += levels;
                    break;
            }
        });

        let levels, pactLevel;
        levels = CompatibilityHelpers.clamped(spellLevel ? spellLevel : progression.slot, 0, 20);
        pactLevel = CompatibilityHelpers.clamped(slotModifiers.pact.level ? slotModifiers.pact.level : progression.pact, 0, 20);

        const rawSlots = CONFIG.DND5E.SPELL_SLOT_TABLE[levels - 1] || [];

        const slots = {};
        for (let i = 0; i < 9; i++) {
            slots[i + 1] = {
                current: slotModifiers[i + 1].current || 0,
                maximum: slotModifiers[i + 1].maximum || rawSlots[i] || 0
            }
        }
        slots["pact"] = {
            level: Math.ceil(Math.min(10, pactLevel) / 2),
            current: slotModifiers.pact.current || 0,
            maximum: slotModifiers.pact.maximum || (pactLevel > 0 ? Math.max(1, Math.min(pactLevel, 2), Math.min(pactLevel - 8, 3), Math.min(pactLevel - 13, 4)) : 0)
        }

        return slots;
    }

    function _filterItems(derivedAttributes, items, ignore_requirements) {
        return items.filter((x) => {
            if (x.requirements && !ignore_requirements) {
                if (x.requirements.level.min && derivedAttributes.level < x.requirements.level.min) {
                    return false;
                }
                if (x.requirements.level.max && derivedAttributes.level > x.requirements.level.max) {
                    return false;
                }
                if (x.requirements.rank && derivedAttributes.rank.type != x.requirements.rank) {
                    return false;
                }
                if (x.requirements.role && derivedAttributes.role.type != x.requirements.role) {
                    return false;
                }
            }
            return true;
        });
    }

    return {
        createArtifact: createArtifact,
        createBaseAttributes: createBaseAttributes,
        createBaseRollData: createBaseRollData,
        createRollData: createRollData,
        reconcileWithSettledActor: reconcileWithSettledActor,
        reparseSettledDependents: reparseSettledDependents,
        settledSource: _settledSource
    };
})();

export default MonsterForge;
