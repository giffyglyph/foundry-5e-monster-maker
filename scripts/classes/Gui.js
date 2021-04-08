import { DEFAULT_GUI } from "../consts/DefaultGui.js";

const Gui = (function() {

    function activateListeners(html) {
        html.find('.gg5e-mm-accordion .accordion-section__header').click((e) => _toggleAccordionCollapse(e));
		html.find('.gg5e-mm-panel.panel--collapsible .panel__header').click((e) => _togglePanelCollapse(e));
		html.find('button.move-up').click((e) => _moveUp(e));
		html.find('button.move-down').click((e) => _moveDown(e));
    }

	function prepareGui(...data) {
		return $.extend(true, {}, DEFAULT_GUI, ...data);
	}

	async function preloadHandlebarsTemplates() {

		return loadTemplates([
		  "modules/giffyglyphs-5e-monster-maker/templates/partials/monster_ability_ranking.html",
		  "modules/giffyglyphs-5e-monster-maker/templates/partials/monster_save_ranking.html",
		  "modules/giffyglyphs-5e-monster-maker/templates/partials/monster_options.html",
		  "modules/giffyglyphs-5e-monster-maker/templates/partials/monster_view.html"
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

		Handlebars.registerHelper('persistAccordion', function(index, options) {
			let html = options.fn(this);
			if (index !== null) {
				let regexp = new RegExp(`accordion-section" data-section="${index}"`, 'gi');
				html = html.replace(regexp, `accordion-section opened" data-section="${index}"`);
			}
			return html;
		});

		Handlebars.registerHelper('persistPanel', function(isOpen, options) {
			let html = options.fn(this);
			if (!isOpen || isOpen === "false") {
				html = html.replace(/panel--collapsible/g, "panel--collapsible closed");
			}
			return html;
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
	}

    function _togglePanelCollapse(event) {
		const li = event.currentTarget.closest(".gg5e-mm-panel");
		const panelId = li.id.replace(/-/g, '_');
		const isOpen = !li.classList.contains("closed");
		$(li).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.gui.data.panels.${panelId}']`).val(!isOpen).trigger("change");
	}

	function _toggleAccordionCollapse(event) {
		const li = event.currentTarget.closest(".accordion-section");
		const accordion = event.currentTarget.closest(".gg5e-mm-accordion");
		const accordionId = accordion.id.replace(/-/g, '_');
		const index = (li.classList.contains("opened") ? null : li.getAttribute("data-section"));
		$(li).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.gui.data.accordions.${accordionId}']`).val(index).trigger("change");
	}

	function _moveUp(event) {
		console.log("OIAJWD");
		const li = event.currentTarget.closest('.move-parent');
		if(li.previousElementSibling) {
    		li.parentNode.insertBefore(li, li.previousElementSibling);
		}
	}

	function _moveDown(event) {
		const li = event.currentTarget.closest('.move-parent');
		if(li.nextElementSibling) {
    		li.parentNode.insertBefore(li.nextElementSibling, li);
		}
	}

	return {
		activateListeners: activateListeners,
		prepareGui: prepareGui,
		preloadHandlebarsTemplates: preloadHandlebarsTemplates,
		registerHandlebarsHelpers: registerHandlebarsHelpers
	};
})();

export default Gui;