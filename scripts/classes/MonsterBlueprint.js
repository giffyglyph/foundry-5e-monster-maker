import { DEFAULT_CONDITIONS } from "../consts/DefaultConditions.js";
import { DEFAULT_DAMAGE_TYPES } from "../consts/DefaultDamageTypes.js";
import { DEFAULT_LANGUAGES } from "../consts/DefaultLanguages.js";
import { DEFAULT_SKILLS } from "../consts/DefaultSkills.js";
import { DEFAULT_SIZES } from "../consts/DefaultSizes.js";
import { DEFAULT_UNITS } from "../consts/DefaultUnits.js";
import { DEFAULT_ROLES } from "../consts/DefaultRoles.js";
import { DEFAULT_RANKS } from "../consts/DefaultRanks.js";
import { DEFAULT_CATEGORIES } from "../consts/DefaultCategories.js";
import { DEFAULT_ALIGNMENTS } from "../consts/DefaultAlignments.js";

const MonsterBlueprint = (function() {

	function prepareBlueprint(type, ...data) {
		let blueprint = $.extend(true, {}, _getDefaultBlueprint(), ...data);
		blueprint.type = type;
		return blueprint;
	}

	function getBlueprintFromActor(actor) {
		try {
			let blueprint = {
				data: {
					description: {
						name: actor.name,
						image: actor.img,
						size: DEFAULT_SIZES.find((x) => x.foundry == actor.data.traits.size).name,
						type: _getActorType(actor.data.details.type),
						alignment: _getActorAlignment(actor.data.details.alignment)
					},
					hit_points: {
						current: actor.data.attributes.hp.value,
						temporary: actor.data.attributes.hp.temp
					},
					speeds: {
						walk: actor.data.attributes.movement.walk,
						burrow: actor.data.attributes.movement.burrow,
						climb: actor.data.attributes.movement.climb,
						fly: actor.data.attributes.movement.fly,
						swim: actor.data.attributes.movement.swim,
						units: DEFAULT_UNITS.find((x) => x.foundry == actor.data.attributes.movement.units).name,
						can_hover: actor.data.attributes.movement.hover
					},
					senses: {
						blindsight: actor.data.attributes.senses.blindsight,
						darkvision: actor.data.attributes.senses.darkvision,
						tremorsense: actor.data.attributes.senses.tremorsense,
						truesight: actor.data.attributes.senses.truesight,
						units: DEFAULT_UNITS.find((x) => x.foundry == actor.data.attributes.senses.units).name,
						other: actor.data.attributes.senses.special
					},
					skills: {},
					damage_resistances: {
						other: actor.data.traits.dr.custom
					},
					damage_vulnerabilities: {
						other: actor.data.traits.dv.custom
					},
					damage_immunities: {
						other: actor.data.traits.di.custom
					},
					condition_immunities: {
						other: actor.data.traits.ci.custom
					},
					languages: {
						other: actor.data.traits.languages.custom
					},
					initiative: {
						advantage: actor.flags.dnd5e && actor.flags.dnd5e.initiativeAdv
					},
					biography: actor.data.details.biography.value,
					legendary_resistances: {
						current: actor.data.resources.legres.value,
						maximum: actor.data.resources.legres.max
					},
					legendary_actions: {
						current: actor.data.resources.legact.value,
						maximum: actor.data.resources.legact.max
					},
					lair_actions: {
						enabled: actor.data.resources.lair.value,
						initiative: actor.data.resources.lair.initiative
					},
					legacy_spells: {
						spellcasting_level: actor.data.details.spellLevel,
						spellcasting_ability: actor.data.attributes.spellcasting
					}
				}
			};

			DEFAULT_SKILLS.forEach((x) => {
				let actorSkill = actor.data.skills[x.foundry];
				switch (actorSkill.value) {
					case 0.5:
						blueprint.data.skills[x.name] = "half-proficient";
						break;
					case 1:
						blueprint.data.skills[x.name] = "proficient";
						break;
					case 2:
						blueprint.data.skills[x.name] = "expert";
						break;
					default:
						blueprint.data.skills[x.name] = "";
						break;
				}
			});

			actor.data.traits.di.value.forEach((x) => blueprint.data.damage_immunities[x] = true);
			actor.data.traits.dr.value.forEach((x) => blueprint.data.damage_resistances[x] = true);
			actor.data.traits.dv.value.forEach((x) => blueprint.data.damage_vulnerabilities[x] = true);
			actor.data.traits.ci.value.forEach((x) => blueprint.data.condition_immunities[x] = true);
			actor.data.traits.languages.value.forEach((x) => blueprint.data.languages[x] = true);

			return blueprint;
		} catch (error) {
			console.error("Couldn't get blueprint data from the actor", error);
			return {};
		}
	}

	function getActorFromBlueprint(form) {
		let output = {};

		const mappings = [
			{ from: "data.gg5e_mm.blueprint.data.description.name", to: "name" },
			{ from: "data.gg5e_mm.blueprint.data.description.image", to: "img" },
			{ from: "data.gg5e_mm.blueprint.data.description.image", to: "token.img" },
			{ from: "data.gg5e_mm.blueprint.data.hit_points.temporary", to: "data.attributes.hp.temp" },
			{ from: "data.gg5e_mm.blueprint.data.hit_points.current", to: "data.attributes.hp.value" },
			{ from: "data.gg5e_mm.blueprint.data.speeds.walk", to: "data.attributes.movement.walk" },
			{ from: "data.gg5e_mm.blueprint.data.speeds.burrow", to: "data.attributes.movement.burrow" },
			{ from: "data.gg5e_mm.blueprint.data.speeds.climb", to: "data.attributes.movement.climb" },
			{ from: "data.gg5e_mm.blueprint.data.speeds.fly", to: "data.attributes.movement.fly" },
			{ from: "data.gg5e_mm.blueprint.data.speeds.swim", to: "data.attributes.movement.swim" },			
			{ from: "data.gg5e_mm.blueprint.data.speeds.can_hover", to: "data.attributes.movement.hover" },
			{ from: "data.gg5e_mm.blueprint.data.senses.blindsight", to: "data.attributes.senses.blindsight" },
			{ from: "data.gg5e_mm.blueprint.data.senses.darkvision", to: "data.attributes.senses.darkvision" },
			{ from: "data.gg5e_mm.blueprint.data.senses.tremorsense", to: "data.attributes.senses.tremorsense" },
			{ from: "data.gg5e_mm.blueprint.data.senses.truesight", to: "data.attributes.senses.truesight" },
			{ from: "data.gg5e_mm.blueprint.data.senses.other", to: "data.attributes.senses.special" },
			{ from: "data.gg5e_mm.blueprint.data.damage_resistances.other", to: "data.traits.dr.custom" },
			{ from: "data.gg5e_mm.blueprint.data.damage_vulnerabilities.other", to: "data.traits.dv.custom" },
			{ from: "data.gg5e_mm.blueprint.data.damage_immunities.other", to: "data.traits.di.custom" },
			{ from: "data.gg5e_mm.blueprint.data.condition_immunities.other", to: "data.traits.ci.custom" },
			{ from: "data.gg5e_mm.blueprint.data.languages.other", to: "data.traits.languages.custom" },
			{ from: "data.gg5e_mm.blueprint.data.initiative.advantage", to: "flags.dnd5e.initiativeAdv" },
			{ from: "data.gg5e_mm.blueprint.data.biography", to: "data.details.biography.value" },
			{ from: "data.gg5e_mm.blueprint.data.legendary_resistances.current", to: "data.resources.legres.value" },
			{ from: "data.gg5e_mm.blueprint.data.legendary_resistances.maximum", to: "data.resources.legres.max" },
			{ from: "data.gg5e_mm.blueprint.data.legendary_actions.current", to: "data.resources.legact.value" },
			{ from: "data.gg5e_mm.blueprint.data.legendary_actions.maximum", to: "data.resources.legact.max" },
			{ from: "data.gg5e_mm.blueprint.data.lair_actions.enabled", to: "data.resources.lair.value" },
			{ from: "data.gg5e_mm.blueprint.data.lair_actions.initiative", to: "data.resources.lair.initiative" },
			{ from: "data.gg5e_mm.blueprint.data.legacy_spells.spellcasting_level", to: "data.details.spellLevel" },
			{ from: "data.gg5e_mm.blueprint.data.legacy_spells.spellcasting_ability", to: "data.attributes.spellcasting" },
		];
		mappings.forEach((x) => {
			if (typeof form[x.from] !== 'undefined') {
				output[x.to] = form[x.from];
			}
		});

		if (typeof form["data.gg5e_mm.blueprint.data.description.type.category"] !== 'undefined') {
			if (form["data.gg5e_mm.blueprint.data.description.type.category"] == "custom") {
				output["data.details.type"] = form["data.gg5e_mm.blueprint.data.description.type.custom"];
			} else {
				output["data.details.type"] = game.i18n.format(`gg5e_mm.monster.common.type.${form["data.gg5e_mm.blueprint.data.description.type.category"]}`);
			}
		}

		if (typeof form["data.gg5e_mm.blueprint.data.description.alignment.category"] !== 'undefined') {
			if (form["data.gg5e_mm.blueprint.data.description.alignment.category"] == "custom") {
				output["data.details.alignment"] = form["data.gg5e_mm.blueprint.data.description.alignment.custom"];
			} else {
				output["data.details.alignment"] = game.i18n.format(`gg5e_mm.monster.common.alignment.${form["data.gg5e_mm.blueprint.data.description.alignment.category"]}`);
			}
		}

		if (typeof form["data.gg5e_mm.blueprint.data.speeds.units"] !== 'undefined') {
			output["data.attributes.movement.units"] = DEFAULT_UNITS.find((x) => x.name == form["data.gg5e_mm.blueprint.data.speeds.units"]).foundry;
		}

		if (typeof form["data.gg5e_mm.blueprint.data.senses.units"] !== 'undefined') {
			output["data.attributes.senses.units"] = DEFAULT_UNITS.find((x) => x.name == form["data.gg5e_mm.blueprint.data.senses.units"]).foundry;
		}

		if (typeof form["data.gg5e_mm.blueprint.data.description.size"] !== 'undefined') {
			output["data.traits.size"] = DEFAULT_SIZES.find((x) => x.name == form["data.gg5e_mm.blueprint.data.description.size"]).foundry;
		}

		DEFAULT_SKILLS.forEach((x) => {
			if (typeof form[`data.gg5e_mm.blueprint.data.skills.${x.name}`] !== 'undefined') {
				switch (form[`data.gg5e_mm.blueprint.data.skills.${x.name}`]) {
					case "half-proficient":
						output[`data.skills.${x.foundry}.value`] = 0.5;
						break;
					case "proficient":
						output[`data.skills.${x.foundry}.value`] = 1;
						break;
					case "expert":
						output[`data.skills.${x.foundry}.value`] = 2;
						break;
					default:
						output[`data.skills.${x.foundry}.value`] = 0;
						break;
				}
			}
		});

		_convertTraits(form, output, DEFAULT_DAMAGE_TYPES, "damage_resistances", "dr");
		_convertTraits(form, output, DEFAULT_DAMAGE_TYPES, "damage_vulnerabilities", "dv");
		_convertTraits(form, output, DEFAULT_DAMAGE_TYPES, "damage_immunities", "di");
		_convertTraits(form, output, DEFAULT_CONDITIONS, "condition_immunities", "ci");
		_convertTraits(form, output, DEFAULT_LANGUAGES, "languages", "languages");

		return output;
	}

	function _getActorType(type) {
		let actorType = type.replace(/ /g, '_').toLowerCase();
		if (DEFAULT_CATEGORIES.includes(actorType)) {
			return {
				category: actorType,
				custom: null
			}
		} else {
			return {
				category: "custom",
				custom: type
			}
		}
	}

	function _getActorAlignment(alignment) {
		let actorAlignment = alignment.replace(/ /g, '_').toLowerCase();
		if (DEFAULT_ALIGNMENTS.includes(actorAlignment)) {
			return {
				category: actorAlignment,
				custom: null
			}
		} else {
			return {
				category: "custom",
				custom: alignment
			}
		}
	}

	function _getDefaultBlueprint() {
		return {
			vid: 1,
			type: "monster",
			data: {
				description: {
					size: "medium",
					type: {
						category: "humanoid",
						custom: null
					},
					tags: null,
					alignment: {
						category: "unaligned",
						custom: null
					}
				},
				combat: {
					level: 10,
					rank: {
						type: "standard",
						custom_name: null,
						modifiers: DEFAULT_RANKS["standard"]
					},
					role: {
						type: "striker",
						custom_name: null,
						modifiers: DEFAULT_ROLES["striker"]
					}
				},
				initiative: {
					ability: "dex",
					advantage: false,
					modifier: null,
					override: false
				},
				hit_points: {
					current: null,
					temporary: null,
					maximum: {
						modifier: null,
						override: false
					}
				},
				armor_class: {
					modifier: null,
					override: false,
					type: null
				},
				passive_perception: {
					modifier: null,
					override: false
				},
				attack_bonus: {
					modifier: null,
					override: false,
					type: null
				},
				attack_dcs: {
					primary: {
						modifier: null,
						override: false,
						type: null
					},
					secondary: {
						modifier: null,
						override: false,
						type: null
					}
				},
				damage_per_action: {
					modifier: null,
					override: false,
					die_size: 4,
					maximum_dice: 0,
					type: null
				},
				ability_modifiers: {
					ranking: ["str", "dex", "con", "int", "wis", "cha"],
					modifiers: null,
					override: false,
				},
				saving_throws: {
					method: "sync",
					ranking: ["str", "dex", "con", "int", "wis", "cha"],
					modifiers: null,
					override: false
				},
				proficiency_bonus: {
					modifier: null,
					override: false
				},
				speeds: {
					walk: null,
					burrow: null,
					climb: null,
					fly: null,
					swim: null,
					units: "feet",
					can_hover: false
				},
				senses: {
					blindsight: null,
					darkvision: null,
					tremorsense: null,
					truesight: null,
					units: null,
					other: null
				},
				languages: {
					aarakocra: false,
					abyssal: false,
					aquan: false,
					auran: false,
					celestial: false,
					common: false,
					deep_speech: false,
					draconic: false,
					druidic: false,
					dwarvish: false,
					elvish: false,
					giant: false,
					gith: false,
					gnoll: false,
					gnomish: false,
					goblin: false,
					halfling: false,
					ignan: false,
					infernal: false,
					orc: false,
					primordial: false,
					sylvan: false,
					terran: false,
					thieves_cant: false,
					undercommon: false,
					other: null
				},
				damage_resistances: {
					acid: false,
					bludgeoning: false,
					cold: false,
					fire: false,
					force: false,
					lightning: false,
					necrotic: false,
					physical: false,
					piercing: false,
					poison: false,
					psychic: false,
					radiant: false,
					slashing: false,
					thunder: false,
					other: null
				},
				damage_vulnerabilities: {
					acid: false,
					bludgeoning: false,
					cold: false,
					fire: false,
					force: false,
					lightning: false,
					necrotic: false,
					physical: false,
					piercing: false,
					poison: false,
					psychic: false,
					radiant: false,
					slashing: false,
					thunder: false,
					other: null
				},
				damage_immunities: {
					acid: false,
					bludgeoning: false,
					cold: false,
					fire: false,
					force: false,
					lightning: false,
					necrotic: false,
					non_magical_physical: false,
					piercing: false,
					poison: false,
					psychic: false,
					radiant: false,
					slashing: false,
					thunder: false,
					other: null
				},
				condition_immunities: {
					blinded: false,
					charmed: false,
					deafened: false,
					diseased: false,
					exhaustion: false,
					frightened: false,
					grappled: false,
					incapacitated: false,
					invisible: false,
					paralyzed: false,
					petrified: false,
					poisoned: false,
					prone: false,
					restrained: false,
					stunned: false,
					unconcious: false,
					other: null
				},
				skills: {
					acrobatics: null,
					animal_handling: null,
					arcana: null,
					athletics: null,
					deception: null,
					history: null,
					insight: null,
					intimidation: null,
					investigation: null,
					medicine: null,
					nature: null,
					perception: null,
					performance: null,
					persuasion: null,
					religion: null,
					sleight_of_hand: null,
					stealth: null,
					survival: null
				},
				challenge_rating: {
					modifier: null,
					override: false
				},
				xp: {
					modifier: null,
					override: false
				},
				biography: "",
				paragon_actions: {
					current: 0,
					maximum: {
						modifier: null,
						override: false
					}
				},
				legendary_resistances: {
					current: 0,
					maximum: null
				},
				lair_actions: {
					enabled: false,
					initiative: 0
				},
				display: {
					skin: "vanity",
					color: {
						primary: "blue",
						secondary: "deep-orange"
					}
				},
				legacy_spells: {
					spellcasting_level: 0,
					spellcasting_ability: "int"
				}
			}
		}
	}

	function _convertTraits(form, output, values, blueprintField, foundryField) {
		if (typeof form[`data.gg5e_mm.blueprint.data.${blueprintField}.other`] !== 'undefined') {
			let traits = [];
			values.forEach((x) => {
				if (form[`data.gg5e_mm.blueprint.data.${blueprintField}.${x}`]) {
					traits.push(x);
				}
			});
			output[`data.traits.${foundryField}.value`] = traits;
		}
	}

	return {
		prepareBlueprint: prepareBlueprint,
		getBlueprintFromActor: getBlueprintFromActor,
		getActorFromBlueprint: getActorFromBlueprint
	};
})();

export default MonsterBlueprint;