import { MONSTER_BLUEPRINT } from "../consts/monster_blueprint.js"

export default class Frankenstein {

    static getDefaultBlueprint() {
        return MONSTER_BLUEPRINT;
    }

    static createMonster(blueprint) {
        const monster = {};

        monster.description = this.parseDescription(blueprint.description);
        monster.combat = {
            level: this.parseLevel(blueprint.combat.level),
            rank: this.parseRank(blueprint.combat.rank),
            role: this.parseRole(blueprint.combat.role),
        }
        monster.hit_points = this.parseHitPoints(blueprint);
        monster.armor_class = this.parseArmorClass(blueprint);
        monster.passive_perception = this.parsePassivePerception(blueprint);
        monster.attack_bonus = this.parseAttackBonus(blueprint);
        monster.attack_dcs = this.parseAttackDcs(blueprint);
        monster.damage_per_action = this.parseDamagePerAction(blueprint);
        monster.ability_modifiers = this.parseAbilityModifiers(blueprint);
        monster.saving_throws = this.parseSavingThrows(blueprint);

        return monster;
    }

    static parseDescription(description) {
        let parts = [];
        parts.push(game.i18n.format(`gg5e_mm.monster.common.size.${description.size}`));
        if (description.type.category === "custom") {
            if (description.type.custom.trim().length > 0) {
                parts.push(description.type.custom);
            }
        } else {
            parts.push(game.i18n.format(`gg5e_mm.monster.common.type.${description.type.category}`).toLowerCase());
        }
        let filteredTags = description.tags.split(",").map(x => x.trim()).filter(x => x.length > 0).sort();
        if (filteredTags.length > 0) {
            parts.push(`(${filteredTags.join(", ")})`);
        }
        return parts.join(' ');
    }

    static parseLevel(level) {
        return game.i18n.format('gg5e_mm.monster.view.level', { level: level });
    }

    static parseRank(rank) {
        const name = (rank.type == "custom") ? rank.custom_name : game.i18n.format(`gg5e_mm.monster.common.rank.${rank.type}`);
        if (rank.modifiers.scale_with_players && rank.modifiers.target_players != 1) {
            return game.i18n.format(`gg5e_mm.monster.view.rank.vs`, { name: name, players: rank.modifiers.target_players });
        } else {
            return name;
        }
    }

    static parseRole(role) {
        return (role.type == "custom") ? role.custom_name : game.i18n.format(`gg5e_mm.monster.common.role.${role.type}`);
    }

    static getProficiencyBonus(level) {
        return Math.floor((level + 3) / 4) + 1;
    }

    static getAbilityModifier(level) {
        return Math.floor(level / 4) + 3;
    }

    static getSkillModifier(level) {
        return Math.floor(this.getAbilityModifier(level) * 0.66);
    }

    static getPlayerDamagePerRound(level) {
        const proficiencyBonus = this.getProficiencyBonus(level);
        return (level > 0) ? Math.max((Math.ceil(level / 4) + (((level - 1) % 4) / 8)) * (4.5 + proficiencyBonus), 1) : 4 + level
    }

    static getPlayerHitPointsPerLevel(level) {
        const abilityModifier = this.getAbilityModifier(level);
        return (level * (5 + Math.min(abilityModifier - 2, 5))) + 2
    }

    static parseHitPoints(blueprint) {
        if (blueprint.hit_points.maximum.override) {
            return {
                current: Math.min(blueprint.hit_points.current, blueprint.hit_points.maximum.modifier),
                temporary: blueprint.hit_points.temporary,
                maximum: blueprint.hit_points.maximum.modifier
            };
        } else {
            const playerDamagePerRound = this.getPlayerDamagePerRound(blueprint.combat.level);
            let hp_modifier = blueprint.combat.role.modifiers.hit_points * blueprint.combat.rank.modifiers.hit_points;
            if (blueprint.combat.rank.modifiers.scale_with_players) {
                hp_modifier *= blueprint.combat.rank.modifiers.target_players;
            }
            if (blueprint.combat.rank.modifiers.has_phases) {
                hp_modifier /= blueprint.combat.rank.modifiers.phases.maximum;
            }
            const maximumHitPoints = Math.max(Math.ceil(playerDamagePerRound * 4 * hp_modifier + blueprint.hit_points.maximum.modifier), 1);
            return {
                current: Math.min(blueprint.hit_points.current, maximumHitPoints),
                temporary: blueprint.hit_points.temporary,
                maximum: maximumHitPoints
            };
        }
    }

