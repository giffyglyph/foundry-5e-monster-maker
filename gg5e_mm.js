import { preloadHandlebarsTemplates } from "./scripts/templates/templates.js";

import ActorSheetMonster from './scripts/sheets/monster.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`Giffyglyph's 5e Monster Maker | Initialising`);

	Actors.registerSheet("gqq", ActorSheetMonster, {
		types: ["npc"],
		label: "gg5e_mm.sheet.monster.label"
	});

	// Register handlebars helpers
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

	preloadHandlebarsTemplates();

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});