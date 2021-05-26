import GmmActor from './scripts/classes/GmmActor.js';
import GmmItem from './scripts/classes/GmmItem.js';
import MonsterSheet from './scripts/classes/MonsterSheet.js';
import ActionSheet from './scripts/classes/ActionSheet.js';
import Templates from './scripts/classes/Templates.js';

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`Giffyglyph's 5e Monster Maker | Initialising`);

	Actors.registerSheet("gmm", MonsterSheet, {
		types: ["npc"],
		label: "gmm.sheet.monster.label"
	});
	Items.registerSheet("gmm", ActionSheet, {
		label: "gmm.sheet.action.label"
	  });

	Templates.preloadTemplates();
	Templates.registerTemplateHelpers();

	GmmActor.patchActor5e();
	GmmItem.patchItem5e();

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});
