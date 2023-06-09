import { GMM_5E_ALIGNMENTS } from "../consts/Gmm5eAlignments.js";
import { GMM_5E_CONDITIONS } from "../consts/Gmm5eConditions.js";
import { GMM_5E_DAMAGE_TYPES } from "../consts/Gmm5eDamageTypes.js";
import { GMM_5E_LANGUAGES } from "../consts/Gmm5eLanguages.js";
import { GMM_5E_SIZES } from "../consts/Gmm5eSizes.js";
import { GMM_5E_SKILLS } from "../consts/Gmm5eSkills.js";
import { GMM_5E_UNITS } from "../consts/Gmm5eUnits.js";
import { GMM_MONSTER_BLUEPRINT } from "../consts/GmmMonsterBlueprint.js";
import { GMM_MONSTER_RANKS } from "../consts/GmmMonsterRanks.js";
import { GMM_MONSTER_ROLES } from "../consts/GmmMonsterRoles.js";
import { GMM_5E_XP } from "../consts/Gmm5eXp.js";

const MonsterBlueprint = (function() {

	const mappings = [
		{ from: "biography.text", to: "system.details.biography.value" },
		{ from: "condition_immunities.other", to: "system.traits.ci.custom" },
		{ from: "damage_immunities.other", to: "system.traits.di.custom" },
		{ from: "damage_resistances.other", to: "system.traits.dr.custom" },
		{ from: "damage_vulnerabilities.other", to: "system.traits.dv.custom" },
		{ from: "description.image", to: "img" },
		{ from: "description.name", to: "name" },
		{ from: "description.type.category", to: "system.details.type.value" },
		{ from: "description.type.custom", to: "system.details.type.custom" },
		{ from: "description.type.tags", to: "system.details.type.subtype" },
		{ from: "hit_points.current", to: "system.attributes.hp.value" },
		{ from: "hit_points.temporary", to: "system.attributes.hp.temp" },
		{ from: "initiative.advantage", to: "flags.dnd5e.initiativeAdv" },
		{ from: "inventory.encumbrance.powerful_build", to: "flags.dnd5e.powerfulBuild" },
		{ from: "inventory.currency.cp", to: "system.currency.cp" },
		{ from: "inventory.currency.ep", to: "system.currency.ep" },
		{ from: "inventory.currency.gp", to: "system.currency.gp" },
		{ from: "inventory.currency.pp", to: "system.currency.pp" },
		{ from: "inventory.currency.sp", to: "system.currency.sp" },
		{ from: "lair_actions.always_show", to: "system.resources.lair.value" },
		{ from: "lair_actions.initiative", to: "system.resources.lair.initiative" },
		{ from: "languages.other", to: "system.traits.languages.custom" },
		{ from: "legendary_actions.current", to: "system.resources.legact.value" },
		{ from: "legendary_actions.maximum", to: "system.resources.legact.max" },
		{ from: "legendary_resistances.current", to: "system.resources.legres.value" },
		{ from: "legendary_resistances.maximum", to: "system.resources.legres.max" },
		{ from: "senses.blindsight", to: "system.attributes.senses.blindsight" },
		{ from: "senses.darkvision", to: "system.attributes.senses.darkvision" },
		{ from: "senses.other", to: "system.attributes.senses.special" },
		{ from: "senses.tremorsense", to: "system.attributes.senses.tremorsense" },
		{ from: "senses.truesight", to: "system.attributes.senses.truesight" },
		{ from: "speeds.burrow", to: "system.attributes.movement.burrow" },
		{ from: "speeds.can_hover", to: "system.attributes.movement.hover" },
		{ from: "speeds.climb", to: "system.attributes.movement.climb" },
		{ from: "speeds.fly", to: "system.attributes.movement.fly" },
		{ from: "speeds.swim", to: "system.attributes.movement.swim" },			
		{ from: "speeds.walk", to: "system.attributes.movement.walk" },
		{ from: "spellbook.slots.1.current", to: "spells.spell1.value" },
		{ from: "spellbook.slots.1.maximum", to: "spells.spell1.override" },
		{ from: "spellbook.slots.2.current", to: "spells.spell2.value" },
		{ from: "spellbook.slots.2.maximum", to: "spells.spell2.override" },
		{ from: "spellbook.slots.3.current", to: "spells.spell3.value" },
		{ from: "spellbook.slots.3.maximum", to: "spells.spell3.override" },
		{ from: "spellbook.slots.4.current", to: "spells.spell4.value" },
		{ from: "spellbook.slots.4.maximum", to: "spells.spell4.override" },
		{ from: "spellbook.slots.5.current", to: "spells.spell5.value" },
		{ from: "spellbook.slots.5.maximum", to: "spells.spell5.override" },
		{ from: "spellbook.slots.6.current", to: "spells.spell6.value" },
		{ from: "spellbook.slots.6.maximum", to: "spells.spell6.override" },
		{ from: "spellbook.slots.7.current", to: "spells.spell7.value" },
		{ from: "spellbook.slots.7.maximum", to: "spells.spell7.override" },
		{ from: "spellbook.slots.8.current", to: "spells.spell8.value" },
		{ from: "spellbook.slots.8.maximum", to: "spells.spell8.override" },
		{ from: "spellbook.slots.9.current", to: "spells.spell9.value" },
		{ from: "spellbook.slots.9.maximum", to: "spells.spell9.override" },
		{ from: "spellbook.slots.pact.current", to: "spells.pact.value" },
		{ from: "spellbook.slots.pact.maximum", to: "spells.pact.override" },
		{ from: "spellbook.spellcasting.ability", to: "system.attributes.spellcasting" },
		{ from: "spellbook.spellcasting.level", to: "system.details.spellLevel" }
	];

	function createFromActor(actor) {
		const blueprint = $.extend(true, {}, GMM_MONSTER_BLUEPRINT, actor.flags.gmm ? _verifyBlueprint(actor.flags.gmm.blueprint) : _getInitialData(actor));
		return _syncActorDataToBlueprint(blueprint, actor);
	}

	function _getInitialData(actor) {
		let actorData = actor.system;
		let resources = actorData.resources;
		let combatType = (resources.lair.value) ? "paragon" : (resources.legact.max || resources.legres.max) ? "elite": "grunt";
		let combatRank = GMM_MONSTER_RANKS[combatType];
		let abilityRankings = Object.entries(actorData.abilities).sort((x, y) => y[1].value - x[1].value).map((x) => x[0]);
		let combatLevel = GMM_5E_XP.filter((x) => x.xp <= actorData.details.xp?.value??0 / combatRank.xp).pop().level;
		let combatRole = "striker";
		switch (abilityRankings[0]) {
			case "dex":
				combatRole = "scout";
				break;
			case "con":
				combatRole = "defender";
				break;
			case "int":
				combatRole = "controller";
				break;
			case "wis":
				combatRole = "sniper";
				break;
			case "cha":
				combatRole = "supporter";
				break;
		}

		return {
			data: {
				ability_modifiers: {
					ranking: abilityRankings,
				},
				saving_throws: {
					ranking: abilityRankings,
				},
				combat: {
					level: combatLevel,
					rank: {
						type: combatType,
						modifiers: combatRank
					},
					role: {
						type: combatRole,
						modifiers: GMM_MONSTER_ROLES[combatRole]
					}
				}
			}
		}
	}

	function _verifyBlueprint(blueprint) {
		switch (blueprint.vid) {
			case 1:
				// Blueprint is up-to-date and requires no changes.
				return blueprint;
				break;
			default:
				console.error(`This monster blueprint has an invalid version id [${blueprint.vid}] and can't be verified.`, blueprint);
				return null;
				break;
		}
	}

	function _syncActorDataToBlueprint(blueprint, actor) {
		const blueprintData = blueprint.data;
		const actorData = actor;

		try {
			mappings.forEach((x) => {
				if (hasProperty(actor, x.to)) {
					setProperty(blueprintData, x.from, getProperty(actor, x.to));
				}
			});

			blueprintData.actions.items = [];
			blueprintData.bonus_actions.items = [];
			blueprintData.description.alignment = _getActorAlignment(actor.system.details.alignment);
			blueprintData.description.size = GMM_5E_SIZES.find((x) => x.foundry == actor.system.traits.size)?.name;
			blueprintData.description.type.swarm = GMM_5E_SIZES.find((x) => x.foundry == actor.system.details.type.swarm)?.name;
			blueprintData.initiative.advantage = actor.flags.dnd5e && actor.flags.dnd5e.initiativeAdv;
			blueprintData.inventory.encumbrance.powerful_build = actor.flags.dnd5e && actor.flags.dnd5e.powerfulBuild;
			blueprintData.inventory.items = [];
			blueprintData.lair_actions.items = [];
			blueprintData.legendary_actions.items = [];
			blueprintData.reactions.items = [];
			blueprintData.senses.units = GMM_5E_UNITS.find((x) => x.foundry == actor.system.attributes.senses.units)?.name;
			blueprintData.speeds.units = GMM_5E_UNITS.find((x) => x.foundry == actor.system.attributes.movement.units)?.name;
			blueprintData.spellbook.spellcasting.ability = (actor.system.attributes.spellcasting == "") ? "int" : actor.system.attributes.spellcasting;
			blueprintData.spellbook.spells.other = [];
			blueprintData.spellbook.spells[0] = [];
			blueprintData.spellbook.spells[1] = [];
			blueprintData.spellbook.spells[2] = [];
			blueprintData.spellbook.spells[3] = [];
			blueprintData.spellbook.spells[4] = [];
			blueprintData.spellbook.spells[5] = [];
			blueprintData.spellbook.spells[6] = [];
			blueprintData.spellbook.spells[7] = [];
			blueprintData.spellbook.spells[8] = [];
			blueprintData.spellbook.spells[9] = [];
			blueprintData.traits.items = [];
			
			GMM_5E_SKILLS.forEach((x) => {
				let actorSkill = actorData.system.skills[x.foundry];
				switch (actorSkill.value) {
					case 0.5:
						blueprintData.skills[x.name] = "half-proficient";
						break;
					case 1:
						blueprintData.skills[x.name] = "proficient";
						break;
					case 2:
						blueprintData.skills[x.name] = "expert";
						break;
					default:
						blueprintData.skills[x.name] = "";
						break;
				}
			});

			actor.system.traits.di.value.forEach((x) => blueprintData.damage_immunities[x] = true);
			actor.system.traits.dr.value.forEach((x) => blueprintData.damage_resistances[x] = true);
			actor.system.traits.dv.value.forEach((x) => blueprintData.damage_vulnerabilities[x] = true);
			actor.system.traits.ci.value.forEach((x) => blueprintData.condition_immunities[x] = true);
			actor.system.traits.languages.value.forEach((x) => blueprintData.languages[x] = true);

			if (actor.items) {
				try {
					actor.items.contents.sort((a, b) => (a.system.sort || 0) - (b.system.sort || 0)).forEach(x => {
						let item = actor.items.get(x.id)
						switch (item.getSortingCategory()) {
							case "spell":
								let spell_level = x.system.level || 0;
								blueprintData.spellbook.spells[`${spell_level < 10 ? spell_level : "other"}`].push(_getItemDetails(item));
								break;
							case "bonus":
								blueprintData.bonus_actions.items.push(_getItemDetails(item));
								break;
							case "reaction":
								blueprintData.reactions.items.push(_getItemDetails(item));
								break;
							case "lair":
								blueprintData.lair_actions.items.push(_getItemDetails(item));
								break;
							case "legendary":
								blueprintData.legendary_actions.items.push(_getItemDetails(item));
								break;
							case "trait":
								blueprintData.traits.items.push(_getItemDetails(item));
								break;
							case "loot":
								blueprintData.inventory.items.push(_getItemDetails(item));
								break;
							default:
								blueprintData.actions.items.push(_getItemDetails(item));
								break;
						}
					});
				} catch (e) {
					console.warn(e);
				}
			}

			return blueprint;
		} catch (error) {
			console.error("Failed to load blueprint data from the current actor", error);
			return blueprint;
		}
	}

	function getActorDataFromBlueprint(blueprint) {
		const actorData = {};

		mappings.forEach((x) => {
			if (hasProperty(blueprint.data, x.from)) {
				setProperty(actorData, x.to, getProperty(blueprint.data, x.from));
			}
		});

		if (hasProperty(blueprint.data, "description.alignment.category")) {
			const alignment = blueprint.data.description.alignment.category;
			if (alignment) {
				setProperty(actorData, "system.details.alignment", game.i18n.format(`gmm.common.alignment.${alignment}`));
			} else {
				const custom = getProperty(blueprint.data, "description.alignment.custom");
				setProperty(actorData, "system.details.alignment", custom);
			}
		}

		if (hasProperty(blueprint.data, "speeds.units")) {
			const unit = GMM_5E_UNITS.find((x) => x.name == blueprint.data.speeds.units);
			setProperty(actorData, "system.attributes.movement.units", unit ? unit.foundry : null);
		}

		if (hasProperty(blueprint.data, "senses.units")) {
			const unit = GMM_5E_UNITS.find((x) => x.name == blueprint.data.senses.units);
			setProperty(actorData, "system.attributes.senses.units", unit ? unit.foundry : null);
		}

		if (hasProperty(blueprint.data, "description.size")) {
			const size = GMM_5E_SIZES.find((x) => x.name == blueprint.data.description.size);
			setProperty(actorData, "system.traits.size", size ? size.foundry : null);
		}

		if (hasProperty(blueprint.data, "description.type.swarm")) {
			const size = GMM_5E_SIZES.find((x) => x.name == blueprint.data.description.type.swarm);
			setProperty(actorData, "system.details.type.swarm", size ? size.foundry : null);
		}

		GMM_5E_SKILLS.forEach((x) => {
			if (hasProperty(blueprint.data, `skills.${x.name}`)) {
				switch (blueprint.data.skills[x.name]) {
					case "half-proficient":
						setProperty(actorData, `system.skills.${x.foundry}.value`, 0.5);
						break;
					case "proficient":
						setProperty(actorData, `system.skills.${x.foundry}.value`, 1);
						break;
					case "expert":
						setProperty(actorData, `system.skills.${x.foundry}.value`, 2);
						break;
					default:
						setProperty(actorData, `system.skills.${x.foundry}.value`, 0);
						break;
				}
			}
		});

		_convertTraits(blueprint, actorData, GMM_5E_DAMAGE_TYPES, "damage_resistances", "dr");
		_convertTraits(blueprint, actorData, GMM_5E_DAMAGE_TYPES, "damage_vulnerabilities", "dv");
		_convertTraits(blueprint, actorData, GMM_5E_DAMAGE_TYPES, "damage_immunities", "di");
		_convertTraits(blueprint, actorData, GMM_5E_CONDITIONS, "condition_immunities", "ci");
		_convertTraits(blueprint, actorData, GMM_5E_LANGUAGES, "languages", "languages");

		return actorData;
	}

	function _convertTraits(blueprint, actorData, values, blueprintField, foundryField) {
		if (hasProperty(blueprint.data, `${blueprintField}.other`)) {
			let traits = [];
			values.forEach((x) => {
				if (blueprint.data[blueprintField][x]) {
					traits.push(x);
				}
			});
			setProperty(actorData, `system.traits.${foundryField}.value`, traits);
		}
	}

	function _getActorAlignment(alignment) {
		if (alignment?.trim().length == 0) {
			return {
				category: "",
				custom: null
			}
		} else {
			let actorAlignment = alignment?.replace(/ /g, '_').trim().toLowerCase();
			if (GMM_5E_ALIGNMENTS.includes(actorAlignment)) {
				return {
					category: actorAlignment,
					custom: null
				}
			} else {
				return {
					category: "",
					custom: alignment.trim()
				}
			}
		}
	}

	function _getItemDetails(item) {
		let details = {
			id: item.id,
			name: item.name,
			img: item.img,
			weight: item.system.weight ? item.system.weight : 0,
			quantity: item.system.quantity ? item.system.quantity : 0,
			price: item.system.price ? item.system.price : 0,
			requirements: {
				level: {
					min: item.flags.gmm?.blueprint?.data?.requirements?.level?.min,
					max: item.flags.gmm?.blueprint?.data?.requirements?.level?.max
				},
				rank: item.flags.gmm?.blueprint?.data?.requirements?.rank,
				role: item.flags.gmm?.blueprint?.data?.requirements?.role
			}
		};
		return details;
	}

	return {
		createFromActor: createFromActor,
		getActorDataFromBlueprint: getActorDataFromBlueprint
	};
})();

export default MonsterBlueprint;