    static parseArmorClass(blueprint) {
        if (blueprint.armor_class.override) {
            return {
                value: blueprint.armor_class.modifier,
                type: blueprint.armor_class.type
            };
        } else {
            const proficiencyBonus = this.getProficiencyBonus(blueprint.combat.level);
            const abilityModifier = this.getAbilityModifier(blueprint.combat.level);
            const baseModifier = Number(blueprint.armor_class.modifier);
            const roleModifier = Number(blueprint.combat.role.modifiers.armor_class);
            const rankModifier = Number(blueprint.combat.rank.modifiers.armor_class);
            return {
                value: Math.ceil(((abilityModifier + proficiencyBonus) * 0.8) + 10 + roleModifier + rankModifier + baseModifier),
                type: blueprint.armor_class.type
            };
        }
        
    }

    static parsePassivePerception(blueprint) {
        return 10;
    }

    static parseAttackBonus(blueprint) {
        if (blueprint.attack_bonus.override) {
            return {
                value: blueprint.attack_bonus.modifier,
                type: blueprint.attack_bonus.type
            };
        } else {
            const proficiencyBonus = this.getProficiencyBonus(blueprint.combat.level);
            const abilityModifier = this.getAbilityModifier(blueprint.combat.level);
            const baseModifier = Number(blueprint.attack_bonus.modifier);
            const roleModifier = Number(blueprint.combat.role.modifiers.attack_bonus);
            const rankModifier = Number(blueprint.combat.rank.modifiers.attack_bonus);
            
            return {
                value: Math.max(Math.ceil(abilityModifier + proficiencyBonus - 2 + roleModifier + rankModifier), 1)  + baseModifier,
                type: blueprint.attack_bonus.type
            };
        }
    }

    static parseAttackDcs(blueprint) {
        const proficiencyBonus = this.getProficiencyBonus(blueprint.combat.level);
        const abilityModifier = this.getAbilityModifier(blueprint.combat.level);
        const baseModifier = (Math.floor(abilityModifier * 0.66)) + proficiencyBonus + 8;
        const roleModifier = Number(blueprint.combat.role.modifiers.attack_dcs);
        const rankModifier = Number(blueprint.combat.rank.modifiers.attack_dcs);
        const primary = blueprint.attack_dcs.primary;
        const secondary = blueprint.attack_dcs.secondary;
        return {
            primary: {
                value: primary.override ? primary.modifier : Math.max(Math.ceil(baseModifier + roleModifier + rankModifier + primary.modifier), 1),
                type: primary.type
            },
            secondary: {
                value: secondary.override ? secondary.modifier : Math.max(Math.ceil((baseModifier - 3) + roleModifier + rankModifier + secondary.modifier), 1),
                type: secondary.type
            }
        };
    }

    static parseDamagePerAction(blueprint) {
        let static_damage = 0;
        if (blueprint.damage_per_action.override) {
            static_damage = blueprint.damage_per_action.modifier;
        } else {
            const playerHitPointsPerLevel = this.getPlayerHitPointsPerLevel(blueprint.combat.level);
            const baseModifier = Number(blueprint.damage_per_action.modifier);
            const roleModifier = Number(blueprint.combat.role.modifiers.damage_per_action);
            const rankModifier = Number(blueprint.combat.rank.modifiers.damage_per_action);
            static_damage = Math.max(Math.ceil(((playerHitPointsPerLevel / 4) * roleModifier * rankModifier) + baseModifier), 1);
        }
        return {
            value: static_damage,
            dice: blueprint.damage_per_action.use_dice ? this.getDamagePerActionDice(static_damage, blueprint.damage_per_action.die_size, blueprint.damage_per_action.maximum_dice) : null
        };
    }

    static getDamagePerActionDice(damage, die, maximumDice) {
        let scale = (Number(die) + 1) / 2;
        let dice = (maximumDice) ? Math.min(Math.floor(damage / scale), maximumDice) : Math.floor(damage / scale);
        let modifier = damage - Math.floor(dice * scale);

        if (dice > 0) {
            return dice + "d" + die + ((modifier != 0) ? (" " + ((modifier > 0) ? "+ " : "− ") + Math.abs(modifier)) : "");
        } else {
            return null;
        }
    }

