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

const MonsterForge = (function() {

	function createArtifact(blueprint) {
		const derivedAttributes = MonsterHelpers.getDerivedAttributes(
			blueprint.data.combat.level,
			blueprint.data.combat.rank,
			blueprint.data.combat.role
		);
		const monsterProficiency = _parseProficiency(derivedAttributes, blueprint.data.proficiency_bonus);
		const monsterAbilityModifiers = _parseAbilityModifiers(derivedAttributes, blueprint.data.ability_modifiers);
		const monsterRank = _parseRank(derivedAttributes.rank);
		const monsterRole = _parseRole(derivedAttributes.role);
		const monsterSkills = _parseSkills(monsterProficiency, blueprint.data.skills, derivedAttributes.role);
		const monsterInventoryWeight = _getInventoryWeight(blueprint.data);
		const monsterInventoryCapacity = _getInventoryCapacity(monsterAbilityModifiers, blueprint.data);
		const monsterClasses = blueprint.data.traits.items.filter((x) => x.class );
		const showLegendaryActions = blueprint.data.legendary_actions.always_show || blueprint.data.legendary_actions.maximum > 0 || blueprint.data.legendary_actions.items.length > 0;
		const ignoreItemRequirements = blueprint.data.display.ignore_item_requirements;

		return {
			vid: 1,
			type: blueprint.type,
			data: {
				ability_modifiers: monsterAbilityModifiers,
				actions: _parseActions(derivedAttributes, blueprint.data.actions, ignoreItemRequirements),
				armor_class: _parseArmorClass(derivedAttributes, blueprint.data.armor_class),
				attack_bonus: _parseAttackBonus(derivedAttributes, blueprint.data.attack_bonus),
				attack_dcs: _parseAttackDcs(derivedAttributes, blueprint.data.attack_dcs),
				biography: _parseBiography(blueprint.data.biography),
				bonus_actions: _parseBonusActions(derivedAttributes, blueprint.data.bonus_actions, ignoreItemRequirements),
				challenge_rating: _parseChallengeRating(derivedAttributes, blueprint.data.challenge_rating),
				condition_immunities: _parseCollection(GMM_5E_CONDITIONS, blueprint.data.condition_immunities, "condition"),
				damage_immunities: _parseCollection(GMM_5E_DAMAGE_TYPES, blueprint.data.damage_immunities, "damage"),
				damage_per_action: _parseDamagePerAction(derivedAttributes, blueprint.data.damage_per_action),
				damage_resistances: _parseCollection(GMM_5E_DAMAGE_TYPES, blueprint.data.damage_resistances, "damage"),
				damage_vulnerabilities: _parseCollection(GMM_5E_DAMAGE_TYPES, blueprint.data.damage_vulnerabilities, "damage"),
				description: _parseDescription(blueprint.data.description),
				hit_points: _parseHitPoints(derivedAttributes, blueprint.data.hit_points),
				image: blueprint.data.description.image,
				initiative: _parseInitiative(monsterAbilityModifiers, derivedAttributes.rank, derivedAttributes.role, blueprint.data.initiative),
				inventory: _parseInventory(monsterInventoryWeight, monsterInventoryCapacity, blueprint.data.inventory),
				lair_actions: _parseLairActions(derivedAttributes, blueprint.data.lair_actions, ignoreItemRequirements),
				languages: _parseCollection(GMM_5E_LANGUAGES, blueprint.data.languages, "language"),
				legendary_actions: _parseLegendaryActions(derivedAttributes, blueprint.data.legendary_actions, showLegendaryActions, ignoreItemRequirements),
				legendary_resistances: _parseLegendaryResistances(blueprint.data.legendary_resistances),
				level: _parseLevel(derivedAttributes.level),
				name: _parseName(blueprint.data.description.name),
				paragon_actions: _parseParagonActions(derivedAttributes.rank, blueprint.data.paragon_actions, showLegendaryActions),
				passive_perception: _parsePassivePerception(monsterSkills, monsterAbilityModifiers, derivedAttributes.rank, derivedAttributes.role, blueprint.data.passive_perception),
				phase: _parsePhase(derivedAttributes.rank),
				proficiency_bonus: monsterProficiency,
				rank: monsterRank,
				reactions: _parseReactions(derivedAttributes, blueprint.data.reactions, ignoreItemRequirements),
				role: monsterRole,
				saving_throws: _parseSavingThrows(blueprint.data.saving_throws, monsterProficiency, monsterAbilityModifiers),
				senses: _parseSenses(blueprint.data.senses),
				skills: monsterSkills,
				speeds: _parseSpeeds(blueprint.data.speeds, derivedAttributes.role),
				spellbook: _parseSpellbook(monsterAbilityModifiers, monsterClasses, blueprint.data.spellbook),
				traits: _parseTraits(derivedAttributes, blueprint.data.traits, ignoreItemRequirements),
				xp: _parseXp(derivedAttributes, blueprint.data.xp)
			}
		};
	}

	function _parseName(name) {
		return (name && name.trim().length > 0) ? name.trim() : "???";
	}

	function _parseDescription(description) {
		const parts = [];

		// Render creature size
		if (description.size) {
			parts.push(game.i18n.format(`gmm.common.size.${description.size}`));
		}

		// Render creature category
		let category = "";
		if (!description.type.category) {
			if (description.type.custom.trim().length > 0) {
				category = description.type.custom;
			}
		} else {
			category = game.i18n.format(`gmm.common.category.${description.type.swarm ? "multiple" : "single"}.${description.type.category}`).toLowerCase();
		}

		// Render creature tags
		const tags = description.type.tags ? description.type.tags.split(";").map(x => x.trim()).filter(x => x.length > 0).sort() : "";
		if (tags.length > 0) {
			category += `${category.length == 0 ? '' : ' '}(${tags.join(", ")})`;
		}

		// Render creature swarm
		if (description.type.swarm) {
			let swarmSize = game.i18n.format(`gmm.common.size.${description.type.swarm}`).toLowerCase();
			parts.push( game.i18n.format(`gmm.monster.artifact.description.swarm`, {
				size: swarmSize,
				category: category
			}));
		} else {
			parts.push(category);
		}

		// Render creature alignment
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
		if (!name || name.trim().length == 0 ) {
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
			name: (!name || name.trim().length == 0 ) ? "???" : name,
			icon: role.modifiers.icon
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
			maximum: maximumHp
		};
	}

	function _parseArmorClass(derivedAttributes, armorClass) {
		const ac = derivedAttributes.armorClass;
		ac.applyModifier(armorClass.modifier.value, armorClass.modifier.override);
		ac.setMinimumValue(1);
		ac.ceil();

		return $.extend(ac, { type: armorClass.type });
	}

	function _parseAttackBonus(derivedAttributes, attackBonus) {
		const ab = derivedAttributes.attackBonus;
		ab.applyModifier(attackBonus.modifier.value, attackBonus.modifier.override);
		ab.setMinimumValue(1);
		ab.ceil();

		return $.extend(ab, { type: attackBonus.type });
	}

	function _parseAttackDcs(derivedAttributes, attackDcs) {
		const dcs = derivedAttributes.attackDcs;
		dcs.primary.applyModifier(attackDcs.primary.modifier.value, attackDcs.primary.modifier.override);
		dcs.primary.setMinimumValue(0);
		dcs.primary.ceil();
		dcs.secondary.applyModifier(attackDcs.secondary.modifier.value, attackDcs.secondary.modifier.override);
		dcs.secondary.setMinimumValue(0);
		dcs.secondary.ceil();

		return {
			primary: $.extend(dcs.primary, { type: attackDcs.primary.type }),
			secondary: $.extend(dcs.secondary, { type: attackDcs.secondary.type })
		};
	}

	function _parseDamagePerAction(derivedAttributes, damagePerAction) {
		const damage = derivedAttributes.damagePerAction;
		damage.applyModifier(damagePerAction.modifier.value, damagePerAction.modifier.override);
		damage.setMinimumValue(1);
		damage.ceil();

		const dice = Dice.getDiceRoll(damage.value, damagePerAction.die_size, damagePerAction.maximum_dice);

		return $.extend(damage, {
			dice: dice ? dice : "—",
			type: damagePerAction.type,
			die_size: damagePerAction.die_size ? `d${damagePerAction.die_size}` : null
		});
	}

	function _parseAbilityModifiers(derivedAttributes, abilityModifiers) {
		const ams = {};
		GMM_5E_ABILITIES.forEach((x) => {
			let ranking = abilityModifiers.ranking.indexOf(x);
			ams[x] = derivedAttributes.abilityModifiers[ranking];
		});

		if (abilityModifiers.modifier.value) {
			const modifiers = abilityModifiers.modifier.value.split(";").map(x => x.split("="));
			modifiers.forEach(function(modifier) {
				const ability = modifier[0].trim().toLowerCase();
				const value = Number(modifier[1]);
				if (GMM_5E_ABILITIES.includes(ability)) {
					ams[ability].applyModifier(value, abilityModifiers.modifier.override);
				}
			});
		}

		for (const am in ams) {
			ams[am].ceil();
			ams[am].score = 10 + (2 * ams[am].value);
		}

		return ams;
	}

	function _parseSavingThrows(savingThrows, pb, abilityModifiers) {
		const sts = {};
		GMM_5E_ABILITIES.forEach(function (attrName) {
			if (savingThrows[attrName]) {
				sts[attrName] = new DerivedAttribute();
				sts[attrName].value = 0;
				if (savingThrows[attrName].trained) {
					sts[attrName].applyModifier(pb, savingThrows[attrName].modifier.override);
				}
				sts[attrName].applyModifier(abilityModifiers[attrName].value, savingThrows[attrName].modifier.override);
				if (savingThrows[attrName].modifier.value) {
					sts[attrName].applyModifier(savingThrows[attrName].modifier.value, savingThrows[attrName].modifier.override);
				}
				
			}
		});
		return sts;
	}

	function _parseProficiency(derivedAttributes, proficiencyBonus) {
		const prof = new DerivedAttribute();
		prof.setValue(derivedAttributes.proficiencyBonus, game.i18n.format('gmm.common.derived_source.base'));
		prof.applyModifier(proficiencyBonus.modifier.value, proficiencyBonus.modifier.override);
		prof.setMinimumValue(1);
		prof.ceil();

		return prof;
	}

	function _parseSkills(proficiencyBonus, monsterSkills, monsterRole) {
		let skills = [];
		monsterRole.modifiers.skill.forEach(function (s) {
			monsterSkills[s] = "proficient";
		});
		GMM_5E_SKILLS.forEach(function(defaultSkill) {
			if (monsterSkills[defaultSkill.name]) {
				let proficiencyModifier = 0;
				let proficiencyType = "";
				switch (monsterSkills[defaultSkill.name]) {
					case "half-proficient":
						proficiencyModifier = Math.floor(proficiencyBonus / 2);
						proficiencyType = game.i18n.format('gmm.common.derived_source.half_proficiency');
						break;
					case "proficient":
						proficiencyModifier = proficiencyBonus;
						proficiencyType = game.i18n.format('gmm.common.derived_source.proficiency');
						break;
					case "expert":
						proficiencyModifier = proficiencyBonus * 2;
						proficiencyType = game.i18n.format('gmm.common.derived_source.expertise');
						break;
				}

				const skill = new DerivedAttribute();
				skill.add(proficiencyModifier, proficiencyType);

				skills.push($.extend(skill, {
					code: defaultSkill.name,
					ability: defaultSkill.ability,
					title: game.i18n.format(`gmm.common.skill.${defaultSkill.name}`)
				}));
			}
		});
		return skills;
	}

	function _parseSpeeds(monsterSpeeds, role) {
		const speeds = [];
		GMM_5E_SPEEDS.forEach(function(defaultSpeed) {
			if (monsterSpeeds[defaultSpeed]) {
				const speed = new DerivedAttribute();
				speed.add(monsterSpeeds[defaultSpeed], game.i18n.format('gmm.common.derived_source.base'));
				speed.add(role.modifiers.speed, game.i18n.format('gmm.common.derived_source.role'));
				speed.setMinimumValue(1);
				speed.ceil();

				const details = {};
				details.title = game.i18n.format(`gmm.common.speed.${defaultSpeed}`);
				details.units = monsterSpeeds.units;
				if (defaultSpeed == "fly" && monsterSpeeds.can_hover) {
					details.detail =  game.i18n.format(`gmm.common.speed.can_hover`).toLowerCase();
				}

				speeds.push($.extend(speed, details));
			}
		});

		if (monsterSpeeds.other) {
			monsterSpeeds.other.split(";").map(x => x.split("=")).forEach((x) => {;
				speeds.push({
					title: x[0].trim().toLowerCase(),
					value: Number(x[1]) ? Number(x[1]) : null,
					units: monsterSpeeds.units
				});
			});
		}

		return speeds;
	}

	function _parseSenses(monsterSenses) {
		const senses = [];
		GMM_5E_SENSES.forEach(function(type) {
			if (monsterSenses[type]) {
				const sense = {};
				sense.title = game.i18n.format(`gmm.common.sense.${type}`);
				sense.value = monsterSenses[type];
				sense.units = monsterSenses.units;
				senses.push(sense);
			}
		});

		if (monsterSenses.other) {
			monsterSenses.other.split(";").map(x => x.split("=")).forEach((x) => {
				senses.push({
					title: x[0].trim().toLowerCase(),
					value: Number(x[1]) ? Number(x[1]) : null,
					units: monsterSenses.units
				});
			});
		}

		return senses;
	}

	function _parsePassivePerception(skills, abilityModifiers, rank, role, passivePerception) {
		const basePerc = 10;
		const percep = new DerivedAttribute();
		percep.add(basePerc, game.i18n.format('gmm.common.derived_source.base'));

		if (skills.find((x) => x.code == "perception")) {
			const skillPerc = skills.find((x) => x.code == "perception").getValue();
			percep.add(skillPerc, game.i18n.format('gmm.common.derived_source.perception'));
		} else {
			const wisPerc = abilityModifiers["wis"].getValue();
			percep.add(wisPerc, game.i18n.format('gmm.common.derived_source.ability_modifier'));
		}
		
		percep.applyModifier(passivePerception.modifier.value, passivePerception.modifier.override);
		percep.setMinimumValue(1);
		percep.ceil();

		return percep;
	}

	function _parseCollection(collection, options, key) {
		let output = [];
		collection.forEach(function(type) {
			if (options[type]) {
				output.push(game.i18n.format(`gmm.common.${key}.${type}`));
			}
		});

		if (options.other) {
			options.other.split(";").forEach((x) => output.push(x));
		}
		
		return output;
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

	function _parseInitiative(monsterAbilityModifiers, rank, role, initiative) {
		const init = new DerivedAttribute();
		init.add(monsterAbilityModifiers[initiative.ability].value, game.i18n.format('gmm.common.derived_source.ability_modifier'));
		init.add(rank.modifiers.initiative, game.i18n.format('gmm.common.derived_source.rank'));
		init.add(role.modifiers.initiative, game.i18n.format('gmm.common.derived_source.role'));
		init.applyModifier(initiative.modifier.value, initiative.modifier.override);
		init.ceil();

		return $.extend(init, {
			ability: initiative.ability,
			advantage: initiative.advantage
		});
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

		return {
			visible: paragonActions.always_show || (!showLegendaryActions && (mx.value > 0)),
			current: paragonActions.current,
			maximum: mx
		};
	}

	function _parseLegendaryResistances(legendaryResistances) {
		return {
			visible: legendaryResistances.always_show || legendaryResistances.maximum > 0,
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
			visible: lairActions.always_show || lairActions.initiative > 0 || lairActions.items.length > 0,
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

	function _parseSpellbook(monsterAbilityModifiers, monsterClasses, spellbook) {
		const dc = new DerivedAttribute();
		dc.add(8, game.i18n.format('gmm.common.derived_source.base'));
		dc.add(monsterAbilityModifiers[spellbook.spellcasting.ability]?.value, game.i18n.format('gmm.common.derived_source.ability_modifier'));
		dc.applyModifier(spellbook.spellcasting.dc.modifier.value, spellbook.spellcasting.dc.modifier.override);
		dc.ceil();

		let slots = _getSpellSlots(monsterClasses.filter((x) => x.class.spellcasting ), spellbook.spellcasting.level, spellbook.slots);
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
			visible: inventory.always_show || inventory.items.length > 0 || currencyCoins > 0,
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
		["bonus_actions.items", "actions.items", "reactions.items", "lair_actions.items", "legendary_actions.items", "traits.items", "inventory.items", "spellbook.spells.0", "spellbook.spells.1", "spellbook.spells.2", "spellbook.spells.3", "spellbook.spells.4", "spellbook.spells.5", "spellbook.spells.6", "spellbook.spells.7", "spellbook.spells.8", "spellbook.spells.9", "spellbook.spells.other"].forEach((x) => {
			if (hasProperty(data, x)) {
				getProperty(data, x).forEach((y) => {
					weight.add(y.weight * y.quantity, y.name)
				});
			}
		});
		if ( game.settings.get("dnd5e", "currencyWeight")) {
			let currency = ["cp", "sp", "ep", "gp", "pp"].map((x) => data.inventory.currency[x]).reduce((val, denom) => val += Math.max(denom, 0), 0);
			weight.add(currency / CONFIG.DND5E.encumbrance.currencyPerWeight, "currency");
		}
		weight.applyModifier(data.inventory.encumbrance.weight.modifier.value, data.inventory.encumbrance.weight.modifier.override);
		weight.round(100);

		return weight;
	}

	function _getInventoryCapacity(monsterAbilityModifiers, data) {
		const capacity = new DerivedAttribute();
		capacity.add((monsterAbilityModifiers["str"].value * 2) + 10, game.i18n.format('gmm.common.derived_source.ability_score'));
		capacity.multiply(CONFIG.DND5E.encumbrance.strMultiplier, "config");
		capacity.multiply(GMM_5E_SIZES.find((x) => x.name == data.description.size).inventory_capacity, "size");
		capacity.applyModifier(data.inventory.encumbrance.capacity.modifier.value, data.inventory.encumbrance.capacity.modifier.override);

		return capacity;
	}

	function _getSpellSlots(classes, spellLevel, slotModifiers) {

		// Tabulate the total spell-casting progression
		const progression = {
			total: 0,
			slot: 0,
			pact: 0
		};
		classes.forEach((x) => {
			const levels = x.class.level;
			const prog = x.class.spellcasting;

			// Accumulate levels
			if ( prog !== "pact" ) {
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
		
		// Look up the number of slots per level from the progression table
		const levels = Math.clamped(spellLevel ? spellLevel : progression.slot, 0, 20);
		const pactLevel = Math.clamped(slotModifiers.pact.level ? slotModifiers.pact.level : progression.pact, 0, 20);
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
			maximum: slotModifiers.pact.maximum || (pactLevel > 0) ? Math.max(1, Math.min(pactLevel, 2), Math.min(pactLevel - 8, 3), Math.min(pactLevel - 13, 4)) : 0
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
		createArtifact: createArtifact
	};
})();

export default MonsterForge;
