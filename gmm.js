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

	// Reprepare actor/item data when the default sheet is changed
	Hooks.on("updateSetting", (setting, data, options, userId) => {
		if ( setting.key === "core.sheetClasses" ) {
			game.actors.forEach(x => x.prepareData());
			game.items.forEach(x => x.prepareData());
			game.scenes.forEach(x => x.tokens.forEach(y => y.actor.prepareData()));
		}
	});

	Hooks.on("renderActorDirectory", (app, html, data) => {
		if (game.user.isGM) {
			_hookActorDirectory(html);
		}
	});

	Hooks.on("renderItemDirectory", (app, html, data) => {
		if (game.user.isGM) {
			_hookItemDirectory(html);
		}
	});

	console.log(`Giffyglyph's 5e Monster Maker | Initialised`);
});

async function _hookActorDirectory(html) {
    let section = document.createElement("div");
    section.classList.add("header-actions", "action-buttons", "flexrow", "giffyglyph");
	section.insertAdjacentHTML(
		"afterbegin",
		`
			<div class="btn-group">
				<button data-action="create-scaling-monster"><i class="fas fa-skull"></i> ${game.i18n.format('gmm.sidebar.create_monster')}</button>
			</div>
		`
    );
	section.querySelector("[data-action='create-scaling-monster']").addEventListener("click", (ev) => {
		Actor.create({
			name: "New Scaling Monster",
			type: "npc",
			img: "icons/svg/eye.svg",
			flags: { "core.sheetClass": "gmm.MonsterSheet" }
		});
	});
    const dirHeader = html[0].querySelector(".directory-header .header-search");
    dirHeader.parentNode.insertBefore(section, dirHeader);
}

async function _hookItemDirectory(html) {
    let section = document.createElement("div");
    section.classList.add("header-actions", "action-buttons", "flexrow", "giffyglyph");
	section.insertAdjacentHTML(
		"afterbegin",
		`
			<div class="btn-group">
				<button data-action="create-scaling-action"><i class="fas fa-skull"></i> ${game.i18n.format('gmm.sidebar.create_action')}</button>
			</div>
		`
    );
	section.querySelector("[data-action='create-scaling-action']").addEventListener("click", (ev) => {
		Item.create({
			name: "New Scaling Action",
			type: "feat",
			img: "icons/svg/clockwork.svg",
			flags: { "core.sheetClass": "gmm.ActionSheet" }
		});
	});
    const dirHeader = html[0].querySelector(".directory-header .header-search");
    dirHeader.parentNode.insertBefore(section, dirHeader);
}