    static parseAbilityModifiers(blueprint) {
        const abilityModifier = this.getAbilityModifier(blueprint.combat.level);
        const baseAbilityModifiers = [
			abilityModifier,
			Math.floor(abilityModifier * 0.75),
			Math.floor(abilityModifier * 0.5),
			Math.floor(abilityModifier * 0.4),
			Math.floor(abilityModifier * 0.3),
			Math.floor((abilityModifier * 0.3) - 1)
		];
        const levelAbilityModifiers = {
            str: blueprint.ability_modifiers.ranking.indexOf("str") >= 0 ? baseAbilityModifiers[blueprint.ability_modifiers.ranking.indexOf("str")] : null,
            dex: blueprint.ability_modifiers.ranking.indexOf("dex") >= 0 ? baseAbilityModifiers[blueprint.ability_modifiers.ranking.indexOf("dex")] : null,
            con: blueprint.ability_modifiers.ranking.indexOf("con") >= 0 ? baseAbilityModifiers[blueprint.ability_modifiers.ranking.indexOf("con")] : null,
            int: blueprint.ability_modifiers.ranking.indexOf("int") >= 0 ? baseAbilityModifiers[blueprint.ability_modifiers.ranking.indexOf("int")] : null,
            wis: blueprint.ability_modifiers.ranking.indexOf("wis") >= 0 ? baseAbilityModifiers[blueprint.ability_modifiers.ranking.indexOf("wis")] : null,
            cha: blueprint.ability_modifiers.ranking.indexOf("cha") >= 0 ? baseAbilityModifiers[blueprint.ability_modifiers.ranking.indexOf("cha")] : null
        };
        if (blueprint.ability_modifiers.modifiers) {
            const modifiers = blueprint.ability_modifiers.modifiers.split(",").map(x => x.split("="));
            modifiers.forEach(function(modifier) {
                const ability = modifier[0].trim().toLowerCase();
                const value = Number(modifier[1]);
                if (["str", "dex", "con", "int", "wis", "cha"].includes(ability)) {
                    if (blueprint.ability_modifiers.override) {
                        levelAbilityModifiers[ability] = value;
                    } else {
                        levelAbilityModifiers[ability] += value;
                    }
                }
            });
        }
        return levelAbilityModifiers;
    }

    static parseSavingThrows(blueprint) {
        const proficiencyBonus = this.getProficiencyBonus(blueprint.combat.level);
        const abilityModifier = this.getAbilityModifier(blueprint.combat.level);
        const baseSavingThrows = [
			abilityModifier + proficiencyBonus,
			Math.floor((abilityModifier + proficiencyBonus) * 0.66),
			Math.floor((abilityModifier + proficiencyBonus) * 0.66),
			Math.floor(((abilityModifier + proficiencyBonus) * 0.33) - 0.75),
			Math.floor(((abilityModifier + proficiencyBonus) * 0.33) - 0.75),
			Math.floor(((abilityModifier + proficiencyBonus) * 0.33) - 0.75)
		];
        const levelSavingThrows = {
            str: baseSavingThrows[blueprint.saving_throws.ranking.indexOf("str")] + blueprint.combat.role.modifiers.saving_throws + blueprint.combat.rank.modifiers.saving_throws,
            dex: baseSavingThrows[blueprint.saving_throws.ranking.indexOf("dex")] + blueprint.combat.role.modifiers.saving_throws + blueprint.combat.rank.modifiers.saving_throws,
            con: baseSavingThrows[blueprint.saving_throws.ranking.indexOf("con")] + blueprint.combat.role.modifiers.saving_throws + blueprint.combat.rank.modifiers.saving_throws,
            int: baseSavingThrows[blueprint.saving_throws.ranking.indexOf("int")] + blueprint.combat.role.modifiers.saving_throws + blueprint.combat.rank.modifiers.saving_throws,
            wis: baseSavingThrows[blueprint.saving_throws.ranking.indexOf("wis")] + blueprint.combat.role.modifiers.saving_throws + blueprint.combat.rank.modifiers.saving_throws,
            cha: baseSavingThrows[blueprint.saving_throws.ranking.indexOf("cha")] + blueprint.combat.role.modifiers.saving_throws + blueprint.combat.rank.modifiers.saving_throws
        };
        if (blueprint.saving_throws.modifiers) {
            const modifiers = blueprint.saving_throws.modifiers.split(",").map(x => x.split("="));
            modifiers.forEach(function(modifier) {
                const ability = modifier[0].trim().toLowerCase();
                const value = Number(modifier[1]);
                if (["str", "dex", "con", "int", "wis", "cha"].includes(ability)) {
                    if (blueprint.saving_throws.override) {
                        levelSavingThrows[ability] = value;
                    } else {
                        levelSavingThrows[ability] += value;
                    }
                }
            });
        }
        return levelSavingThrows;
    }
}