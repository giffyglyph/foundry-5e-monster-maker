import { GMM_5E_ALIGNMENTS } from "../consts/Gmm5eAlignments.js";
import { GMM_5E_CONDITIONS } from "../consts/Gmm5eConditions.js";
import { GMM_5E_DAMAGE_TYPES } from "../consts/Gmm5eDamageTypes.js";
import { GMM_5E_LANGUAGES } from "../consts/Gmm5eLanguages.js";
import { GMM_5E_SIZES } from "../consts/Gmm5eSizes.js";
import { GMM_5E_SKILLS } from "../consts/Gmm5eSkills.js";
import { GMM_5E_SPEEDS } from "../consts/Gmm5eSpeeds.js";
import { GMM_5E_UNITS } from "../consts/Gmm5eUnits.js";
import { GMM_MONSTER_BLUEPRINT } from "../consts/GmmMonsterBlueprint.js";
import { GMM_MONSTER_RANKS, GMM_MONSTER_RANK_AUTHORED_KEYS } from "../consts/GmmMonsterRanks.js";
import { GMM_MONSTER_ROLES, GMM_MONSTER_ROLE_AUTHORED_KEYS } from "../consts/GmmMonsterRoles.js";
import { GMM_5E_XP } from "../consts/Gmm5eXp.js";
import CompatibilityHelpers from "./CompatibilityHelpers.js";

