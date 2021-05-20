import { GMM_5E_ALIGNMENTS } from "../consts/Gmm5eAlignments.js";
import { GMM_5E_CATEGORIES } from "../consts/Gmm5eCategories.js";
import { GMM_5E_CONDITIONS } from "../consts/Gmm5eConditions.js";
import { GMM_5E_DAMAGE_TYPES } from "../consts/Gmm5eDamageTypes.js";
import { GMM_5E_LANGUAGES } from "../consts/Gmm5eLanguages.js";
import { GMM_5E_SIZES } from "../consts/Gmm5eSizes.js";
import { GMM_5E_SKILLS } from "../consts/Gmm5eSkills.js";
import { GMM_5E_UNITS } from "../consts/Gmm5eUnits.js";
import { GMM_MONSTER_BLUEPRINT } from "../consts/GmmMonsterBlueprint.js";

const MonsterBlueprint = (function() {

	function createFromActor(actor) {
		const blueprint = $.extend(true, {}, GMM_MONSTER_BLUEPRINT, actor.data.data.gmm ? _verifyBlueprint(actor.data.data.gmm.blueprint) : null);
		return _syncActorDataToBlueprint(blueprint, actor);
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
		const actorData = actor.data.data;

		try {
			blueprintData.actions.items = [];
			blueprintData.biography = actorData.details.biography.value;
			blueprintData.bonus_actions.items = [];
			blueprintData.condition_immunities.other = actorData.traits.ci.custom;
			blueprintData.damage_immunities.other = actorData.traits.di.custom;
			blueprintData.damage_resistances.other = actorData.traits.dr.custom;
			blueprintData.damage_vulnerabilities.other = actorData.traits.dv.custom;
			blueprintData.description.alignment = _getActorAlignment(actorData.details.alignment);
			blueprintData.description.image = actor.img;
			blueprintData.description.name = actor.name;
			blueprintData.description.size = GMM_5E_SIZES.find((x) => x.foundry == actorData.traits.size).name;
			blueprintData.description.type = _getActorType(actorData.details.type);
			blueprintData.hit_points.current = actorData.attributes.hp.value;
			blueprintData.hit_points.temporary = actorData.attributes.hp.temp;
			blueprintData.initiative.advantage = actor.data.flags.dnd5e && actor.data.flags.dnd5e.initiativeAdv;
			blueprintData.inventory.currency.cp = actorData.currency.cp;
			blueprintData.inventory.currency.ep = actorData.currency.ep;
			blueprintData.inventory.currency.gp = actorData.currency.gp;
			blueprintData.inventory.currency.pp = actorData.currency.pp;
			blueprintData.inventory.currency.sp = actorData.currency.sp;
			blueprintData.inventory.encumbrance.powerful_build = actor.data.flags.dnd5e && actor.data.flags.dnd5e.powerfulBuild;
			blueprintData.inventory.items = [];
			blueprintData.lair_actions.items = [];
			blueprintData.lair_actions.always_show = actorData.resources.lair.value;
			blueprintData.lair_actions.initiative = actorData.resources.lair.initiative;
			blueprintData.languages.other = actorData.traits.languages.custom;
			blueprintData.legendary_actions.items = [];
			blueprintData.legendary_actions.current = actorData.resources.legact.value;
			blueprintData.legendary_actions.maximum = actorData.resources.legact.max;
			blueprintData.legendary_resistances.current = actorData.resources.legres.value;
			blueprintData.legendary_resistances.maximum = actorData.resources.legres.max;
			blueprintData.reactions.items = [];
			blueprintData.senses.blindsight = actorData.attributes.senses.blindsight;
			blueprintData.senses.darkvision = actorData.attributes.senses.darkvision;
			blueprintData.senses.other = actorData.attributes.senses.special;
			blueprintData.senses.tremorsense = actorData.attributes.senses.tremorsense;
			blueprintData.senses.truesight = actorData.attributes.senses.truesight;
			blueprintData.senses.units = GMM_5E_UNITS.find((x) => x.foundry == actorData.attributes.senses.units).name;
			blueprintData.speeds.burrow = actorData.attributes.movement.burrow;
			blueprintData.speeds.can_hover = actorData.attributes.movement.hover;
			blueprintData.speeds.climb = actorData.attributes.movement.climb;
			blueprintData.speeds.fly = actorData.attributes.movement.fly;
			blueprintData.speeds.swim = actorData.attributes.movement.swim;
			blueprintData.speeds.units = GMM_5E_UNITS.find((x) => x.foundry == actorData.attributes.movement.units).name;
			blueprintData.speeds.walk = actorData.attributes.movement.walk;
			blueprintData.spellbook.slots[1].current = actorData.spells.spell1.value;
			blueprintData.spellbook.slots[1].maximum = actorData.spells.spell1.override;
			blueprintData.spellbook.slots[2].current = actorData.spells.spell2.value;
			blueprintData.spellbook.slots[2].maximum = actorData.spells.spell2.override;
			blueprintData.spellbook.slots[3].current = actorData.spells.spell3.value;
			blueprintData.spellbook.slots[3].maximum = actorData.spells.spell3.override;
			blueprintData.spellbook.slots[4].current = actorData.spells.spell4.value;
			blueprintData.spellbook.slots[4].maximum = actorData.spells.spell4.override;
			blueprintData.spellbook.slots[5].current = actorData.spells.spell5.value;
			blueprintData.spellbook.slots[5].maximum = actorData.spells.spell5.override;
			blueprintData.spellbook.slots[6].current = actorData.spells.spell6.value;
			blueprintData.spellbook.slots[6].maximum = actorData.spells.spell6.override;
			blueprintData.spellbook.slots[7].current = actorData.spells.spell7.value;
			blueprintData.spellbook.slots[7].maximum = actorData.spells.spell7.override;
			blueprintData.spellbook.slots[8].current = actorData.spells.spell8.value;
			blueprintData.spellbook.slots[8].maximum = actorData.spells.spell8.override;
			blueprintData.spellbook.slots[9].current = actorData.spells.spell9.value;
			blueprintData.spellbook.slots[9].maximum = actorData.spells.spell9.override;
			blueprintData.spellbook.slots.pact.current = actorData.spells.pact.value;
			blueprintData.spellbook.slots.pact.maximum = actorData.spells.pact.override;
			blueprintData.spellbook.spellcasting.ability = (actorData.attributes.spellcasting == "") ? "int" : actorData.attributes.spellcasting;
			blueprintData.spellbook.spellcasting.level = actorData.details.spellLevel;
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
				let actorSkill = actorData.skills[x.foundry];
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

			actorData.traits.di.value.forEach((x) => blueprintData.damage_immunities[x] = true);
			actorData.traits.dr.value.forEach((x) => blueprintData.damage_resistances[x] = true);
			actorData.traits.dv.value.forEach((x) => blueprintData.damage_vulnerabilities[x] = true);
			actorData.traits.ci.value.forEach((x) => blueprintData.condition_immunities[x] = true);
			actorData.traits.languages.value.forEach((x) => blueprintData.languages[x] = true);

			actor.data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0)).forEach(x => {
                switch (x.type) {
                    case "spell":
                        let spell_level = x.data.level || 0;
						blueprintData.spellbook.spells[`${spell_level < 10 ? spell_level : "other"}`].push(_getItemDetails(x));
						break;
					case "weapon":
                    case "feat":
                        if (x.data.activation.type) {
							switch(x.data.activation.type) {
								case "bonus":
									blueprintData.bonus_actions.items.push(_getItemDetails(x));
									break;
								case "reaction":
									blueprintData.reactions.items.push(_getItemDetails(x));
									break;
								case "lair":
									blueprintData.lair_actions.items.push(_getItemDetails(x));
									break;
								case "legendary":
									blueprintData.legendary_actions.items.push(_getItemDetails(x));
									break;
								default:
									blueprintData.actions.items.push(_getItemDetails(x));
									break;
							}
                        } else if (x.type == "weapon") {
							blueprintData.inventory.items.push(_getItemDetails(x));
						} else {
							blueprintData.traits.items.push(_getItemDetails(x));
                        }
                        break;
					case "class":
						blueprintData.traits.items.push(_getItemDetails(x));
						break;
                    default:
						blueprintData.inventory.items.push(_getItemDetails(x));
                        break;
                }
            });

			return blueprint;
		} catch (error) {
			console.error("Failed to load blueprint data from the current actor", error);
			return blueprint;
		}
	}

	function getActorDataFromBlueprint(blueprint) {
		const actorData = {};

		const mappings = [
			{ from: "biography", to: "data.details.biography.value" },
			{ from: "condition_immunities.other", to: "data.traits.ci.custom" },
			{ from: "damage_immunities.other", to: "data.traits.di.custom" },
			{ from: "damage_resistances.other", to: "data.traits.dr.custom" },
			{ from: "damage_vulnerabilities.other", to: "data.traits.dv.custom" },
			{ from: "description.image", to: "img" },
			{ from: "description.name", to: "name" },
			{ from: "hit_points.current", to: "data.attributes.hp.value" },
			{ from: "hit_points.temporary", to: "data.attributes.hp.temp" },
			{ from: "initiative.advantage", to: "flags.dnd5e.initiativeAdv" },
			{ from: "inventory.encumbrance.powerful_build", to: "flags.dnd5e.powerfulBuild" },
			{ from: "inventory.currency.cp", to: "data.currency.cp" },
			{ from: "inventory.currency.ep", to: "data.currency.ep" },
			{ from: "inventory.currency.gp", to: "data.currency.gp" },
			{ from: "inventory.currency.pp", to: "data.currency.pp" },
			{ from: "inventory.currency.sp", to: "data.currency.sp" },
			{ from: "lair_actions.always_show", to: "data.resources.lair.value" },
			{ from: "lair_actions.initiative", to: "data.resources.lair.initiative" },
			{ from: "languages.other", to: "data.traits.languages.custom" },
			{ from: "legendary_actions.current", to: "data.resources.legact.value" },
			{ from: "legendary_actions.maximum", to: "data.resources.legact.max" },
			{ from: "legendary_resistances.current", to: "data.resources.legres.value" },
			{ from: "legendary_resistances.maximum", to: "data.resources.legres.max" },
			{ from: "senses.blindsight", to: "data.attributes.senses.blindsight" },
			{ from: "senses.darkvision", to: "data.attributes.senses.darkvision" },
			{ from: "senses.other", to: "data.attributes.senses.special" },
			{ from: "senses.tremorsense", to: "data.attributes.senses.tremorsense" },
			{ from: "senses.truesight", to: "data.attributes.senses.truesight" },
			{ from: "speeds.burrow", to: "data.attributes.movement.burrow" },
			{ from: "speeds.can_hover", to: "data.attributes.movement.hover" },
			{ from: "speeds.climb", to: "data.attributes.movement.climb" },
			{ from: "speeds.fly", to: "data.attributes.movement.fly" },
			{ from: "speeds.swim", to: "data.attributes.movement.swim" },			
			{ from: "speeds.walk", to: "data.attributes.movement.walk" },
			{ from: "spellbook.slots.1.current", to: "data.spells.spell1.value" },
			{ from: "spellbook.slots.1.maximum", to: "data.spells.spell1.override" },
			{ from: "spellbook.slots.2.current", to: "data.spells.spell2.value" },
			{ from: "spellbook.slots.2.maximum", to: "data.spells.spell2.override" },
			{ from: "spellbook.slots.3.current", to: "data.spells.spell3.value" },
			{ from: "spellbook.slots.3.maximum", to: "data.spells.spell3.override" },
			{ from: "spellbook.slots.4.current", to: "data.spells.spell4.value" },
			{ from: "spellbook.slots.4.maximum", to: "data.spells.spell4.override" },
			{ from: "spellbook.slots.5.current", to: "data.spells.spell5.value" },
			{ from: "spellbook.slots.5.maximum", to: "data.spells.spell5.override" },
			{ from: "spellbook.slots.6.current", to: "data.spells.spell6.value" },
			{ from: "spellbook.slots.6.maximum", to: "data.spells.spell6.override" },
			{ from: "spellbook.slots.7.current", to: "data.spells.spell7.value" },
			{ from: "spellbook.slots.7.maximum", to: "data.spells.spell7.override" },
			{ from: "spellbook.slots.8.current", to: "data.spells.spell8.value" },
			{ from: "spellbook.slots.8.maximum", to: "data.spells.spell8.override" },
			{ from: "spellbook.slots.9.current", to: "data.spells.spell9.value" },
			{ from: "spellbook.slots.9.maximum", to: "data.spells.spell9.override" },
			{ from: "spellbook.slots.pact.current", to: "data.spells.pact.value" },
			{ from: "spellbook.slots.pact.maximum", to: "data.spells.pact.override" },
			{ from: "spellbook.spellcasting.ability", to: "data.attributes.spellcasting" },
			{ from: "spellbook.spellcasting.level", to: "data.details.spellLevel" }
		];
		mappings.forEach((x) => {
			if (hasProperty(blueprint.data, x.from)) {
				setProperty(actorData, x.to, getProperty(blueprint.data, x.from));
			}
		});

		if (hasProperty(blueprint.data, "description.type.category")) {
			const category = blueprint.data.description.type.category;
			if (category == "custom") {
				const custom = getProperty(blueprint.data, "description.type.custom");
				setProperty(actorData, "data.details.type", custom);
			} else {
				setProperty(actorData, "data.details.type", game.i18n.format(`gmm.common.type.${category}`));
			}
		}

		if (hasProperty(blueprint.data, "description.alignment.category")) {
			const alignment = blueprint.data.description.alignment.category;
			if (alignment == "custom") {
				const custom = getProperty(blueprint.data, "description.alignment.custom");
				setProperty(actorData, "data.details.alignment", custom);
			} else {
				setProperty(actorData, "data.details.alignment", game.i18n.format(`gmm.common.alignment.${alignment}`));
			}
		}

		if (hasProperty(blueprint.data, "speeds.units")) {
			const unit = GMM_5E_UNITS.find((x) => x.name == blueprint.data.speeds.units).foundry;
			setProperty(actorData, "data.attributes.movement.units", unit);
		}

		if (hasProperty(blueprint.data, "senses.units")) {
			const unit = GMM_5E_UNITS.find((x) => x.name == blueprint.data.senses.units).foundry;
			setProperty(actorData, "data.attributes.senses.units", unit);
		}

		if (hasProperty(blueprint.data, "description.size")) {
			const size = GMM_5E_SIZES.find((x) => x.name == blueprint.data.description.size).foundry;
			setProperty(actorData, "data.traits.size", size);
		}

		GMM_5E_SKILLS.forEach((x) => {
			if (hasProperty(blueprint.data, `skills.${x.name}`)) {
				switch (blueprint.data.skills[x.name]) {
					case "half-proficient":
						setProperty(actorData, `data.skills.${x.foundry}.value`, 0.5);
						break;
					case "proficient":
						setProperty(actorData, `data.skills.${x.foundry}.value`, 1);
						break;
					case "expert":
						setProperty(actorData, `data.skills.${x.foundry}.value`, 2);
						break;
					default:
						setProperty(actorData, `data.skills.${x.foundry}.value`, 0);
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
			setProperty(actorData, `data.traits.${foundryField}.value`, traits);
		}
	}

	function _getActorType(type) {
		if (type.trim().length == 0) {
			return {
				category: "humanoid",
				custom: null
			}
		} else {
			let actorType = type.replace(/ /g, '_').trim().toLowerCase();
			if (GMM_5E_CATEGORIES.includes(actorType)) {
				return {
					category: actorType,
					custom: null
				}
			} else {
				return {
					category: "custom",
					custom: type.trim()
				}
			}
		}
	}

	function _getActorAlignment(alignment) {
		if (alignment.trim().length == 0) {
			return {
				category: "unaligned",
				custom: null
			}
		} else {
			let actorAlignment = alignment.replace(/ /g, '_').trim().toLowerCase();
			if (GMM_5E_ALIGNMENTS.includes(actorAlignment)) {
				return {
					category: actorAlignment,
					custom: null
				}
			} else {
				return {
					category: "custom",
					custom: alignment.trim()
				}
			}
		}
	}

	function _getItemDetails(item) {
		let details = {
			id: item._id,
			name: item.name,
			img: item.img,
			weight: 0,
			quantity: 1
		};
		switch (item.type) {
			case "class":
				details.class = {
					level: item.data.levels,
					spellcasting: item.data.spellcasting
				}
				break;
			case "weapon":
			case "equipment":
			case "consumable":
			case "tool":
			case "backpack":
			case "loot":
				details.weight = item.data.weight || 0;
				details.quantity = item.data.quantity || 0;
				break;
		}
		return details;
	}

	return {
		createFromActor: createFromActor,
		getActorDataFromBlueprint: getActorDataFromBlueprint
	};
})();

export default MonsterBlueprint;