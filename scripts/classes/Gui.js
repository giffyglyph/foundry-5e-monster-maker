import { DEFAULT_GUI } from "../consts/DefaultGui.js";

const Gui = (function() {

	function activateListeners(html) {
		html.find('.gg5e-mm-accordion .accordion-section__header').click((e) => _toggleAccordionCollapse(e));
		html.find('.gg5e-mm-panel.panel--collapsible .panel__header').click((e) => _togglePanelCollapse(e));
		html.find('button.move-up').click((e) => _moveUp(e));
		html.find('button.move-down').click((e) => _moveDown(e));
		html.find('button[data-action="open-modal"]').click((e) => _openModal(e));
		html.find('button[data-action="close-modal"]').click((e) => closeModal(e));
	}

	function setAccordions(html, accordions) {
		if (accordions) {
			for (const [key, value] of Object.entries(accordions)) {
				let accordion = html.find(`#${key.replace("_", "-")}`);
				if (value) {
					value.split(",").forEach((x) => accordion.find(`[data-section='${x.trim()}']`).addClass("opened"));
				}
			}
		}
	}

	function setPanels(html, panels) {
		if (panels) {
			for (const [key, value] of Object.entries(panels)) {
				if (value === "closed") {
					html.find(`#${key.replace("_", "-")}`).addClass("closed");
				}
			}
		}
	}

	function setScrollbars(html, scrollbars) {
		if (scrollbars) {
			for (const [key, value] of Object.entries(scrollbars)) {
				html.find(`#${key.replace("_", "-")}`).scrollLeft(value.x);
				html.find(`#${key.replace("_", "-")}`).scrollTop(value.y);
			}
		}
	}

	function prepareGui(...data) {
		return $.extend(true, {}, DEFAULT_GUI, ...data);
	}

	async function preloadHandlebarsTemplates() {

		return loadTemplates([
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/ability_ranking.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/condition_immunity.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/damage_immunity.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/damage_resistance.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/damage_vulnerability.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/language.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/monster_modifier.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/save_ranking.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/skill.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/about.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/ability_check.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/basic_attack_ac.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/basic_attack_save.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/basic_damage.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/modifiers.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/modifying_abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/ranked_abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/saving_throw.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/tags.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/armor_class.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/attack_bonus.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/attack_dcs.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/combat.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/condition_immunities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/cr.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/damage_immunities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/damage_resistances.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/damage_vulnerabilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/damage.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/description.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/hit_points.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/initiative.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/languages.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/perception.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/proficiency.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/saving_throws.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/senses.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/skills.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/speeds.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/options/xp.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/view/abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/view/blocks.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/view/header.html"
		]);
	};

	function registerHandlebarsHelpers() {

		Handlebars.registerHelper('concat', function(...args) {
			return args.slice(0, -1).join('');
		});

		Handlebars.registerHelper('eq', function(a, b) {
			return a === b;
		});

		Handlebars.registerHelper('strlen', function(str) {
			return String(str).length;
		});

		Handlebars.registerHelper('toggleCustom', function(showCustom, options) {
			let html = options.fn(this);
			if (showCustom !== "custom") {
				html = html.replace(/input /g, "input type='hidden'");
			}
			return html;
		});

		Handlebars.registerHelper('repeat', function(n, block) {
			var accum = '';
			for(var i = 0; i < n; ++i)
				accum += block.fn(i);
			return accum;
		});

		Handlebars.registerHelper('for', function(from, to, incr, block) {
			var accum = '';
			for(var i = from; i < to; i += incr)
				accum += block.fn(i);
			return accum;
		});

		Handlebars.registerHelper('parseSources', function(sources) {
			if (sources) {
				return sources.map((x) => {
					return game.i18n.format('gg5e_mm.monster.source.from', { value: x.value, source: x.source });
				}).join(",&#010;");
			} else {
				return "";
			}
		});

		Handlebars.registerHelper('getSkillProficiency', function(skills, code) {
			if (skills) {
				const skill = skills.find((x) => x.code == code);
				return (skill) ? skill.value : 0;
			} else {
				return 0;
			}
		});

		Handlebars.registerHelper('formatChallengeRating', function(cr) {
			switch (cr) {
				case 0.125:
					return "1/8";
					break;
				case 0.25:
					return "1/4";
					break;
				case 0.5:
					return "1/2";
					break;
				default:
					return cr;
					break;
			}
		});
	}

	function _openModal(event) {
		const button = event.currentTarget.closest("button");
		const modal = $(button).closest(".gg5e-mm-window").find(`#${button.dataset.modal}`)
		if (modal) {
			modal.addClass("open");
		}
	}

	function closeModal(event) {
		const modal = event.currentTarget.closest(".gg5e-mm-modal");
		modal.classList.remove("open");
	}

	function _togglePanelCollapse(event) {
		const panel = event.currentTarget.closest(".gg5e-mm-panel");
		const panelId = panel.id.replace(/-/g, '_');
		const newState = panel.classList.contains("closed") ? "opened" : "closed";
		$(panel).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.gui.data.panels.${panelId}']`).val(newState).trigger("change");
	}

	function _toggleAccordionCollapse(event) {
		const accordion = event.currentTarget.closest(".gg5e-mm-accordion");
		const accordionId = accordion.id.replace(/-/g, '_');
		const section = event.currentTarget.closest(".accordion-section");
		let index = "";
		if (accordion.getAttribute("data-accordion-mode") == "single") {
			index = section.classList.contains("opened") ? "" : section.getAttribute("data-section");
		} else {
			section.classList.toggle("opened");
			index = [...accordion.querySelectorAll(".accordion-section.opened")].map((x) => x.getAttribute("data-section")).join(",");
		}
		$(accordion).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.gui.data.accordions.${accordionId}']`).val(index).trigger("change");
	}

	function _moveUp(event) {
		const li = event.currentTarget.closest('.move-parent');
		if (li.previousElementSibling) {
			li.parentNode.insertBefore(li, li.previousElementSibling);
		}
	}

	function _moveDown(event) {
		const li = event.currentTarget.closest('.move-parent');
		if (li.nextElementSibling) {
			li.parentNode.insertBefore(li.nextElementSibling, li);
		}
	}

	return {
		activateListeners: activateListeners,
		setAccordions: setAccordions,
		setPanels: setPanels,
		setScrollbars: setScrollbars,
		prepareGui: prepareGui,
		preloadHandlebarsTemplates: preloadHandlebarsTemplates,
		registerHandlebarsHelpers: registerHandlebarsHelpers,
		closeModal: closeModal
	};
})();

export default Gui;