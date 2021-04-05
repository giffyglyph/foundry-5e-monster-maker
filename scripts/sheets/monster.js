import { MONSTER_RANKS } from "../consts/monster_ranks.js"
import { MONSTER_ROLES } from "../consts/monster_roles.js"

import Frankenstein from "../helpers/frankenstein.js";
import Ui from "../helpers/ui.js";

export default class ActorSheetMonster extends ActorSheet {

	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["gg5e-mm-window gg5e-mm-window--monster"],
				height: 900,
				width: 540,
				template: 'modules/giffyglyphs-5e-monster-maker/templates/sheets/monster.html',
				resizable: true
			}
		);
	}

    getData() {
        const data = super.getData();

		let ui = Object.assign({}, Ui.getDefaultUi(), this._getDefaultUi(), data.data.gg5e_mm ? data.data.gg5e_mm.ui : null);
		let blueprint = Object.assign({}, Frankenstein.getDefaultBlueprint(), data.data.gg5e_mm ? data.data.gg5e_mm.blueprint : null);
		if (blueprint.combat.rank.modifiers == null) {
			blueprint.combat.rank.modifiers = MONSTER_RANKS[blueprint.combat.rank.type];
		}
		if (blueprint.combat.role.modifiers == null) {
			blueprint.combat.role.modifiers = MONSTER_ROLES[blueprint.combat.role.type];
		}

		data.data.gg5e_mm = {
			ui: ui,
			blueprint: blueprint,
			monster: Frankenstein.createMonster(blueprint)
		};

        return data;
    }

	activateListeners(html) {
		super.activateListeners(html);
		Ui.activateListeners(html);
		html.find('.toggle-mode--edit').click(this._toggleModeEdit.bind(this));
	}

	_toggleModeEdit(event) {
		const li = event.currentTarget.closest(".gg5e-mm-window");
		li.classList.toggle("expanded");
	}

	_getDefaultUi() {
		return {
			accordions: {
				accordion_builder: 0
			},
			panels: {
				panel_abilities: true
			}
		}
	}

  /** @override */
  _updateObject(event, form) {

	if (form["name"].trim().length == 0) {
		form["name"] = "Monster";
	}

	if (form["data.gg5e_mm.blueprint.saving_throws.method"] === "sync") {
		form["data.gg5e_mm.blueprint.saving_throws.ranking"] = form["data.gg5e_mm.blueprint.ability_modifiers.ranking"];
	}

	if (event.currentTarget && event.currentTarget.name) {
		switch (event.currentTarget.name) {
			case "data.gg5e_mm.blueprint.combat.rank.type":
				for (const key in form) {
					if (/\.rank\.modifiers/.test(key)) delete form[key];
				}
				form["data.gg5e_mm.blueprint.combat.rank.custom_name"] = null;
				form["data.gg5e_mm.blueprint.combat.rank.modifiers"] = null;
				break;
			case "data.gg5e_mm.blueprint.combat.role.type":
				for (const key in form) {
					if (/\.role\.modifiers/.test(key)) delete form[key];
				}
				form["data.gg5e_mm.blueprint.combat.role.custom_name"] = null;
				form["data.gg5e_mm.blueprint.combat.role.modifiers"] = null;
				break;
		}
	}

    super._updateObject(event, form);
  }
}
