import { DEFAULT_MONSTER_BLUEPRINT } from "../consts/DefaultMonsterBlueprint.js";
import { DEFAULT_CONDITIONS } from "../consts/DefaultConditions.js";
import { DEFAULT_DAMAGE_TYPES } from "../consts/DefaultDamageTypes.js";
import { DEFAULT_LANGUAGES } from "../consts/DefaultLanguages.js";
import { DEFAULT_SKILLS } from "../consts/DefaultSkills.js";
import { DEFAULT_SIZES } from "../consts/DefaultSizes.js";
import { DEFAULT_UNITS } from "../consts/DefaultUnits.js";
import { MONSTER_RANKS } from "../consts/MonsterRanks.js";
import { MONSTER_ROLES } from "../consts/MonsterRoles.js";

const MonsterBlueprint = (function() {

	function prepareBlueprint(type, ...data) {
		let blueprint = $.extend(true, {}, DEFAULT_MONSTER_BLUEPRINT, ...data);

		if (blueprint.data.combat.rank.modifiers == null) {
			blueprint.data.combat.rank.modifiers = MONSTER_RANKS[blueprint.data.combat.rank.type];
		}

		if (blueprint.data.combat.role.modifiers == null) {
			blueprint.data.combat.role.modifiers = MONSTER_ROLES[blueprint.data.combat.role.type];
		}

		blueprint.type = type;
		return blueprint;
	}

	function extractBlueprintFromActor(actor) {
		let blueprint = {
			data: {
				description: {
					name: actor.name,
					image: actor.img,
					size: DEFAULT_SIZES.find((x) => x.foundry == actor.data.traits.size).name
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
	}

	function convertBlueprintToActor(form) {

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
			{ from: "data.gg5e_mm.blueprint.data.languages.other", to: "data.traits.languages.custom" }
		];
		mappings.forEach((x) => {
			if (typeof form[x.from] !== 'undefined') {
				form[x.to] = form[x.from];
			}
		});

		if (typeof form["data.gg5e_mm.blueprint.data.speeds.units"] !== 'undefined') {
			form["data.attributes.movement.units"] = DEFAULT_UNITS.find((x) => x.name == form["data.gg5e_mm.blueprint.data.speeds.units"]).foundry;
		}

		if (typeof form["data.gg5e_mm.blueprint.data.senses.units"] !== 'undefined') {
			form["data.attributes.senses.units"] = DEFAULT_UNITS.find((x) => x.name == form["data.gg5e_mm.blueprint.data.senses.units"]).foundry;
		}

		if (typeof form["data.gg5e_mm.blueprint.data.description.size"] !== 'undefined') {
			form["data.traits.size"] = DEFAULT_SIZES.find((x) => x.name == form["data.gg5e_mm.blueprint.data.description.size"]).foundry;
		}

		DEFAULT_SKILLS.forEach((x) => {
			if (typeof form[`data.gg5e_mm.blueprint.data.skills.${x.name}`] !== 'undefined') {
				switch (form[`data.gg5e_mm.blueprint.data.skills.${x.name}`]) {
					case "half-proficient":
						form[`data.skills.${x.foundry}.value`] = 0.5;
						break;
					case "proficient":
						form[`data.skills.${x.foundry}.value`] = 1;
						break;
					case "expert":
						form[`data.skills.${x.foundry}.value`] = 2;
						break;
					default:
						form[`data.skills.${x.foundry}.value`] = 0;
						break;
				}
			}
		});

		_convertTraits(form, DEFAULT_DAMAGE_TYPES, "damage_resistances", "dr");
		_convertTraits(form, DEFAULT_DAMAGE_TYPES, "damage_vulnerabilities", "dv");
		_convertTraits(form, DEFAULT_DAMAGE_TYPES, "damage_immunities", "di");
		_convertTraits(form, DEFAULT_CONDITIONS, "condition_immunities", "ci");
		_convertTraits(form, DEFAULT_LANGUAGES, "languages", "languages");

		return form;
	}

	function _convertTraits(form, values, blueprintField, foundryField) {
		if (typeof form[`data.gg5e_mm.blueprint.data.${blueprintField}.other`] !== 'undefined') {
			let traits = [];
			values.forEach((x) => {
				if (form[`data.gg5e_mm.blueprint.data.${blueprintField}.${x}`]) {
					traits.push(x);
				}
			});
			form[`data.traits.${foundryField}.value`] = traits;
		}
	}

	return {
		prepareBlueprint: prepareBlueprint,
		extractBlueprintFromActor: extractBlueprintFromActor,
		convertBlueprintToActor: convertBlueprintToActor
	};
})();

export default MonsterBlueprint;