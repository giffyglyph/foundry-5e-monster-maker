import MonsterBlueprint from './MonsterBlueprint.js';
import MonsterForge from './MonsterForge.js';
import { GMM_5E_ABILITIES } from "../consts/Gmm5eAbilities.js";
import { GMM_5E_SKILLS } from '../consts/Gmm5eSkills.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

/**
 * A patcher which controls actor data based on the selected sheet.
 */
const GmmActor = (function () {
	//import Proficiency from '../../../../systems/dnd5e/module/actor/proficiency.js';
	function Proficiency(...args) {
		return new dnd5e.documents.Proficiency(...args);
	}
	/**
	 * Patch the Foundry Actor5e entity to control how data is prepared based on the active sheet.
	 */
	function patchActor5e() {
		libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Actor5e.prototype.prepareBaseData', function (wrapped, ...args) {
			if (this.type == "npc" && this.getSheetId() == `${GMM_MODULE_TITLE}.MonsterSheet`) {
				wrapped(...args);
				_prepareMonsterBaseData(this);
			} else {
				wrapped(...args);
			}
		}, 'WRAPPER');
		libWrapper.register('giffyglyph-monster-maker-continued', 'game.dnd5e.documents.Actor5e.prototype.prepareDerivedData', function (wrapped, ...args) {
			if (this.type == "npc" && this.getSheetId() == `${GMM_MODULE_TITLE}.MonsterSheet`) {
				wrapped(...args);
				_prepareMonsterDerivedData(this);
				_postProcessData(this);
			} else {
				wrapped(...args);
			}
		}, 'WRAPPER');

		game.dnd5e.documents.Actor5e.prototype.prepare5eBaseData = game.dnd5e.documents.Actor5e.prototype.prepareBaseData;
		//game.dnd5e.documents.Actor5e.prototype.prepareBaseData = _prepareBaseData;
		game.dnd5e.documents.Actor5e.prototype.prepare5eDerivedData = game.dnd5e.documents.Actor5e.prototype.prepareDerivedData;
		//game.dnd5e.documents.Actor5e.prototype.prepareDerivedData = _prepareDerivedData;
		game.dnd5e.documents.Actor5e.prototype.getSheetId = _getActorSheetId;
	}

	/**
	 * Prepare any data which is actor-specific and does not depend on Items or Active Effects.
	 * @private
	 */
	/*
	function _prepareBaseData() {
		if (this.type == "npc" && this.getSheetId() == `${GMM_MODULE_TITLE}.MonsterSheet`) {
			game.dnd5e.documents.Actor5e.prototype.prepare5eBaseData.call(this);
			_prepareMonsterBaseData(this);
		} else {
			game.dnd5e.documents.Actor5e.prototype.prepare5eBaseData.call(this);
		}
	}*/

	/**
	 * Apply final transformations to the current actor after all effects have been applied.
	 * @private
	 */
	/*
	function _prepareDerivedData() {
		if (this.type == "npc" && this.getSheetId() == `${GMM_MODULE_TITLE}.MonsterSheet`) {
			game.dnd5e.documents.Actor5e.prototype.prepare5eDerivedData.call(this);
			_prepareMonsterDerivedData(this);
		} else {
			game.dnd5e.documents.Actor5e.prototype.prepare5eDerivedData.call(this);
		}
	}*/

	/**
	 * Prepare any data which is actor-specific and does not depend on Items or Active Effects.
	 * @param {Object} actor - An Actor5e entity.
	 * @private
	 */
	function _prepareMonsterBaseData(actor) {
		const actorData = actor.system;
		const monsterBlueprint = MonsterBlueprint.createFromActor(actor);
		const monsterArtifact = MonsterForge.createArtifact(monsterBlueprint);
		const monsterData = monsterArtifact.data;
		actorData.attributes.ac.calc = "natural";
		actorData.attributes.ac.flat = monsterData.armor_class.value;
		actorData.attributes.ac.base = monsterData.armor_class.value;
		
	}
	function _postProcessData(actor) {
		const actorData = actor.system;
		const monsterBlueprint = actor.flags.gmm.blueprint;
		const monsterArtifact = actor.flags.gmm.monster;
		const monsterData = monsterArtifact.data;
		GMM_5E_SKILLS.forEach((x) => {
			let monsterSkill = monsterData.skills.find((y) => y.code == x.name);
			if(monsterSkill)
				monsterSkill.add(Number(actorData.skills[x.foundry].bonuses.check) ?? 0, "bonus");
			if (x.name === "perception" && actorData.skills[x.foundry].bonuses.passive)
				monsterData.passive_perception.add(Number(actorData.skills[x.foundry].bonuses.passive) ?? 0, "passive bonus");
				
		});
		GMM_5E_ABILITIES.forEach((x) => {
			monsterData.saving_throws[x].add(Number(actorData.abilities[x].bonuses.save) ?? 0, "bonus");
			//TODO: Deprecated, split in to ability + check mod
			//monsterData.ability_modifiers[x].setValue(actorData.abilities[x].mod, "bonus");
		});
		monsterData.initiative.applyModifier(actorData.attributes.init.bonus, false);
	}
	/**
	 * Prepare any derived data which is actor-specific and does not depend on Items or Active Effects.
	 * @param {Object} actor - An Actor5e entity.
	 * @private
	 */
	function _prepareMonsterDerivedData(actor) {
		try {
			const actorData = actor.system;
			const monsterBlueprint = MonsterBlueprint.createFromActor(actor);
			const monsterArtifact = MonsterForge.createArtifact(monsterBlueprint);
			const monsterData = monsterArtifact.data;
			actor.flags.gmm = {
				blueprint: monsterBlueprint,
				monster: monsterArtifact
			};

			GMM_5E_ABILITIES.forEach((x) => {
                actorData.abilities[x].value = monsterData.ability_modifiers[x].score;
                actorData.abilities[x].mod = monsterData.ability_modifiers[x].value;
                actorData.abilities[x].proficient = false;
                //actorData.abilities[x].prof = 0;
				actorData.abilities[x].saveProf = new Proficiency(monsterBlueprint.data.trained_saves[x].trained ? 2 : 0, 1);
				actorData.abilities[x].checkProf = new Proficiency(0, 1);
				//actorData.abilities[x].bonuses.save = (monsterData.saving_throws[x].value - monsterData.ability_modifiers[x].value);
                //actorData.abilities[x].saveBonus = 0;
                //actorData.abilities[x].checkBonus = 0;
				actorData.abilities[x].save = monsterData.saving_throws[x].value;
				if (monsterBlueprint.data.trained_saves[x].trained) {
					actorData.abilities[x].saveBonus = monsterData.proficiency_bonus.value;
					actorData.abilities[x].proficient = true;
				}
                actorData.abilities[x].dc = 8 + monsterData.ability_modifiers[x].value;
            });

			GMM_5E_SKILLS.forEach((x) => {
				let monsterSkill = monsterData.skills.find((y) => y.code == x.name);
				actorData.skills[x.foundry].value = 0;
				actorData.skills[x.foundry].bonus = 0;
				actorData.skills[x.foundry].mod = monsterData.ability_modifiers[actorData.skills[x.foundry].ability].value;
				actorData.skills[x.foundry].prof = new Proficiency(monsterSkill ? monsterSkill.value : 0, 1);
				actorData.skills[x.foundry].total = actorData.skills[x.foundry].mod + actorData.skills[x.foundry].prof;
				if (x.name == "perception") {
					actorData.skills[x.foundry].passive = monsterData.passive_perception.value;
				} else {
					actorData.skills[x.foundry].passive = 10 + actorData.skills[x.foundry].total;
				}
			});

			actorData.details.cr = monsterData.challenge_rating.value;
			actorData.details.xp.value = monsterData.xp.value;
			actorData.attributes.prof = monsterData.proficiency_bonus.value;
			//actorData.attributes.ac.calc = "natural";
			//actorData.attributes.ac.flat = monsterData.armor_class.value;
			//actorData.attributes.ac.base = monsterData.armor_class.value;
			//actorData.attributes.ac.value = monsterData.armor_class.value + actorData.attributes.ac.bonus;
			monsterData.armor_class.display = actorData.attributes.ac.value;

			if (!monsterData.hit_points.use_formula) {
				actorData.attributes.hp.max = monsterData.hit_points.maximum.value;
			}
			actorData.attributes.init = {
				prof: new Proficiency(0, 1),
				ability: monsterData.initiative.ability,
				mod: monsterData.initiative.value,
				bonus: actorData.attributes.init.bonus
			};
			actorData.attributes.hp.formula = monsterData.hit_points.formula ? monsterData.hit_points.formula : '';
			
			actorData.attributes.encumbrance = {
				value: monsterData.inventory.weight.value,
				max: monsterData.inventory.capacity.value,
				pct: monsterData.inventory.encumbrance,
				encumbered: monsterData.inventory.encumbrance > (2/3)
			};
			actorData.attributes.spellcasting = monsterData.spellbook.spellcasting.ability;
			actorData.details.spellLevel = monsterData.spellbook.spellcasting.level;
			actorData.attributes.spelldc = monsterData.spellbook.spellcasting.dc.value;

			// Compute owned item attributes which depend on prepared Actor data
			actor.items.contents.forEach((item) => {
				item.getSaveDC();
				item.getAttackToHit();
				item.prepareShortcodes();
			});
		} catch (error) {
			console.error(error);
		}
	}

	/**
	 * Get the active sheet id for a specified actor.
	 * @param {Object} actor - An Actor5e entity.
	 * @returns {String} - A sheet id.
	 * @private
	 */
	function _getActorSheetId() {
		try {
			return this.getFlag("core", "sheetClass") || game.settings.get("core", "sheetClasses").Actor.npc;
		} catch (error) {
			return "";
		}
	}

	return {
		patchActor5e: patchActor5e
	};
})();

export default GmmActor;
