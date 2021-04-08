import Gui from "./scripts/classes/Gui.js";
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

	Gui.registerHandlebarsHelpers();
	Gui.preloadHandlebarsTemplates();

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});