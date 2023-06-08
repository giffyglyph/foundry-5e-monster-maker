import GmmActor from './scripts/classes/GmmActor.js';
import GmmItem from './scripts/classes/GmmItem.js';
import MonsterSheet from './scripts/classes/MonsterSheet.js';
import ActionSheet from './scripts/classes/ActionSheet.js';
import Templates from './scripts/classes/Templates.js';
import { GMM_GUI_SKINS } from "./scripts/consts/GmmGuiSkins.js";
import { GMM_GUI_COLORS } from "./scripts/consts/GmmGuiColors.js";
import { GMM_GUI_LAYOUTS } from "./scripts/consts/GmmGuiLayouts.js";
import { GMM_MODULE_TITLE } from "./scripts/consts/GmmModuleTitle.js";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", function() {
	console.log(`Giffyglyph's 5e Monster Maker Continued | Initialising`);

	Actors.registerSheet(GMM_MODULE_TITLE, MonsterSheet, {
		types: ["npc"],
		label: "gmm.sheet.monster.label"
	});
	Items.registerSheet(GMM_MODULE_TITLE, ActionSheet, {
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

	_registerSettings();

	console.log(`Giffyglyph's 5e Monster Maker Continued | Initialised`);
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
	section.querySelector("[data-action='create-scaling-monster']").addEventListener("click", async (ev) => {
		Actor.create({
			name: "New Scaling Monster",
			type: "npc",
			img: "icons/svg/eye.svg",
			flags: { "core.sheetClass": `${GMM_MODULE_TITLE}.MonsterSheet` },
			system: {
				details: {
					"alignment": "unaligned",
					"type": {
						"value": "abberation"
					},
					"cr": 1
				}
			},
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
			flags: { "core.sheetClass": `${GMM_MODULE_TITLE}.ActionSheet` }
		});
	});
    const dirHeader = html[0].querySelector(".directory-header .header-search");
    dirHeader.parentNode.insertBefore(section, dirHeader);
}

function _registerSettings() {

	game.settings.register(GMM_MODULE_TITLE, "monsterLayout", {
		name: "Monster Menu Layout",
		scope: "world",
		config: true,
		default: "slide-out",
		type: String,
		choices: Object.fromEntries(GMM_GUI_LAYOUTS.monster.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterArtifactSkin", {
		name: "Monster Artifact Skin",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.monster.artifact.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterBlueprintSkin", {
		name: "Monster Blueprint Skin",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.monster.blueprint.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterPrimaryColor", {
		name: "Monster Primary Color",
		scope: "world",
		config: true,
		default: "blue",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterSecondaryColor", {
		name: "Monster Secondary Color",
		scope: "world",
		config: true,
		default: "orange",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionLayout", {
		name: "Action Menu Layout",
		scope: "world",
		config: true,
		default: "slide-out",
		type: String,
		choices: Object.fromEntries(GMM_GUI_LAYOUTS.action.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionArtifactSkin", {
		name: "Action Artifact Skin",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.action.artifact.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionBlueprintSkin", {
		name: "Action Blueprint Skin",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.action.blueprint.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionPrimaryColor", {
		name: "Action Primary Color",
		scope: "world",
		config: true,
		default: "blue-gray",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionSecondaryColor", {
		name: "Action Secondary Color",
		scope: "world",
		config: true,
		default: "amber",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});
}
