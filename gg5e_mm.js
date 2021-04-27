import Templates from "./scripts/classes/Templates.js";
import ActorSheetMonster from './scripts/sheets/ActorSheetMonster.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`Giffyglyph's 5e Monster Maker | Initialising`);

	Actors.registerSheet("gqq", ActorSheetMonster, {
		types: ["npc"],
		label: "gg5e_mm.sheet.monster.label"
	});

	Templates.preloadTemplates();
	Templates.registerTemplateHelpers();

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});