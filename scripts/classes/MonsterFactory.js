import Dice from "./Dice.js";
import { DEFAULT_LANGUAGES } from "../consts/DefaultLanguages.js";
import { DEFAULT_DAMAGE_TYPES } from "../consts/DefaultDamageTypes.js";
import { DEFAULT_CONDITIONS } from "../consts/DefaultConditions.js";
import { DEFAULT_SKILLS } from "../consts/DefaultSkills.js";

const MonsterFactory = (function() {

	function createEntity(blueprint) {
		let abilityModifiers = _parseAbilityModifiers(
			blueprint.data.combat.level,
			blueprint.data.ability_modifiers
		);
		
		return {
			vid: blueprint.vid,
			type: blueprint.type,
			data: {
				name: _parseName(blueprint.data.description.name),
				image: _parseImage(blueprint.data.description.image),
				description: _parseDescription(blueprint.data.description),
				combat: {
					level: _parseLevel(blueprint.data.combat.level),
					rank: _parseRank(blueprint.data.combat.rank),
					phase: _parsePhase(blueprint.data.combat.rank),
					role: _parseRole(blueprint.data.combat.role)
				},
				hit_points: _parseHitPoints(
					blueprint.data.combat.level,
					blueprint.data.hit_points,
					blueprint.data.combat.rank.modifiers,
					blueprint.data.combat.role.modifiers
				),
				armor_class: _parseArmorClass(
					blueprint.data.combat.level,
					blueprint.data.armor_class,
					blueprint.data.combat.rank.modifiers,
					blueprint.data.combat.role.modifiers
				),
				passive_perception: _parsePassivePerception(),
				attack_bonus: _parseAttackBonus(
					blueprint.data.combat.level,
					blueprint.data.attack_bonus,
					blueprint.data.combat.rank.modifiers,
					blueprint.data.combat.role.modifiers
				),
				attack_dcs: _parseAttackDcs(
					blueprint.data.combat.level,
					blueprint.data.attack_dcs,
					blueprint.data.combat.rank.modifiers,
					blueprint.data.combat.role.modifiers
				),
				damage_per_action: _parseDamagePerAction(
					blueprint.data.combat.level,
					blueprint.data.damage_per_action,
					blueprint.data.combat.rank.modifiers,
					blueprint.data.combat.role.modifiers
				),
				ability_modifiers: abilityModifiers,
				saving_throws: _parseSavingThrows(
					blueprint.data.combat.level,
					blueprint.data.saving_throws,
					blueprint.data.combat.rank.modifiers,
					blueprint.data.combat.role.modifiers
				),
				speeds: _parseSpeeds(blueprint.data.speeds),
				senses: _parseSenses(blueprint.data.senses),
				languages: _parseLanguages(blueprint.data.languages),
				damage_resistances: _parseDamageResistances(blueprint.data.damage_resistances),
				damage_immunities: _parseDamageImmunities(blueprint.data.damage_immunities),
				damage_vulnerabilities: _parseDamageVulnerabilities(blueprint.data.damage_vulnerabilities),
				condition_immunities: _parseConditionImmunities(blueprint.data.condition_immunities),
				skills: _parseSkills(blueprint.data.combat.level, blueprint.data.skills, abilityModifiers)
			}
		};
	}

	function _getProficiencyBonus(level) {
        return Math.floor((level + 3) / 4) + 1;
    }

    function _getAbilityModifier(level) {
        return Math.floor(level / 4) + 3;
    }

    function _getAbilityModifiers(level) {
        const abilityModifier = _getAbilityModifier(level);
        return [
			abilityModifier,
			Math.floor(abilityModifier * 0.75),
			Math.floor(abilityModifier * 0.5),
			Math.floor(abilityModifier * 0.4),
			Math.floor(abilityModifier * 0.3),
			Math.floor((abilityModifier * 0.3) - 1)
		];
    }

	function _getSavingThrows(level) {
		const proficiencyBonus = _getProficiencyBonus(level);
        const abilityModifier = _getAbilityModifier(level);
        return [
			abilityModifier + proficiencyBonus,
			Math.floor((abilityModifier + proficiencyBonus) * 0.66),
			Math.floor((abilityModifier + proficiencyBonus) * 0.66),
			Math.floor(((abilityModifier + proficiencyBonus) * 0.33) - 0.75),
			Math.floor(((abilityModifier + proficiencyBonus) * 0.33) - 0.75),
			Math.floor(((abilityModifier + proficiencyBonus) * 0.33) - 0.75)
		];
	}

    function _getPlayerDamagePerRound(level) {
        const proficiencyBonus = _getProficiencyBonus(level);
        return (level > 0) ? Math.max((Math.ceil(level / 4) + (((level - 1) % 4) / 8)) * (4.5 + proficiencyBonus), 1) : 4 + level
    }

    function _getPlayerHitPointsPerLevel(level) {
        const abilityModifier = _getAbilityModifier(level);
        return (level * (5 + Math.min(abilityModifier - 2, 5))) + 2
    }

	function _parseName(name) {
		return (name && name.trim().length > 0) ? name.trim() : "???";
	}

	function _parseImage(image) {
		return image;
	}

	function _parseDescription(description) {
        let parts = [];
        parts.push(game.i18n.format(`gg5e_mm.monster.common.size.${description.size}`));
        if (description.type.category === "custom") {
            if (description.type.custom.trim().length > 0) {
                parts.push(description.type.custom);
            }
        } else {
            parts.push(game.i18n.format(`gg5e_mm.monster.common.type.${description.type.category}`).toLowerCase());
        }
        let tags = description.tags ? description.tags.split(",").map(x => x.trim()).filter(x => x.length > 0).sort() : "";
        if (tags.length > 0) {
            parts.push(`(${tags.join(", ")})`);
        }
		let alignment = game.i18n.format(`gg5e_mm.monster.common.alignment.${description.alignment}`).toLowerCase();
        return `${parts.join(' ')}, ${alignment}`;
    }

	function _parseLevel(level) {
        return game.i18n.format('gg5e_mm.monster.view.level', { level: level });
    }

    function _parseRank(rank) {
        let name = (rank.type == "custom") ? rank.custom_name : game.i18n.format(`gg5e_mm.monster.common.rank.${rank.type}`);
		if (!name || name.trim().length == 0 ) {
			name = "???";
		}
        if (rank.modifiers.scale_with_players && rank.modifiers.target_players != 1) {
            name = game.i18n.format(
				`gg5e_mm.monster.view.rank.vs`,
				{ name: name, players: rank.modifiers.target_players }
			);
		}
		return {
			name: name,
			threat: rank.modifiers.threat
        };
    }

	function _parsePhase(rank) {
        if (rank.modifiers.has_phases && rank.modifiers.phases.maximum > 1) {
            return game.i18n.format('gg5e_mm.monster.view.phase', rank.modifiers.phases);
        } else {
            return null;
        }
    }

    function _parseRole(role) {
		let name = (role.type == "custom") ? role.custom_name : game.i18n.format(`gg5e_mm.monster.common.role.${role.type}`);
		if (!name || name.trim().length == 0 ) {
			name = "???";
		}
        return {
            name: name,
            icon: role.modifiers.icon
        };
    }   

    function _parseHitPoints(level, hitPoints, rankModifiers, roleModifiers) {
		let maximumHitPoints = 0;

        if (hitPoints.maximum.override) {
			maximumHitPoints = hitPoints.maximum.modifier;
        } else {
            let playerDamagePerRound = _getPlayerDamagePerRound(level);
            let hp_modifier = roleModifiers.hit_points * rankModifiers.hit_points;
			hp_modifier *= (rankModifiers.scale_with_players) ? rankModifiers.target_players : 1;
			hp_modifier /= (rankModifiers.has_phases) ? rankModifiers.phases.maximum : 1;
            maximumHitPoints = Math.max(Math.ceil(playerDamagePerRound * 4 * hp_modifier + hitPoints.maximum.modifier), 1);
        }

		return {
			current: Math.min(hitPoints.current, maximumHitPoints),
			temporary: Math.max(hitPoints.temporary, 0),
			maximum: maximumHitPoints
		};
    }

    function _parseArmorClass(level, armorClass, rankModifiers, roleModifiers) {
		let ac = 0;

        if (armorClass.override) {
            armorClass = armorClass.modifier;
        } else {
            let proficiencyBonus = _getProficiencyBonus(level);
            let abilityModifier = _getAbilityModifier(level);
            let baseModifier = Number(armorClass.modifier);
			let rankModifier = Number(rankModifiers.armor_class);
            let roleModifier = Number(roleModifiers.armor_class);
			ac = Math.ceil(((abilityModifier + proficiencyBonus) * 0.8) + 10 + roleModifier + rankModifier + baseModifier)
        }

		return {
			value: ac,
			type: armorClass.type
		};
    }

    function _parsePassivePerception() {
        return 10;
    }

    function _parseAttackBonus(level, attackBonus, rankModifiers, roleModifiers) {
		let ab = 0;

        if (attackBonus.override) {
            ab = attackBonus.modifier;
        } else {
            let proficiencyBonus = _getProficiencyBonus(level);
            let abilityModifier = _getAbilityModifier(level);
            let baseModifier = Number(attackBonus.modifier);
            let roleModifier = Number(roleModifiers.attack_bonus);
            let rankModifier = Number(rankModifiers.attack_bonus);
			ab = Math.max(Math.ceil(abilityModifier + proficiencyBonus - 2 + roleModifier + rankModifier), 1)  + baseModifier;
        }

		return {
			value: ab,
			type: attackBonus.type
		};
    }

    function _parseAttackDcs(level, attackDcs, rankModifiers, roleModifiers) {
        let proficiencyBonus = _getProficiencyBonus(level);
        let abilityModifier = _getAbilityModifier(level);
        let baseModifier = (Math.floor(abilityModifier * 0.66)) + proficiencyBonus + 8;
        let roleModifier = Number(roleModifiers.attack_dcs);
        let rankModifier = Number(rankModifiers.attack_dcs);
        let primary = attackDcs.primary;
        let secondary = attackDcs.secondary;
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

    function _parseDamagePerAction(level, damagePerAction, rankModifiers, roleModifiers) {
        let static_damage = 0;

        if (damagePerAction.override) {
            static_damage = damagePerAction.modifier;
        } else {
            let playerHitPointsPerLevel = _getPlayerHitPointsPerLevel(level);
            let baseModifier = Number(damagePerAction.modifier);
            let roleModifier = Number(roleModifiers.damage_per_action);
            let rankModifier = Number(rankModifiers.damage_per_action);
            static_damage = Math.max(Math.ceil(((playerHitPointsPerLevel / 4) * roleModifier * rankModifier) + baseModifier), 1);
        }

		let dice = Dice.getDiceRoll(static_damage, damagePerAction.die_size, damagePerAction.maximum_dice);

        return {
            value: static_damage,
            dice: dice ? dice : "—",
            type: damagePerAction.type
        };
    }

    function _parseAbilityModifiers(level, abilityModifiers) {
        const baseAbilityModifiers = _getAbilityModifiers(level);
        const levelAbilityModifiers = {
            str: abilityModifiers.ranking.indexOf("str") >= 0 ? baseAbilityModifiers[abilityModifiers.ranking.indexOf("str")] : null,
            dex: abilityModifiers.ranking.indexOf("dex") >= 0 ? baseAbilityModifiers[abilityModifiers.ranking.indexOf("dex")] : null,
            con: abilityModifiers.ranking.indexOf("con") >= 0 ? baseAbilityModifiers[abilityModifiers.ranking.indexOf("con")] : null,
            int: abilityModifiers.ranking.indexOf("int") >= 0 ? baseAbilityModifiers[abilityModifiers.ranking.indexOf("int")] : null,
            wis: abilityModifiers.ranking.indexOf("wis") >= 0 ? baseAbilityModifiers[abilityModifiers.ranking.indexOf("wis")] : null,
            cha: abilityModifiers.ranking.indexOf("cha") >= 0 ? baseAbilityModifiers[abilityModifiers.ranking.indexOf("cha")] : null
        };
        if (abilityModifiers.modifiers) {
            const modifiers = abilityModifiers.modifiers.split(",").map(x => x.split("="));
            modifiers.forEach(function(modifier) {
                const ability = modifier[0].trim().toLowerCase();
                const value = Number(modifier[1]);
                if (["str", "dex", "con", "int", "wis", "cha"].includes(ability)) {
                    if (abilityModifiers.override) {
                        levelAbilityModifiers[ability] = value;
                    } else {
                        levelAbilityModifiers[ability] += value;
                    }
                }
            });
        }
        return levelAbilityModifiers;
    }

    function _parseSavingThrows(level, savingThrows, rankModifiers, roleModifiers) {
        const baseSavingThrows = _getSavingThrows(level);
        const levelSavingThrows = {
            str: baseSavingThrows[savingThrows.ranking.indexOf("str")] + roleModifiers.saving_throws + rankModifiers.saving_throws,
            dex: baseSavingThrows[savingThrows.ranking.indexOf("dex")] + roleModifiers.saving_throws + rankModifiers.saving_throws,
            con: baseSavingThrows[savingThrows.ranking.indexOf("con")] + roleModifiers.saving_throws + rankModifiers.saving_throws,
            int: baseSavingThrows[savingThrows.ranking.indexOf("int")] + roleModifiers.saving_throws + rankModifiers.saving_throws,
            wis: baseSavingThrows[savingThrows.ranking.indexOf("wis")] + roleModifiers.saving_throws + rankModifiers.saving_throws,
            cha: baseSavingThrows[savingThrows.ranking.indexOf("cha")] + roleModifiers.saving_throws + rankModifiers.saving_throws
        };
        if (savingThrows.modifiers) {
            const modifiers = savingThrows.modifiers.split(",").map(x => x.split("="));
            modifiers.forEach(function(modifier) {
                const ability = modifier[0].trim().toLowerCase();
                const value = Number(modifier[1]);
                if (["str", "dex", "con", "int", "wis", "cha"].includes(ability)) {
                    if (savingThrows.override) {
                        levelSavingThrows[ability] = value;
                    } else {
                        levelSavingThrows[ability] += value;
                    }
                }
            });
        }
        return levelSavingThrows;
    }

	function _parseSpeeds(speeds) {
		let parts = [];
		["walk", "burrow", "climb", "fly", "swim"].forEach(function(type) {
			if (speeds[type]) {
				let description = game.i18n.format(`gg5e_mm.monster.common.speeds.${type}`);
				description += ` ${game.i18n.format(`gg5e_mm.monster.view.speeds.${speeds.unit}`, { distance: speeds[type] })}`;
				if (type == "fly" && speeds.can_hover) {
					description += ` (${game.i18n.format(`gg5e_mm.monster.common.speeds.can_hover`).toLowerCase()})`;
				}
				parts.push((parts.length == 0) ? description : description.toLowerCase());
			}
		});
		return parts.join(", ");
    }

	function _parseSenses(senses) {
		let parts = [];
		["blindsight", "darkvision", "tremorsense", "truesight"].forEach(function(type) {
			if (senses[type]) {
				let description = game.i18n.format(`gg5e_mm.monster.common.senses.${type}`);
				description += ` ${game.i18n.format(`gg5e_mm.monster.view.senses.${senses.unit}`, { distance: senses[type] })}`;
				parts.push((parts.length == 0) ? description : description.toLowerCase());
			}
		});
		let others = senses.other ? senses.other.split(",").map(x => x.trim()).filter(x => x.length > 0).sort() : "";
        if (others.length > 0) {
            parts.push(others);
        }
		return parts.join(", ");
    }

	function _parseLanguages(languages) {
		let parts = [];
		DEFAULT_LANGUAGES.forEach(function(language) {
			if (languages[language]) {
				parts.push(game.i18n.format(`gg5e_mm.monster.common.languages.${language}`));
			}
		});
		let others = languages.other ? languages.other.split(",").map(x => x.trim()).filter(x => x.length > 0) : "";
        if (others.length > 0) {
            parts.push(others);
        }
		return parts.sort().join(", ");
	}

	function _parseDamageResistances(damageResistances) {
		let parts = [];
		DEFAULT_DAMAGE_TYPES.forEach(function(damage) {
			if (damageResistances[damage]) {
				parts.push(game.i18n.format(`gg5e_mm.monster.common.damage.${damage}`));
			}
		});
		let others = damageResistances.other ? damageResistances.other.split(",").map(x => x.trim()).filter(x => x.length > 0) : "";
        if (others.length > 0) {
            parts.push(others);
        }
		return parts.sort().join(", ");
	}

	function _parseDamageVulnerabilities(damageVulnerabilities) {
		let parts = [];
		DEFAULT_DAMAGE_TYPES.forEach(function(damage) {
			if (damageVulnerabilities[damage]) {
				parts.push(game.i18n.format(`gg5e_mm.monster.common.damage.${damage}`));
			}
		});
		let others = damageVulnerabilities.other ? damageVulnerabilities.other.split(",").map(x => x.trim()).filter(x => x.length > 0) : "";
        if (others.length > 0) {
            parts.push(others);
        }
		return parts.sort().join(", ");
	}

	function _parseDamageImmunities(damageImmunities) {
		let parts = [];
		DEFAULT_DAMAGE_TYPES.forEach(function(damage) {
			if (damageImmunities[damage]) {
				parts.push(game.i18n.format(`gg5e_mm.monster.common.damage.${damage}`));
			}
		});
		let others = damageImmunities.other ? damageImmunities.other.split(",").map(x => x.trim()).filter(x => x.length > 0) : "";
        if (others.length > 0) {
            parts.push(others);
        }
		return parts.sort().join(", ");
	}

	function _parseConditionImmunities(conditionImmunities) {
		let parts = [];
		DEFAULT_CONDITIONS.forEach(function(condition) {
			if (conditionImmunities[condition]) {
				parts.push(game.i18n.format(`gg5e_mm.monster.common.condition.${condition}`));
			}
		});
		let others = conditionImmunities.other ? conditionImmunities.other.split(",").map(x => x.trim()).filter(x => x.length > 0) : "";
        if (others.length > 0) {
            parts.push(others);
        }
		return parts.sort().join(", ");
	}

	function _parseSkills(level, skills, abilityModifiers) {
		const proficiencyBonus = _getProficiencyBonus(level);
		let parts = [];
		DEFAULT_SKILLS.forEach(function(skill) {
			if (skills[skill.name]) {
				let description = game.i18n.format(`gg5e_mm.monster.common.skill.${skill.name}`);
				description += ` (${game.i18n.format(`gg5e_mm.monster.common.ability.${skill.ability}.code`)})`;
				let bonus = abilityModifiers[skill.ability];
				switch (skills[skill.name]) {
					case "half-proficient":
						bonus += Math.floor(proficiencyBonus / 2);
						break;
					case "proficient":
						bonus += proficiencyBonus;
						break;
					case "expert":
						bonus += proficiencyBonus * 2;
						break;
				}
				description += ` ${bonus >= 0 ? `+${bonus}` : bonus}`;
				parts.push(description);
			}
		});
		return parts.sort().join(", ");
	}

	return {
		createEntity: createEntity
	};
})();

export default MonsterFactory;
