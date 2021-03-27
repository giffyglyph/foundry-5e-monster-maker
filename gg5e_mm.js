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

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});