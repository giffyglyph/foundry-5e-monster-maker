import ActorGmm from './scripts/classes/ActorGmm.js';
import ActorSheetMonster from './scripts/classes/ActorSheetMonster.js';
import Templates from './scripts/classes/Templates.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`Giffyglyph's 5e Monster Maker | Initialising`);

	Actors.registerSheet("gmm", ActorSheetMonster, {
		types: ["npc"],
		label: "gmm.sheet.monster.label"
	});

	Templates.preloadTemplates();
	Templates.registerTemplateHelpers();

	ActorGmm.patchActor5e();

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});
