import ParagonDefenses from './ParagonDefenses.js';
import MonsterBlueprint from './MonsterBlueprint.js';
import MonsterForge from './MonsterForge.js';
import { GMM_5E_ABILITIES } from "../consts/Gmm5eAbilities.js";
import { GMM_5E_SKILLS } from '../consts/Gmm5eSkills.js';
import { GMM_5E_SPEEDS } from '../consts/Gmm5eSpeeds.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';
import CompatibilityHelpers from './CompatibilityHelpers.js';

const GmmActor = (function () {
	function Proficiency(...args) {
		return new dnd5e.documents.Proficiency(...args);
	}

	function patchActor5e() {
		CompatibilityHelpers.safeWrap('game.dnd5e.documents.Actor5e.prototype.prepareBaseData', function (wrapped, ...args) {
			if (this.type == "npc" && this.getSheetId() == `${GMM_MODULE_TITLE}.MonsterSheet`) {
				wrapped(...args);
				_prepareMonsterBaseData(this);
			} else {
				wrapped(...args);
				// A sheet switch away from the forge would otherwise leave the surface behind until a reload.
				delete this._gmmRollData;
				delete this._gmmBaseMax;
				delete this._gmmBaseProf;
				delete this._gmmBaseAbilityMods;
				delete this._gmmBaseSkillValue;
				delete this._gmmSpellDc;
			}
		}, 'WRAPPER');
		/* Foundry runs the data model's derived pass, where prepareMovement resolves every mode, before
		 * the document's. */
		CompatibilityHelpers.safeWrap('game.dnd5e.documents.Actor5e.prototype.prepareEmbeddedDocuments', function (wrapped, ...args) {
			wrapped(...args);
			if (this.isGmmMonster()) _stashAppliedMovement(this);
		}, 'WRAPPER');

		/* Wrapped here rather than on applyActiveEffects because DAE applies its phase-corrected changes
		 * after delegating. */
		CompatibilityHelpers.safeWrap('game.dnd5e.documents.Actor5e.prototype.prepareData', function (wrapped, ...args) {
			wrapped(...args);
			if (this.isGmmMonster()) _prepareMonsterSettledData(this);
		}, 'WRAPPER');

		/* An owned item resolves a spellcasting save DC from `abilities.<x>.dc` here */
		CompatibilityHelpers.safeWrap('game.dnd5e.documents.Item5e.prototype.prepareFinalAttributes', function (wrapped, ...args) {
			if (this.actor?.isGmmMonster?.()) _stampSpellDcModifier(this.actor);
			wrapped(...args);
		}, 'WRAPPER');

		// DAE wraps this too, through libWrapper. The two interleave by priority.
		CompatibilityHelpers.safeWrap('game.dnd5e.documents.Actor5e.prototype.getRollData', function (wrapped, ...args) {
			const data = wrapped(...args);
			if (this._gmmRollData) data.gmm = this._gmmRollData;
			return data;
		}, 'WRAPPER');

		const Actor5eProto = game.dnd5e.documents.Actor5e.prototype;
		if (typeof Actor5eProto.prepareBaseData === "function") Actor5eProto.prepare5eBaseData = Actor5eProto.prepareBaseData;
		if (typeof Actor5eProto.prepareDerivedData === "function") Actor5eProto.prepare5eDerivedData = Actor5eProto.prepareDerivedData;
		Actor5eProto.getSheetId = _getActorSheetId;
		Actor5eProto.isGmmMonster = _isGmmMonster;
	}

	function _prepareMonsterBaseData(actor) {
		const actorData = actor.system;
		const monsterBlueprint = MonsterBlueprint.createBaseFromActor(actor);
		const baseAttributes = MonsterForge.createBaseAttributes(monsterBlueprint);
		// Seeded here so a Change written as a formula over @gmm.* has numbers to resolve against.
		actor._gmmRollData = MonsterForge.createBaseRollData(monsterBlueprint);
		CompatibilityHelpers.setArmorClassCalculation(actorData.attributes.ac, "natural");
		actorData.attributes.ac.flat = baseAttributes.armor_class.value;
		actorData.attributes.ac.base = baseAttributes.armor_class.value;
		actorData.attributes.hp.max = _resolveMaximumHitPoints(monsterBlueprint, baseAttributes);
		// Stashed before effects reach the ceiling, so the HP sync can tell a build change from a cap.
		actor._gmmBaseMax = actorData.attributes.hp.max;
		actorData.attributes.hp.formula = baseAttributes.hit_points.formula || '';
		actorData.details.cr = baseAttributes.challenge_rating.value;
		actorData.details.xp.value = baseAttributes.xp.value;
		actorData.attributes.prof = baseAttributes.proficiency_bonus.value;
		// The forge computes the same number from the blueprint, so this is what the settled pass measures against.
		actor._gmmBaseProf = actorData.attributes.prof;
		// Only the score is seeded. dnd5e derives the modifier from it, after a Change has moved it.
		actor._gmmBaseAbilityMods = {};
		GMM_5E_ABILITIES.forEach((x) => {
			actorData.abilities[x].value = baseAttributes.ability_modifiers[x].score;
			actorData.abilities[x].proficient = baseAttributes.trained_saves[x] ? 1 : 0;
			actor._gmmBaseAbilityMods[x] = baseAttributes.ability_modifiers[x].value;
		});
		// A Role's grant is a floor Foundry cannot see unless it is on the field before Changes apply.
		actor._gmmBaseSkillValue = baseAttributes.skills;
		GMM_5E_SKILLS.forEach((x) => {
			// dnd5e backfills every skill key however partial the stored object is, so this guard has no live case.
			if (actorData.skills[x.foundry]) actorData.skills[x.foundry].value = baseAttributes.skills[x.foundry];
		});
		_applyRoleSpeedBonus(actorData, monsterBlueprint);
		actor._gmmSpellDc = {
			modifier: actor.flags.gmm?.blueprint?.data?.spellbook?.spellcasting?.dc?.modifier ?? null,
			applied: false
		};
	}

	/* prepareAbilities cannot know about the authored Modifier, and Item5e#prepareFinalAttributes reads
	   the field it lands on before the settled pass runs. */
	function _stampSpellDcModifier(actor, rollData) {
		const state = actor._gmmSpellDc;
		if (!state || state.applied) return;
		state.applied = true;
		const authored = state.modifier?.value;
		// DerivedAttribute#applyModifier ignores anything else, so honoring it here would print one DC and roll another.
		if (typeof authored !== "number") return;
		if (state.modifier.override) {
			const spellDcBonus = dnd5e.utils.simplifyBonus(actor.system.bonuses?.spell?.dc, rollData ?? actor.getRollData({ deterministic: true }));
			GMM_5E_ABILITIES.forEach((x) => { actor.system.abilities[x].dc = authored + spellDcBonus; });
		} else if (authored) {
			GMM_5E_ABILITIES.forEach((x) => { actor.system.abilities[x].dc += authored; });
		}
	}

	/* A FormulaField can already hold something a GM typed, so an amount joins it rather than landing on it. */
	function _appendBonus(formula, value) {
		const authored = String(formula ?? "").trim();
		if (!authored) return String(value);
		return `${authored} ${value < 0 ? "-" : "+"} ${Math.abs(value)}`;
	}

	/* dnd5e adds this to every non-zero mode, which is what the stat block does with it. Assigning a mode
	 * instead would flatten what prepareMovement derives from conditions, exhaustion and encumbrance. */
	function _applyRoleSpeedBonus(actorData, blueprint) {
		const role = Number(blueprint.data.combat.role?.modifiers?.speed) || 0;
		if (!role) return;
		const movement = actorData.attributes.movement;
		movement.bonus = _appendBonus(movement.bonus, role);
	}

	/* `bonus` already carries the Role at this point. Stashing it would invite the double-count the
	 * speed tooltip exists to avoid. */
	function _stashAppliedMovement(actor) {
		const movement = actor.system?.attributes?.movement ?? {};
		actor._gmmAppliedMovement = Object.fromEntries(GMM_5E_SPEEDS.map((x) => [x, CompatibilityHelpers.movementSpeed(movement, x)]));
	}

	function _foldActorBonuses(actor, rollData) {
		const actorData = actor.system;
		const monsterBlueprint = actor.flags.gmm.blueprint;
		const monsterArtifact = actor.flags.gmm.monster;
		const monsterData = monsterArtifact.data;
		const globalSkillBonus = dnd5e.utils.simplifyBonus(CompatibilityHelpers.globalAbilityBonus(actorData, "skill"), rollData);
		GMM_5E_SKILLS.forEach((x) => {
			const skill = actorData.skills[x.foundry];
			const monsterSkill = monsterData.skills.find((y) => y.code == x.name);
			if (monsterSkill) {
				// The ability and global check bonuses reach every check, so they live on check_modifiers instead.
				monsterSkill.add(dnd5e.utils.simplifyBonus(CompatibilityHelpers.skillCheckBonus(skill), rollData), game.i18n.format('gmm.common.derived_source.check_bonus'));
				monsterSkill.add(globalSkillBonus, game.i18n.format('gmm.common.derived_source.skill_bonus'));
			}
			if (x.name === "perception") {
				// dnd5e counts every check bonus toward a passive score. The forge had proficiency and the modifier.
				monsterData.passive_perception.add(skill.bonus ?? 0, game.i18n.format('gmm.common.derived_source.check_bonus'));
				monsterData.passive_perception.add(dnd5e.utils.simplifyBonus(skill.bonuses.passive, rollData), game.i18n.format('gmm.common.derived_source.passive_bonus'));
				monsterData.passive_perception.add(actor.conditionRollReduction ?? 0, game.i18n.format('gmm.common.derived_source.condition_penalty'));
				// Taken off the node so the blueprint's own Modifier, its override and the floor reach the schema.
				skill.passive = monsterData.passive_perception.value;
			}
		});
		const globalSaveBonus = dnd5e.utils.simplifyBonus(CompatibilityHelpers.globalAbilityBonus(actorData, "save"), rollData);
		GMM_5E_ABILITIES.forEach((x) => {
			const ability = actorData.abilities[x];
			const abilitySaveBonus = dnd5e.utils.simplifyBonus(CompatibilityHelpers.abilitySaveBonus(ability), rollData);
			monsterData.saving_throws[x].add(abilitySaveBonus + globalSaveBonus, "bonus");

			// The roll never sees the artifact, so the forge's excess over mod + saveProf goes through the save bonus.
			const proficiency = monsterBlueprint.data.trained_saves[x].trained ? monsterData.proficiency_bonus.value : 0;
			const derived = monsterData.ability_modifiers[x].value + proficiency + abilitySaveBonus + globalSaveBonus;
			const delta = monsterData.saving_throws[x].value - derived;
			if (delta) {
				CompatibilityHelpers.setAbilitySaveBonus(ability, _appendBonus(CompatibilityHelpers.abilitySaveBonus(ability), delta));
				// prepareAbilities consumed the save bonus before this wrote to it, so both totals follow by hand.
				CompatibilityHelpers.setPreparedSaveBonus(ability, CompatibilityHelpers.preparedSaveBonus(ability) + delta);
				ability.save.value += delta;
			}
		});

		// init.mod was copied out before this, so folding the bonuses in here cannot double-count the roll.
		const init = actorData.attributes.init;
		const initBonus = dnd5e.utils.simplifyBonus(CompatibilityHelpers.initiativeBonus(init), rollData);
		const initCheckBonus = CompatibilityHelpers.preparedCheckBonus(actorData.abilities[monsterData.initiative.ability]) ?? 0;
		monsterData.initiative.add(initBonus, game.i18n.format('gmm.common.derived_source.relative_modifier'));
		monsterData.initiative.add(initCheckBonus, game.i18n.format('gmm.common.derived_source.check_bonus'));

		// prepareInitiative derived these from the pre-scaling ability modifier, before init.mod replaced it.
		const alert = actor.flags?.dnd5e?.initiativeAlert && (dnd5e.settings?.rulesVersion === "legacy") ? 5 : 0;
		init.total = init.mod + initBonus + initCheckBonus + (actorData.attributes.quality?.value ?? 0) + alert
			+ (Number.isNumeric(init.prof.term) ? init.prof.flat : 0) + (actor.conditionRollReduction ?? 0);
		init.score = (CONFIG.DND5E.skillPassive?.base ?? 10) + init.total
			+ ((init.roll?.mode ?? 0) * (CONFIG.DND5E.skillPassive?.modifier ?? 5));
	}

	/* Siblings the stat block reads and the shortcodes do not. The roll already has both: attack from
	 * Activities.buildAttackToHitTerms, damage from dnd5e's own _processDamagePart. */
	function _applyGlobalBonusDisplay(actor, rollData) {
		const actorData = actor.system;
		const monsterData = actor.flags.gmm.monster.data;

		const attack = _getGlobalAttackBonus(actorData, rollData);
		monsterData.attack_bonus.display = monsterData.attack_bonus.value + attack;
		monsterData.attack_bonus.note(attack, game.i18n.format('gmm.common.derived_source.global_attack_bonus'));

		const damage = monsterData.damage_per_action;
		const bonus = _getGlobalDamageBonus(actorData, rollData);
		damage.display = Math.ceil(damage.value + bonus.average);
		damage.display_dice = (bonus.formula && Roll.validate(damage.dice))
			? _appendFormula(damage.dice, bonus.formula)
			: damage.dice;
		damage.note(damage.display - damage.value, game.i18n.format('gmm.common.derived_source.global_damage_bonus'));
	}

	/* A block that reads "to Attacks/Spells" can only show what every action type gets, so an
	 * action-type-specific bonus (`bonuses.weapon.attack`, which DAE writes to mwak/rwak alone) is excluded. */
	function _getGlobalAttackBonus(actorData, rollData) {
		const bonuses = GMM_5E_ATTACK_ACTION_TYPES.map((x) => dnd5e.utils.simplifyBonus(CompatibilityHelpers.globalAttackBonus(actorData, x), rollData));
		// dnd5e 6.0 added an untyped sibling that every action type gets on top of its own.
		return Math.min(...bonuses) + dnd5e.utils.simplifyBonus(actorData.rolls?.attack?.bonus, rollData);
	}

	/* dnd5e pushes this onto the first damage part of an activity's roll, so the same least-common rule
	 * applies. References resolve here because nothing downstream that prints or rolls the formula has roll data. */
	function _getGlobalDamageBonus(actorData, rollData) {
		const bonuses = GMM_5E_ATTACK_ACTION_TYPES.map((x) => {
			const raw = String(CompatibilityHelpers.globalDamageBonus(actorData, x) ?? "").trim();
			const formula = Roll.replaceFormulaData(raw, rollData ?? {}, { missing: "0" });
			return { formula: formula, average: _averageOf(formula, rollData) };
		});
		return bonuses.reduce((a, b) => (b.average < a.average) ? b : a);
	}

	/* simplifyBonus reports 0 for the dice a damage bonus is most often written as, and the static face
	 * is an average already, so the midpoint is what belongs on it. */
	function _averageOf(formula, rollData) {
		if (!formula || /^0+$/.test(formula)) return 0;
		try {
			return (new Roll(formula, rollData).evaluateSync({ minimize: true }).total
				+ new Roll(formula, rollData).evaluateSync({ maximize: true }).total) / 2;
		} catch (error) {
			return 0;
		}
	}

	function _appendFormula(base, formula) {
		return /^[+-]/.test(formula) ? `${base} ${formula}` : `${base} + ${formula}`;
	}

	/* dnd5e keys every global attack bonus per action type. DAE's `system.bonuses.All-Attacks` writes all four. */
	const GMM_5E_ATTACK_ACTION_TYPES = ["mwak", "rwak", "msak", "rsak"];

	const GMM_PERCEPTION = GMM_5E_SKILLS.find((x) => x.name == "perception");

	/* A Change on one of these never reaches what the stat block prints. Each names the input that does. */
	const GMM_UNSUPPORTED_EFFECT_TARGETS = new Map([
		["flags.gmm.blueprint", { key: "gmm.effect.unsupported.blueprint" }],
		["system.attributes.hp.effectiveMax", { key: "gmm.effect.unsupported.hp_effective_max" }],
		["system.attributes.init.mod", { key: "gmm.effect.unsupported.init_mod" }],
		["system.attributes.init.prof", { key: "gmm.effect.unsupported.init_prof" }],
		["system.attributes.init.ability", { key: "gmm.effect.unsupported.init_ability" }],
		["system.attributes.encumbrance", { key: "gmm.effect.unsupported.encumbrance" }],
		["system.attributes.spellcasting", { key: "gmm.effect.unsupported.spellcasting" }],
		["system.attributes.spell.level", { key: "gmm.effect.unsupported.spell_level" }],
		["system.attributes.spell.dc", { key: "gmm.effect.unsupported.spell_dc" }],
		...GMM_5E_ABILITIES.map((x) => [`system.abilities.${x}.dc`,
			{ key: "gmm.effect.unsupported.ability_dc" }]),
		...GMM_5E_SKILLS.map((x) => [`system.skills.${x.foundry}.passive`,
			{ key: "gmm.effect.unsupported.skill_passive", data: { target: `system.skills.${x.foundry}.bonuses.passive` } }])
	]);
	const GMM_UNSUPPORTED_EFFECT_PREFIXES = [...GMM_UNSUPPORTED_EFFECT_TARGETS.keys()];
	const _reportedUnsupportedTargets = new Set();

	function _warnUnsupportedEffectTargets(actor) {
		if (typeof actor.allApplicableEffects !== "function") return;
		for (const effect of actor.allApplicableEffects()) {
			if (!effect.active) continue;
			for (const change of (effect.system?.changes ?? effect.changes ?? [])) {
				const prefix = GMM_UNSUPPORTED_EFFECT_PREFIXES.find((x) => change?.key?.startsWith(x));
				if (!prefix) continue;
				const id = `${actor.id}:${effect.id}:${change.key}`;
				if (_reportedUnsupportedTargets.has(id)) continue;
				_reportedUnsupportedTargets.add(id);
				const reason = GMM_UNSUPPORTED_EFFECT_TARGETS.get(prefix);
				console.warn(`GMM | ${game.i18n.format("gmm.effect.unsupported_target", {
					effect: effect.name,
					actor: actor.name,
					target: change.key,
					reason: game.i18n.format(reason.key, reason.data ?? {})
				})}`);
			}
		}
	}

	/* dnd5e resolves these from the bonus formulas in its own derived pass, so they arrive final. */
	function _collectCheckBonuses(actorData) {
		return Object.fromEntries(GMM_5E_ABILITIES.map((x) => [x, CompatibilityHelpers.preparedCheckBonus(actorData.abilities[x]) ?? 0]));
	}

	/* _parseSkills stamps the default ability, and dnd5e resolves the one the check actually uses. */
	function _stampSkillAbilities(actorData, monsterData) {
		GMM_5E_SKILLS.forEach((x) => {
			const node = monsterData.skills.find((y) => y.code == x.name);
			const ability = actorData.skills[x.foundry]?.ability;
			if (node && ability) node.ability = ability;
		});
	}

	/* A rolled total is the creature's own maximum once it exists. Until then the scaled average stands in for it. */
	function _resolveMaximumHitPoints(blueprint, attributes) {
		const rolled = Number(blueprint.data.hit_points.rolled_max) || 0;
		return (attributes.hit_points.use_formula && rolled) ? rolled : attributes.hit_points.maximum.value;
	}

	/* The only call site: a second one would read inputs the change phases have not settled yet. */
	function _forgeSettledArtifact(actor) {
		const actorData = actor.system;
		const monsterBlueprint = MonsterBlueprint.createFromActor(actor);
		_warnUnsupportedEffectTargets(actor);
		const checkBonuses = _collectCheckBonuses(actorData);
		const monsterArtifact = MonsterForge.createArtifact(monsterBlueprint, { checkBonuses: checkBonuses });

		const monsterData = monsterArtifact.data;
		actor.flags.gmm = {
			blueprint: monsterBlueprint,
			monster: monsterArtifact
		};

		// Replaces the pre-effect seed from the base pass. Every bonus formula below resolves against it.
		actor._gmmRollData = MonsterForge.createRollData(monsterBlueprint, monsterData);

		_stampSkillAbilities(actorData, monsterData);
		monsterData.armor_class.display = actorData.attributes.ac.value;

		// Field-wise, because replacing the init object would overwrite the `roll` mode dnd5e keeps beside these.
		actorData.attributes.init.prof = new Proficiency(0, 1);
		actorData.attributes.init.ability = monsterData.initiative.ability;
		actorData.attributes.init.mod = monsterData.initiative.value;

		actorData.attributes.encumbrance = {
			value: monsterData.inventory.weight.value,
			max: monsterData.inventory.capacity.value,
			pct: monsterData.inventory.encumbrance,
			encumbered: monsterData.inventory.encumbrance > (2 / 3),
			thresholds: {
				encumbered: monsterData.inventory.capacity.value * (1 / 3),
				heavilyEncumbered: monsterData.inventory.capacity.value * (2 / 3),
				maximum: monsterData.inventory.capacity.value
			},
			stops: {
				encumbered: (1 / 3),
				heavilyEncumbered: (2 / 3)
			}
		};
		const rollData = actor.getRollData({ deterministic: true });
		_stampSpellDcModifier(actor, rollData);

		/* dnd5e folds this into every ability's dc, so the printed row carries it or the two disagree. */
		monsterData.spellbook.spellcasting.dc.add(
			dnd5e.utils.simplifyBonus(actorData.bonuses?.spell?.dc, rollData),
			game.i18n.format('gmm.common.derived_source.spell_dc_bonus')
		);

		actorData.attributes.spellcasting = monsterData.spellbook.spellcasting.ability;
		dnd5e.dataModels?.actor?.AttributesFields?.prepareSpellcastingAbility?.call(actorData);

		actorData.attributes.spell ??= {};
		actorData.attributes.spell.level = monsterData.spellbook.spellcasting.level;
		actorData.attributes.spell.dc = monsterData.spellbook.spellcasting.dc.value;

		return { monsterData: monsterData, rollData: rollData };
	}

	/* The forge builds every node below from the blueprint's proficiency bonus and ability modifiers,
	 * either of which a Change in either phase can have moved by the time the schema settles. */
	function _reparseSettledDependents(actor, monsterData) {
		const actorData = actor.system;
		const proficiency = Number(actorData?.attributes?.prof);
		if (!Number.isFinite(proficiency)) return;
		// All three are stamped together, so any one missing means the base pass never ran for this actor.
		if (!Number.isFinite(actor._gmmBaseProf) || !actor._gmmBaseAbilityMods || !actor._gmmBaseSkillValue) return;

		const blueprint = actor.flags.gmm.blueprint;
		const abilityModifiers = {};
		const saveProficiencies = {};
		GMM_5E_ABILITIES.forEach((x) => {
			abilityModifiers[x] = Number(actorData.abilities[x]?.mod) || 0;
			saveProficiencies[x] = Number(CompatibilityHelpers.preparedSaveProf(actorData.abilities[x])?.multiplier) || 0;
		});
		// effectValue is the multiplier a Change left behind, before prepareSkill collapsed it.
		const moved = proficiency !== actor._gmmBaseProf
			|| GMM_5E_ABILITIES.some((x) => abilityModifiers[x] !== actor._gmmBaseAbilityMods[x])
			|| GMM_5E_ABILITIES.some((x) => saveProficiencies[x] !== (blueprint.data.trained_saves[x]?.trained ? 1 : 0))
			|| GMM_5E_SKILLS.some((x) => (actorData.skills[x.foundry]?.effectValue ?? 0) !== actor._gmmBaseSkillValue[x.foundry]);
		if (!moved) return;

		const builtInitiative = monsterData.initiative.value;

		/* dnd5e built each Proficiency from the bonus it held in the derived pass, and nothing rebuilds
		   one after the final phase. The artifact fold reads prof.flat, so this runs before it. */
		GMM_5E_SKILLS.forEach((x) => {
			const skill = actorData.skills[x.foundry];
			if (!skill?.prof) return;
			const flat = () => Number.isNumeric(skill.prof.term) ? skill.prof.flat : 0;
			const before = flat();
			skill.prof = new Proficiency(proficiency, skill.prof.multiplier, skill.prof.rounding !== "up");
			const delta = flat() - before;
			skill.total += delta;
			skill.passive += delta;
		});

		try {
			MonsterForge.reparseSettledDependents(monsterData, blueprint,
				{ proficiency: proficiency, abilityModifiers: abilityModifiers, saveProficiencies: saveProficiencies }, actor);
		} catch (error) {
			console.error(error);
			return;
		}

		if (actor._gmmRollData) {
			actor._gmmRollData.attackBonus = monsterData.attack_bonus.value;
			actor._gmmRollData.saveDc = monsterData.attack_dcs.primary.value + monsterData.ability_modifiers.max.value;
		}

		// By delta, not the node: _foldActorBonuses has already put init.bonus on that and the roll adds it itself.
		const initiativeDelta = monsterData.initiative.value - builtInitiative;
		if (initiativeDelta) {
			actorData.attributes.init.mod += initiativeDelta;
			actorData.attributes.init.total += initiativeDelta;
			actorData.attributes.init.score += initiativeDelta;
		}
		if (actorData.skills[GMM_PERCEPTION.foundry]) actorData.skills[GMM_PERCEPTION.foundry].passive = monsterData.passive_perception.value;
		if (actorData.attributes.spell) actorData.attributes.spell.dc = monsterData.spellbook.spellcasting.dc.value;

		GMM_5E_ABILITIES.forEach((x) => {
			const ability = actorData.abilities[x];
			const saveProf = new Proficiency(proficiency, saveProficiencies[x], CompatibilityHelpers.preparedSaveProf(ability).rounding !== "up");
			CompatibilityHelpers.setPreparedSaveProf(ability, saveProf);
			CompatibilityHelpers.setPreparedAttack(ability, proficiency, actor);
			// The save bonus already carries the forge's excess, so recomputing cannot lose it.
			ability.save.value = ability.mod + CompatibilityHelpers.preparedSaveBonus(ability)
				+ (Number.isNumeric(saveProf.term) ? saveProf.flat : 0) + (actor.conditionRollReduction ?? 0);
		});
	}

	/* Runs after both change phases, so everything GMMC derives from settled state is read here. */
	function _prepareMonsterSettledData(actor) {
		const hp = actor.system?.attributes?.hp;
		if (!hp) return;

		hp.effectiveMax = Math.max((hp.max ?? 0) + (hp.tempmax ?? 0), 0);
		const stored = actor._source?.system?.attributes?.hp?.value ?? hp.value;
		hp.value = Math.min(Number(stored) || 0, hp.effectiveMax);
		hp.damage = hp.effectiveMax - hp.value;
		hp.pct = CompatibilityHelpers.clamped(hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0, 0, 100);

		let monsterData;
		let rollData;
		try {
			({ monsterData, rollData } = _forgeSettledArtifact(actor));
		} catch (error) {
			console.error(error);
			return;
		}
		const hitPoints = monsterData.hit_points;

		// An NPC has no hp.bonuses, so every Change that can move the maximum lands on this one key.
		const delta = (hp.max ?? 0) - hitPoints.maximum.value;
		if (delta) hitPoints.maximum.add(delta, MonsterForge.settledSource(actor, "system.attributes.hp.max"));
		hitPoints.natural_maximum = hp.max;
		hitPoints.effective_maximum = hp.effectiveMax;
		hitPoints.temporary_maximum = hp.tempmax;
		hitPoints.current = hp.value;
		if (actor._gmmRollData) actor._gmmRollData.naturalMax = hp.max;

		try {
			_foldActorBonuses(actor, rollData);
			_reparseSettledDependents(actor, monsterData);
		} catch (error) {
			console.error(error);
		}

		try {
			_applyGlobalBonusDisplay(actor, rollData);
		} catch (error) {
			console.error(error);
		}

		try {
			MonsterForge.reconcileWithSettledActor(monsterData, actor.flags.gmm.blueprint, actor);
		} catch (error) {
			console.error(error);
		}

		ParagonDefenses.prepareDerivedData(actor);

		actor.items.contents.forEach((item) => {
			try {
				item.prepareShortcodes?.();
			} catch (e) {
				console.warn(`GMM | prepareShortcodes failed for item ${item.id}`, e);
			}
		});
	}

	function _getActorSheetId() {
		try {
			return this.getFlag("core", "sheetClass") || game.settings.get("core", "sheetClasses").Actor.npc;
		} catch (error) {
			return "";
		}
	}

	function _isGmmMonster() {
		return this.type === "npc" && this.getSheetId() === `${GMM_MODULE_TITLE}.MonsterSheet`;
	}

	return {
		patchActor5e: patchActor5e
	};
})();

export default GmmActor;