const MonsterBlueprint = (function () {

	// Plain path-to-path bindings copied verbatim between the GMM blueprint and the dnd5e Actor schema.
	// Anything needing a value transform is handled separately below, not here.
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
		{ from: "hit_points.temporary_maximum", to: "system.attributes.hp.tempmax" },
		{ from: "inventory.encumbrance.powerful_build", to: "flags.dnd5e.powerfulBuild" },
		{ from: "inventory.currency.cp", to: "system.currency.cp" },
		{ from: "inventory.currency.ep", to: "system.currency.ep" },
		{ from: "inventory.currency.gp", to: "system.currency.gp" },
		{ from: "inventory.currency.pp", to: "system.currency.pp" },
		{ from: "inventory.currency.sp", to: "system.currency.sp" },
		{ from: "lair_actions.always_show", to: "system.resources.lair.value" },
		{ from: "lair_actions.initiative", to: "system.resources.lair.initiative" },
		{ from: "languages.other", to: "system.traits.languages.custom" },
		{ from: "legendary_actions.maximum", to: "system.resources.legact.max" },
		{ from: "legendary_resistances.maximum", to: "system.resources.legres.max" },
		{ from: "senses.blindsight", to: "system.attributes.senses.ranges.blindsight" },
		{ from: "senses.darkvision", to: "system.attributes.senses.ranges.darkvision" },
		{ from: "senses.other", to: "system.attributes.senses.special" },
		{ from: "senses.tremorsense", to: "system.attributes.senses.ranges.tremorsense" },
		{ from: "senses.truesight", to: "system.attributes.senses.ranges.truesight" },
		{ from: "speeds.can_hover", to: "system.attributes.movement.hover" },
		{ from: "spellbook.slots.1.current", to: "system.spells.spell1.value" },
		{ from: "spellbook.slots.1.maximum", to: "system.spells.spell1.override" },
		{ from: "spellbook.slots.2.current", to: "system.spells.spell2.value" },
		{ from: "spellbook.slots.2.maximum", to: "system.spells.spell2.override" },
		{ from: "spellbook.slots.3.current", to: "system.spells.spell3.value" },
		{ from: "spellbook.slots.3.maximum", to: "system.spells.spell3.override" },
		{ from: "spellbook.slots.4.current", to: "system.spells.spell4.value" },
		{ from: "spellbook.slots.4.maximum", to: "system.spells.spell4.override" },
		{ from: "spellbook.slots.5.current", to: "system.spells.spell5.value" },
		{ from: "spellbook.slots.5.maximum", to: "system.spells.spell5.override" },
		{ from: "spellbook.slots.6.current", to: "system.spells.spell6.value" },
		{ from: "spellbook.slots.6.maximum", to: "system.spells.spell6.override" },
		{ from: "spellbook.slots.7.current", to: "system.spells.spell7.value" },
		{ from: "spellbook.slots.7.maximum", to: "system.spells.spell7.override" },
		{ from: "spellbook.slots.8.current", to: "system.spells.spell8.value" },
		{ from: "spellbook.slots.8.maximum", to: "system.spells.spell8.override" },
		{ from: "spellbook.slots.9.current", to: "system.spells.spell9.value" },
		{ from: "spellbook.slots.9.maximum", to: "system.spells.spell9.override" },
		{ from: "spellbook.slots.pact.current", to: "system.spells.pact.value" },
		{ from: "spellbook.slots.pact.maximum", to: "system.spells.pact.override" },
		{ from: "spellbook.spellcasting.ability", to: "system.attributes.spellcasting" },
		{ from: "spellbook.spellcasting.level", to: "system.attributes.spell.level" }
	];

	// Everything the base pass derives, none of it synced from actor data.
	const BASE_SUBTREES = [
		"combat", "armor_class", "hit_points", "trained_saves", "skills", "challenge_rating", "xp",
		"ability_modifiers", "proficiency_bonus", "attack_bonus", "attack_dcs", "damage_per_action"
	];

	/* Defaults, then the seed derived from a static block, then whatever is stored */
	function _resolveBlueprintSources(actor) {
		const stored = actor.flags.gmm?.blueprint ? _verifyBlueprint(actor.flags.gmm.blueprint) : null;
		return [stored?.data?.combat?.rank?.type ? null : _getInitialData(actor), stored];
	}

	/* A non-custom dial's modifiers are a creation-time snapshot of the const table, so a corrected
	   table reaches an existing scaler only by being restored here. Under `custom` there is no table
	   to restore from, because every value in it was typed by the builder. */
	function _reconcileModifiers(blueprint) {
		_reconcileDial(blueprint.data?.combat?.rank, GMM_MONSTER_RANKS, GMM_MONSTER_RANK_AUTHORED_KEYS);
		_reconcileDial(blueprint.data?.combat?.role, GMM_MONSTER_ROLES, GMM_MONSTER_ROLE_AUTHORED_KEYS);
		return blueprint;
	}

	function _reconcileDial(dial, table, authoredKeys) {
		const owned = (dial?.type && dial.type !== "custom") ? table[dial.type] : null;
		if (!owned) return;
		const authored = {};
		authoredKeys.forEach((x) => {
			if (dial.modifiers?.[x] !== undefined) authored[x] = dial.modifiers[x];
		});
		// Deep: a shallow copy would leave `phases` a live reference into the const table.
		dial.modifiers = $.extend(true, {}, owned, authored);
	}

	function createFromActor(actor) {
		const blueprint = _reconcileModifiers($.extend(true, {}, GMM_MONSTER_BLUEPRINT, ..._resolveBlueprintSources(actor)));
		return _syncActorDataToBlueprint(blueprint, actor);
	}

	/* AC and max HP have to be assigned in base data, and nothing else the forge produces does. */
	function createBaseFromActor(actor) {
		const [seed, stored] = _resolveBlueprintSources(actor);
		return _reconcileModifiers({
			data: $.extend(true, {},
				_pickBaseSubtrees(GMM_MONSTER_BLUEPRINT.data),
				_pickBaseSubtrees(seed?.data),
				_pickBaseSubtrees(stored?.data))
		});
	}

	function _pickBaseSubtrees(data) {
		const picked = {};
		BASE_SUBTREES.forEach((x) => {
			if (data?.[x] !== undefined) picked[x] = data[x];
		});
		return picked;
	}

	function _getInitialData(actor) {
		let actorData = actor._source.system;
		let resources = actorData.resources;
		let combatType = (resources.lair.value) ? "paragon" : (resources.legact.max || resources.legres.max) ? "elite": "grunt";
		let combatRank = GMM_MONSTER_RANKS[combatType];
		let abilityRankings = Object.entries(actorData.abilities).sort((x, y) => y[1].value - x[1].value).map((x) => x[0]);
		const cr = actorData.details.cr;
		const staticXp = (cr ?? null) === null ? null : (GMM_5E_XP.filter((x) => x.cr <= cr).pop()?.xp ?? 0);
		// Left undefined so jQuery's extend skips it and the blueprint's own default level stands.
		let combatLevel = (staticXp === null) ? undefined : GMM_5E_XP.filter((x) => x.xp <= staticXp / combatRank.xp).pop().level;
		let combatRole = "striker";
		switch (abilityRankings[0]) {
			case "dex":
				combatRole = "skirmisher";
				break;
			case "con":
				combatRole = "defender";
				break;
			case "int":
				combatRole = "controller";
				break;
			case "wis":
				combatRole = "lurker";
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
		// Direct-leaf writes via `document.update({ "flags.gmm.blueprint.data.<x>": v })` can leave
		// data present but no version id. Backfill it so the blueprint verifies.
		if (blueprint && blueprint.vid === undefined && blueprint.data) {
			blueprint.vid = 1;
			if (!blueprint.type) blueprint.type = "monster";
		}
		switch (blueprint?.vid) {
			case 1:
				return blueprint;
			default:
				console.error(game.i18n.format("gmm.monster.errors.invalid_version", { vid: blueprint?.vid }), blueprint);
				return null;
		}
	}
	
	const GMM_5E_SKILL_LEVELS = { "half-proficient": 0.5, "proficient": 1, "expert": 2 };

	/* A prepared read would save an effect's contribution here as the build's own value, because
	   everything this function reads is written back. */
	function _syncActorDataToBlueprint(blueprint, actor) {
		const blueprintData = blueprint.data;
		const stored = actor._source;
		try {
			mappings.forEach((x) => {
				if (CompatibilityHelpers.hasProperty(stored, x.to)) {
					CompatibilityHelpers.setProperty(blueprintData, x.from, CompatibilityHelpers.getProperty(stored, x.to));
				}
			});

			blueprintData.actions.items = [];
			blueprintData.bonus_actions.items = [];
			blueprintData.description.alignment = _getActorAlignment(stored.system.details.alignment);
			blueprintData.description.size = GMM_5E_SIZES.find((x) => x.foundry == stored.system.traits.size)?.name;
			blueprintData.description.type.swarm = GMM_5E_SIZES.find((x) => x.foundry == stored.system.details.type.swarm)?.name;
			// Initiative advantage moved from `flags.dnd5e.initiativeAdv` (boolean) to
			// `system.attributes.init.roll.mode` (number, 1 = advantage, -1 = disadvantage).
			blueprintData.initiative.advantage = stored.system?.attributes?.init?.roll?.mode === 1;
			// dnd5e no longer stores legact/legres remaining. Derive "current remaining" as max - spent.
			const legact = stored.system?.resources?.legact ?? {};
			blueprintData.legendary_actions.current = (legact.max ?? 0) - (legact.spent ?? 0);
			const legres = stored.system?.resources?.legres ?? {};
			blueprintData.legendary_resistances.current = (legres.max ?? 0) - (legres.spent ?? 0);
			blueprintData.inventory.encumbrance.powerful_build = !!stored.flags?.dnd5e?.powerfulBuild;
			blueprintData.inventory.items = [];
			blueprintData.lair_actions.items = [];
			blueprintData.legendary_actions.items = [];
			blueprintData.reactions.items = [];
			blueprintData.senses.units = GMM_5E_UNITS.find((x) => x.foundry == stored.system.attributes.senses.units)?.name ?? stored.system.attributes.senses.units;
			GMM_5E_SPEEDS.forEach((mode) => {
				const speed = CompatibilityHelpers.movementSpeed(stored.system.attributes.movement, mode);
				if (speed !== undefined) blueprintData.speeds[mode] = speed;
			});
			blueprintData.speeds.units = GMM_5E_UNITS.find((x) => x.foundry == stored.system.attributes.movement.units)?.name ?? stored.system.attributes.movement.units;
			blueprintData.spellbook.spellcasting.ability = (stored.system.attributes.spellcasting) ? stored.system.attributes.spellcasting : "int";
			// First-time conversion: vanilla NPCs with spell items usually have spell.level=0. Mirror combat level so casters scale.
			if (!stored.flags?.gmm
				&& !blueprintData.spellbook.spellcasting.level
				&& actor.items?.some?.(i => i.type === "spell")) {
				blueprintData.spellbook.spellcasting.level = blueprintData.combat?.level ?? 1;
			}
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
				// A skill the creature was never proficient in is absent from the source entirely.
				switch (stored.system.skills?.[x.foundry]?.value) {
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

			stored.system.traits.di.value.forEach((x) => blueprintData.damage_immunities[x] = true);
			stored.system.traits.dr.value.forEach((x) => blueprintData.damage_resistances[x] = true);
			stored.system.traits.dv.value.forEach((x) => blueprintData.damage_vulnerabilities[x] = true);
			stored.system.traits.ci.value.forEach((x) => blueprintData.condition_immunities[x] = true);
			stored.system.traits.languages.value.forEach((x) => blueprintData.languages[x] = true);

			if (actor.items) {
				try {
					actor.items.contents.sort((a, b) => (a.sort || 0) - (b.sort || 0)).forEach(x => {
						let item = actor.items.get(x.id)
						switch (item.getSortingCategory()) {
							case "spell":
								// Mirrors dnd5e's own spellbook filter for a cast activity's cached copy.
								if (item.getFlag("dnd5e", "cachedFor") && !item.system.linkedActivity?.displayInSpellbook) break;
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
								blueprintData.inventory.items.push(_getItemDetails(item, blueprintData.display));
								break;
							default: {
								// dnd5e v5+ moved `system.activation` off the item onto each activity.
								const activations = item.system?.activities?.contents?.map(a => a.activation?.type).filter(_ => _) ?? [];
								const isSpecialReaction = activations.some(t =>
									t === "reactiondamage" || t === "reactionmanual" || t === "reactionpreattack"
								);
								if (isSpecialReaction) {
									blueprintData.reactions.items.push(_getItemDetails(item));
								} else {
									blueprintData.actions.items.push(_getItemDetails(item));
								}
								break;
							}
						}
					});

					blueprintData.actions.items.sort((a, b) => getSortValue(a, b));
					blueprintData.inventory.items.sort((a, b) => getSortValue(a, b));
					blueprintData.traits.items.sort((a, b) => getSortValue(a, b));
					blueprintData.legendary_actions.items.sort((a, b) => getSortValue(a, b));
					blueprintData.lair_actions.items.sort((a, b) => getSortValue(a, b));
					blueprintData.reactions.items.sort((a, b) => getSortValue(a, b));
					blueprintData.bonus_actions.items.sort((a, b) => getSortValue(a, b));
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
	// Spells are left out: the spellbook already reads `sort` straight through.
	const SORTED_CATEGORIES = new Set(["action", "bonus", "reaction", "lair", "legendary", "trait", "loot"]);

	function rarityRank(rarity) {
		switch (rarity) {
			case "common":
				return 0;
			case "uncommon":
				return 1;
			case "rare":
				return 2;
			default:
				return 3;
		}
	}

	function compareByDefault(a, b) {
		return rarityRank(b.rarity) - rarityRank(a.rarity) || a.name.localeCompare(b.name);
	}

	function getSortValue(a, b) {
		return ((a.sort || 0) - (b.sort || 0)) || compareByDefault(a, b);
	}

	function _orderKey(item) {
		return {
			name: item.name ? item.name : "",
			rarity: item.flags?.gmm?.blueprint?.data?.rarity ? item.flags.gmm.blueprint.data.rarity : ""
		};
	}

	function compareItemsForDisplay(a, b) {
		return ((a.sort || 0) - (b.sort || 0)) || compareByDefault(_orderKey(a), _orderKey(b));
	}

	function _sortedSiblings(actor, category, excludeId) {
		return (actor?.items?.contents ?? [])
			.filter(i => (i.id !== excludeId) && (i.getSortingCategory?.() === category))
			.sort(compareItemsForDisplay);
	}

	/* The sort a new or renamed ability takes so it lands in default order without disturbing a GM's own. */
	function getDefaultSort(actor, category, orderKey, excludeId = null) {
		const density = CONST.SORT_INTEGER_DENSITY;
		const siblings = _sortedSiblings(actor, category, excludeId);
		if (!siblings.length) return density;

		const idx = siblings.findIndex(s => compareByDefault(orderKey, _orderKey(s)) < 0);
		if (idx === 0) return (siblings[0].sort || 0) - density;
		if (idx === -1) return (siblings[siblings.length - 1].sort || 0) + density;

		const min = siblings[idx - 1].sort || 0;
		const max = siblings[idx].sort || 0;
		// A tie is settled by the default comparator anyway
		return (max - min > 1) ? Math.round((min + max) / 2) : max;
	}

	/* An ability dropped from a compendium arrives carrying that pack's sort, which orders nothing here. */
	function normalizeItemSorts(actor) {
		const buckets = new Map();
		for (const item of (actor?.items?.contents ?? [])) {
			const category = item.getSortingCategory?.();
			if (!SORTED_CATEGORIES.has(category)) continue;
			if (!buckets.has(category)) buckets.set(category, []);
			buckets.get(category).push(item);
		}

		const updates = [];
		for (const items of buckets.values()) {
			items.sort((a, b) => compareByDefault(_orderKey(a), _orderKey(b)));
			items.forEach((item, i) => {
				const sort = (i + 1) * CONST.SORT_INTEGER_DENSITY;
				if (item.sort !== sort) updates.push({ _id: item.id, sort: sort });
			});
		}
		return updates;
	}

	function getActorDataFromBlueprint(blueprint, currentActor = null) {
		const actorData = {};

		mappings.forEach((x) => {
			if (CompatibilityHelpers.hasProperty(blueprint.data, x.from)) {
				CompatibilityHelpers.setProperty(actorData, x.to, CompatibilityHelpers.getProperty(blueprint.data, x.from));
			}
		});

		if (CompatibilityHelpers.hasProperty(blueprint.data, "description.alignment.category")) {
			const alignment = blueprint.data.description.alignment.category;
			if (alignment) {
				CompatibilityHelpers.setProperty(actorData, "system.details.alignment", game.i18n.format(`gmm.common.alignment.${alignment}`));
			} else {
				const custom = CompatibilityHelpers.getProperty(blueprint.data, "description.alignment.custom");
				CompatibilityHelpers.setProperty(actorData, "system.details.alignment", custom);
			}
		}

		GMM_5E_SPEEDS.forEach((mode) => {
			if (!CompatibilityHelpers.hasProperty(blueprint.data, `speeds.${mode}`)) return;
			CompatibilityHelpers.setProperty(actorData, CompatibilityHelpers.movementSpeedPath(mode), blueprint.data.speeds[mode]);
		});

		if (CompatibilityHelpers.hasProperty(blueprint.data, "speeds.units")) {
			const unit = GMM_5E_UNITS.find((x) => x.name == blueprint.data.speeds.units);
			CompatibilityHelpers.setProperty(actorData, "system.attributes.movement.units", unit ? unit.foundry : (blueprint.data.speeds.units ?? null));
		}

		if (CompatibilityHelpers.hasProperty(blueprint.data, "senses.units")) {
			const unit = GMM_5E_UNITS.find((x) => x.name == blueprint.data.senses.units);
			CompatibilityHelpers.setProperty(actorData, "system.attributes.senses.units", unit ? unit.foundry : (blueprint.data.senses.units ?? null));
		}

		if (CompatibilityHelpers.hasProperty(blueprint.data, "description.size")) {
			const size = GMM_5E_SIZES.find((x) => x.name == blueprint.data.description.size);
			CompatibilityHelpers.setProperty(actorData, "system.traits.size", size ? size.foundry : null);
		}

		if (CompatibilityHelpers.hasProperty(blueprint.data, "description.type.swarm")) {
			const size = GMM_5E_SIZES.find((x) => x.name == blueprint.data.description.type.swarm);
			CompatibilityHelpers.setProperty(actorData, "system.details.type.swarm", size ? size.foundry : "");
		}

		GMM_5E_SKILLS.forEach((x) => {
			if (!CompatibilityHelpers.hasProperty(blueprint.data, `skills.${x.name}`)) return;
			const level = blueprint.data.skills[x.name];
			const stored = currentActor?._source?.system?.skills?.[x.foundry];
			// An entry created for a skill nobody trained is what leaves the schema to default its ability.
			if (!level && !stored) return;
			CompatibilityHelpers.setProperty(actorData, `system.skills.${x.foundry}.value`, GMM_5E_SKILL_LEVELS[level] ?? 0);
			// dnd5e's initializer never runs on an entry this write creates, so the ability has to be seeded here.
			CompatibilityHelpers.setProperty(actorData, `system.skills.${x.foundry}.ability`, stored?.ability ?? x.ability);
		});

		_convertTraits(blueprint, actorData, GMM_5E_DAMAGE_TYPES, "damage_resistances", "dr");
		_convertTraits(blueprint, actorData, GMM_5E_DAMAGE_TYPES, "damage_vulnerabilities", "dv");
		_convertTraits(blueprint, actorData, GMM_5E_DAMAGE_TYPES, "damage_immunities", "di");
		_convertTraits(blueprint, actorData, GMM_5E_CONDITIONS, "condition_immunities", "ci");
		_convertTraits(blueprint, actorData, GMM_5E_LANGUAGES, "languages", "languages");

		// Legendary actions and resistances store `spent` rather than the remaining count the blueprint models.
		if (CompatibilityHelpers.hasProperty(blueprint.data, "legendary_actions.current")
			&& CompatibilityHelpers.hasProperty(blueprint.data, "legendary_actions.maximum")) {
			const max = Number(blueprint.data.legendary_actions.maximum) || 0;
			const current = Number(blueprint.data.legendary_actions.current) || 0;
			CompatibilityHelpers.setProperty(actorData, "system.resources.legact.spent", Math.max(0, max - current));
		}
		if (CompatibilityHelpers.hasProperty(blueprint.data, "legendary_resistances.current")
			&& CompatibilityHelpers.hasProperty(blueprint.data, "legendary_resistances.maximum")) {
			const max = Number(blueprint.data.legendary_resistances.maximum) || 0;
			const current = Number(blueprint.data.legendary_resistances.current) || 0;
			CompatibilityHelpers.setProperty(actorData, "system.resources.legres.spent", Math.max(0, max - current));
		}

		// The blueprint only models a boolean advantage, so only write mode when toggling it:
		// preserve a user-set -1 (disadvantage) instead of forcing 0 on every save.
		if (CompatibilityHelpers.hasProperty(blueprint.data, "initiative.advantage")) {
			const currentMode = currentActor?.system?.attributes?.init?.roll?.mode;
			if (blueprint.data.initiative.advantage) {
				CompatibilityHelpers.setProperty(actorData, "system.attributes.init.roll.mode", 1);
			} else if (currentMode === 1) {
				CompatibilityHelpers.setProperty(actorData, "system.attributes.init.roll.mode", 0);
			}
		}

		return actorData;
	}

	function _convertTraits(blueprint, actorData, values, blueprintField, foundryField) {
		if (CompatibilityHelpers.hasProperty(blueprint.data, `${blueprintField}.other`)) {
			let traits = [];
			values.forEach((x) => {
				if (blueprint.data[blueprintField][x]) {
					traits.push(x);
				}
			});
			CompatibilityHelpers.setProperty(actorData, `system.traits.${foundryField}.value`, traits);
		}
	}

	function _getActorAlignment(alignment) {
		const trimmed = alignment?.trim();
		if (!trimmed?.length) {
			return {
				category: "",
				custom: null
			}
		}

		const actorAlignment = trimmed.replace(/ /g, '_').toLowerCase();
		if (GMM_5E_ALIGNMENTS.includes(actorAlignment)) {
			return {
				category: actorAlignment,
				custom: null
			}
		}

		/* getActorDataFromBlueprint writes a localized label out, so the read back has to invert it. */
		const localized = GMM_5E_ALIGNMENTS.find(
			(x) => game.i18n.format(`gmm.common.alignment.${x}`).trim().toLowerCase() === trimmed.toLowerCase()
		);
		if (localized) {
			return {
				category: localized,
				custom: null
			}
		}

		return {
			category: "",
			custom: trimmed
		}
	}

	function _getItemDetails(item, display) {
		let details = {
			id: item.id,
			name: item.name,
			img: item.img,
			weight: item.system.weight ? CompatibilityHelpers.weight(item.system.weight, display ? display.units : "") : 0,
			quantity: item.system.quantity ? item.system.quantity : 0,
			price: item.system.price ? item.system.price : 0,
			requirements: {
				level: {
					min: item.flags.gmm?.blueprint?.data?.requirements?.level?.min,
					max: item.flags.gmm?.blueprint?.data?.requirements?.level?.max
				},
				rank: item.flags.gmm?.blueprint?.data?.requirements?.rank,
				role: item.flags.gmm?.blueprint?.data?.requirements?.role
			},
			rarity: item.flags.gmm?.blueprint?.data?.rarity ? item.flags.gmm?.blueprint?.data?.rarity : "",
			sort: item.sort ? item.sort : 0
		};
		return details;
	}

	return {
		createFromActor: createFromActor,
		createBaseFromActor: createBaseFromActor,
		getActorDataFromBlueprint: getActorDataFromBlueprint,
		getDefaultSort: getDefaultSort,
		compareItemsForDisplay: compareItemsForDisplay,
		normalizeItemSorts: normalizeItemSorts,
		isSortedCategory: (category) => SORTED_CATEGORIES.has(category)
	};
})();

export default MonsterBlueprint;