import GmmActor from './scripts/classes/GmmActor.js';
import GmmItem from './scripts/classes/GmmItem.js';
import MonsterSheet from './scripts/classes/MonsterSheet.js';
import ActionSheet from './scripts/classes/ActionSheet.js';
import Templates from './scripts/classes/Templates.js';
import Activities from './scripts/classes/Activities.js';
import ActionBlueprint from './scripts/classes/ActionBlueprint.js';
import MonsterBlueprint from './scripts/classes/MonsterBlueprint.js';
import ParagonPower from './scripts/classes/ParagonPower.js';
import ParagonDefenses from './scripts/classes/ParagonDefenses.js';
import Auras from './scripts/classes/Auras.js';
import Conditions from './scripts/classes/Conditions.js';
import Boons from './scripts/classes/Boons.js';
import Exhaustion from './scripts/classes/Exhaustion.js';
import Rolls from './scripts/classes/Rolls.js';
import Deferrals from './scripts/classes/Deferrals.js';
import DeferralCountdown from './scripts/classes/DeferralCountdown.js';
import DeferralCountdownSettings from './scripts/classes/DeferralCountdownSettings.js';
import Durations from './scripts/classes/Durations.js';
import Areas from './scripts/classes/Areas.js';
import MissDamage from './scripts/classes/MissDamage.js';
import Shortcoder from './scripts/classes/Shortcoder.js';
import AutomationHelpers from './scripts/classes/AutomationHelpers.js';
import { GMM_GUI_SKINS } from "./scripts/consts/GmmGuiSkins.js";
import { GMM_GUI_COLORS } from "./scripts/consts/GmmGuiColors.js";
import { GMM_GUI_LAYOUTS } from "./scripts/consts/GmmGuiLayouts.js";
import { GMM_MODULE_TITLE } from "./scripts/consts/GmmModuleTitle.js";
import {
	GMM_DEFERRAL_COUNTDOWN_DEFAULTS,
	GMM_DEFERRAL_COUNTDOWN_MENU,
	GMM_DEFERRAL_COUNTDOWN_SETTING
} from "./scripts/consts/GmmDeferralCountdown.js";

Hooks.once("init", function() {
	console.log(`Giffyglyph's 5e Monster Maker Continued | Initializing`);

	_applyTokenCompatibilityShim();

	const ActorsRef = foundry?.documents?.collections?.Actors ?? globalThis.Actors;
	const ItemsRef = foundry?.documents?.collections?.Items ?? globalThis.Items;
	if (ActorsRef?.registerSheet) {
		ActorsRef.registerSheet(GMM_MODULE_TITLE, MonsterSheet, {
			types: ["npc"],
			label: "gmm.sheet.monster.label"
		});
	}
	if (ItemsRef?.registerSheet) {
		ItemsRef.registerSheet(GMM_MODULE_TITLE, ActionSheet, {
			types: ["feat", "weapon"],
			label: "gmm.sheet.action.label"
		});
	}

	Templates.preloadTemplates();
	Templates.registerTemplateHelpers();

	GmmActor.patchActor5e();
	GmmItem.patchItem5e();
	ParagonPower.init();
	ParagonDefenses.init();
	Deferrals.init();
	DeferralCountdown.init();
	Durations.init();
	Areas.init();
	Auras.init();
	MissDamage.init();
	Exhaustion.init();
	Conditions.init();

	// Backward-compatible API used by legacy migration scripts/macros.
	const moduleRef = game.modules.get(GMM_MODULE_TITLE);
	if (moduleRef) {
		moduleRef.api ??= {};
		moduleRef.api.convertAbilitiesToActivities = (blueprintData) => {
			if (!blueprintData) return [];
			const activity = Activities.buildActivityData({ data: blueprintData });
			return activity ? [activity] : [];
		};
		// Reachable from a macro, so it is API.
		moduleRef.api.spendParagonDefense = ParagonDefenses.spendParagonDefense;
	}

	Conditions.registerApi();
	Boons.registerApi();
	Rolls.registerApi();

	// The persistent cleanup is migrateWorld's job. This only keeps a stored shortcode from throwing at load.
	if (!Activities.patchActivityField()) {
		console.warn("GMM | dnd5e BaseActivityData not found at init. The activity-source sanitization patch was not installed.");
	}

	Hooks.on("updateSetting", (setting, data, options, userId) => {
		if ( setting.key === "core.sheetClasses" ) {
			game.actors.forEach(x => x.reset());
			game.items.forEach(x => x.reset());
			game.scenes.forEach(x => x.tokens.forEach(y => y.actor?.reset()));
		}
	});

	// v13+ sidebar directories are ApplicationV2, so the hook signature is `(app, element)`, not the old `html` jQuery arg.
	Hooks.on("renderActorDirectory", (app, element) => {
		if (game.user.isGM) {
			_hookActorDirectory(element);
		}
	});

	Hooks.on("renderItemDirectory", (app, element) => {
		if (game.user.isGM) {
			_hookItemDirectory(element);
		}
	});
	const daeFlags = _generateFlags();
	Hooks.on('dae.setFieldData', (fieldData) => {
		fieldData.GMM = daeFlags;
	});

	_registerSettings();

	Hooks.on("preCreateItem", (item, data, _options, _userId) => {
		try {
			const update = Activities.buildPreCreateUpdate(data, item);
			if (update) item.updateSource(foundry.utils.expandObject(update));
		} catch (e) {
			console.warn("GMM | preCreateItem activity-seed failed", e);
		}
	});

	Hooks.on("preCreateItem", (item, _data, _options, _userId) => {
		try {
			const rebind = AutomationHelpers.rebindSelfItemUses(item._source);
			if (rebind) item.updateSource(rebind);
		} catch (e) {
			console.warn("GMM | ItemUses rebind failed", e);
		}
	});

	Hooks.on("preCreateItem", (item, _data, _options, _userId) => {
		try {
			const sort = _defaultSortFor(item);
			if (sort !== null) item.updateSource({ sort: sort });
		} catch (e) {
			console.warn("GMM | default item sort failed", e);
		}
	});

	// Items embedded during actor creation never reach preCreateItem.
	Hooks.on("preCreateActor", (actor, _data, _options, _userId) => {
		try {
			const items = actor._source?.items;
			if (!Array.isArray(items) || !items.length) return;
			let bound = false;
			const rebound = items.map(itemData => {
				const rebind = AutomationHelpers.rebindSelfItemUses(itemData);
				if (!rebind) return itemData;
				bound = true;
				return foundry.utils.mergeObject(itemData, rebind, { inplace: false });
			});
			if (bound) actor.updateSource({ items: rebound });
		} catch (e) {
			console.warn("GMM | ItemUses rebind failed", e);
		}
	});

	// One combined update, because re-issuing separately would re-trigger this hook.
	Hooks.on("preUpdateItem", (item, change, options, _userId) => {
		if (options?.gmmConvertingFromVanilla || options?.gmmRevertingToVanilla) return;
		try {
			if (_isSheetSwitchFromGmm(item, change)) {
				_revertToVanilla(item, change, options).catch(e => {
					console.warn("GMM | GMMC->vanilla revert failed", e);
				});
				return false;
			}
			if (_isSheetSwitchToGmm(item, change)) {
				// A reverted item still has a blueprint. Re-convert from it instead of re-deriving from vanilla.
				if (item.flags?.gmm?.blueprint) {
					_reconvertToScaling(item, change, options).catch(e => {
						console.warn("GMM | GMMC re-conversion failed", e);
					});
					return false;
				}
				const activities = item.system?.activities;
				const activityCount = activities?.size
					?? (Array.isArray(activities) ? activities.length : (activities ? Object.keys(activities).length : 0));
				const isDestructive = activityCount > 0;
				_confirmAndConvertVanillaItem(item, change, options, isDestructive).catch(e => {
					console.warn("GMM | vanilla->GMMC conversion failed", e);
				});
				return false;
			}
		} catch (e) {
			console.warn("GMM | preUpdateItem conversion check failed", e);
		}
	});

	Hooks.on("preUpdateItem", (item, change, options, _userId) => {
		if (options?.gmmConvertingFromVanilla || options?.gmmRevertingToVanilla) return;
		try {
			_warnAboutDoubledBonus(item, change);
		} catch (e) {
			console.warn("GMM | doubled-bonus check failed", e);
		}
	});

	/* No builder can delete an embedded document, so a forged effect the blueprint no longer asks for is
	   disposed of here. Gated on the acting client, so two owners do not race the same deletion. */
	Hooks.on("preUpdateItem", (item, change, options, _userId) => {
		try {
			const rarity = change.flags?.gmm?.blueprint?.data?.rarity;
			const renamed = ("name" in change) && (change.name !== item.name);
			const rerarified = (rarity !== undefined) && (rarity !== item.flags?.gmm?.blueprint?.data?.rarity);
			if (renamed || rerarified) options.gmmReorder = true;
		} catch (e) {
			console.warn("GMM | default item re-sort check failed", e);
		}
	});

	Hooks.on("updateItem", (item, change, options, userId) => {
		if ((game.user.id !== userId) || !options.gmmReorder || ("sort" in change)) return;
		try {
			const sort = _defaultSortFor(item);
			if ((sort !== null) && (sort !== item.sort)) {
				item.update({ sort: sort }).catch(e => console.warn("GMM | default item re-sort failed", e));
			}
		} catch (e) {
			console.warn("GMM | default item re-sort failed", e);
		}
	});

	Hooks.on("updateItem", (item, _change, _options, userId) => {
		if (game.user.id !== userId) return;
		try {
			const ids = [Activities.strandedDoomClock(item), Activities.strandedDurationCarrier(item)]
				.filter(effect => effect)
				.map(effect => effect.id);
			if (ids.length) {
				item.deleteEmbeddedDocuments("ActiveEffect", ids)
					.catch(e => console.warn("GMM | stranded forged-effect cleanup failed", e));
			}
		} catch (e) {
			console.warn("GMM | stranded forged-effect check failed", e);
		}
	});

	// The forge's effect lists are built at render time, so nothing else brings them up to date.
	const _rerenderForEffect = (effect) => {
		try {
			const parent = effect?.parent;
			if (!parent) return;
			const actor = parent.documentName === "Actor" ? parent : parent.actor;
			if (!actor) return;
			const sheet = actor.sheet;
			if (sheet instanceof MonsterSheet && sheet.rendered) sheet.render(false);
		} catch (e) {
			console.warn("GMM | active-effect re-render failed", e);
		}
	};
	Hooks.on("createActiveEffect", _rerenderForEffect);
	Hooks.on("updateActiveEffect", _rerenderForEffect);
	Hooks.on("deleteActiveEffect", _rerenderForEffect);

	// Anywhere but the forge's own duration carrier, a shortcode reaches the target verbatim.
	const _warnAboutShortcodes = (effect, data) => {
		try {
			if (Durations.isDurationEffect(effect)) return;
			const parent = effect?.parent;
			const authoredOnScaler = (parent?.documentName === "Actor")
				? _isGmmMonster(parent)
				: (_isGmmMonster(parent?.actor) || parent?.getSheetId?.() === `${GMM_MODULE_TITLE}.ActionSheet`);
			if (!authoredOnScaler) return;

			for (const change of (data?.system?.changes ?? data?.changes ?? [])) {
				for (const code of Shortcoder.findShortcodes(change?.value)) {
					const suggestion = Shortcoder.suggestRollData(code);
					const message = game.i18n.format(
						suggestion ? "gmm.effect.shortcode_not_resolved" : "gmm.effect.shortcode_no_equivalent",
						{ name: effect.name, key: change.key, code: code, suggestion: suggestion }
					);
					ui.notifications?.warn(message);
					console.warn(`GMM | ${message}`);
				}
			}
		} catch (e) {
			console.warn("GMM | shortcode check on effect failed", e);
		}
	};
	Hooks.on("preCreateActiveEffect", _warnAboutShortcodes);
	Hooks.on("preUpdateActiveEffect", _warnAboutShortcodes);

	Hooks.on("createActor", (actor, _options, userId) => {
		if (game.userId !== userId) return;
		_syncScalingMonsterHp(actor, { force: true }).catch(e => console.warn("GMM | HP sync on create failed", e));
		_syncParagonDefenses(actor).catch(e => console.warn("GMM | Paragon defense sync on create failed", e));
	});
	// Foundry auto-follows a synced prototype-token image on an actor rename, but not the name. Mirror that here.
	Hooks.on("preUpdateActor", (actor, change) => {
		if (!_isGmmMonster(actor)) return;
		const nextName = change?.name;
		if ((typeof nextName !== "string") || !nextName.trim() || (nextName === actor.name)) return;
		if (foundry.utils.hasProperty(change, "prototypeToken.name")) return;
		if (actor.prototypeToken?.name !== actor.name) return;
		foundry.utils.setProperty(change, "prototypeToken.name", nextName);
	});
	Hooks.on("updateActor", (actor, change, _options, userId) => {
		if (game.userId !== userId) return;
		// A sheet-class switch to the monster sheet is a conversion. Force current HP to full.
		const convertedToGmm = foundry.utils.getProperty(change ?? {}, "flags.core.sheetClass") === `${GMM_MODULE_TITLE}.MonsterSheet`;
		_syncScalingMonsterHp(actor, { force: convertedToGmm }).catch(e => console.warn("GMM | HP sync on update failed", e));
		_syncParagonDefenses(actor).catch(e => console.warn("GMM | Paragon defense sync on update failed", e));
	});

	console.log(`Giffyglyph's 5e Monster Maker Continued | Initialized`);
});


Hooks.once('ready', async () => {
	_applyTokenCompatibilityShim();

	if (!game.modules.get('lib-wrapper')?.active && game.user.isGM) {
		ui.notifications.error("Module Giffyglyph's Monster Maker Continued requires the 'libWrapper' module. Please install and activate it.");
	}

	if (!Activities.verifyActivitySanitizer()) {
		console.error("GMM | Activity-source sanitization did not fire. dnd5e has moved the activity clean seam.");
		if (game.user.isGM) ui.notifications.error(game.i18n.localize("gmm.activity.sanitizer_orphaned"));
	}

	if (game.user.isGM) {
		try {
			await Activities.migrateWorld();
		} catch (e) {
			console.error("GMM | Activity migration encountered an error", e);
		}
		try {
			await _normalizeItemSorts();
		} catch (e) {
			console.error("GMM | Item sort normalization encountered an error", e);
		}
	}
});

/* Writes the order the sheet was already printing, so a world gains sort values without moving a row. */
async function _normalizeItemSorts() {
	if (game.settings.get(GMM_MODULE_TITLE, "itemSortsNormalized")) return;

	let total = 0;
	for (const actor of (game.actors ?? [])) {
		if (!actor.isOwner) continue;
		if (actor.getSheetId?.() !== `${GMM_MODULE_TITLE}.MonsterSheet`) continue;
		try {
			const updates = MonsterBlueprint.normalizeItemSorts(actor);
			if (!updates.length) continue;
			await actor.updateEmbeddedDocuments("Item", updates);
			total += updates.length;
		} catch (e) {
			console.warn(`GMM | Item sort normalization failed for actor ${actor.name} (${actor.id})`, e);
		}
	}

	await game.settings.set(GMM_MODULE_TITLE, "itemSortsNormalized", true);
	if (total > 0) console.log(`GMM | Normalized the list order of ${total} scaling-monster item(s).`);
}

function _defaultSortFor(item) {
	const actor = item?.parent;
	if (!actor || (actor.documentName !== "Actor")) return null;
	if (actor.type !== "npc") return null;
	if (actor.getSheetId?.() !== `${GMM_MODULE_TITLE}.MonsterSheet`) return null;

	const category = item.getSortingCategory?.();
	if (!MonsterBlueprint.isSortedCategory(category)) return null;

	const rarity = item.flags?.gmm?.blueprint?.data?.rarity;
	const orderKey = { name: item.name ? item.name : "", rarity: rarity ? rarity : "" };
	return MonsterBlueprint.getDefaultSort(actor, category, orderKey, item.id);
}

/* True when a preUpdateItem change binds the sheet to the GMMC ActionSheet from a different sheet. */
function _isSheetSwitchToGmm(item, change) {
	const target = `${GMM_MODULE_TITLE}.ActionSheet`;
	const newSheet = foundry.utils.getProperty(change ?? {}, "flags.core.sheetClass");
	if (newSheet !== target) return false;
	const currentSheet = item?.flags?.core?.sheetClass;
	return currentSheet !== target;
}

/* Away means another sheet, the default, or the flag being deleted outright. */
function _isSheetSwitchFromGmm(item, change) {
	const target = `${GMM_MODULE_TITLE}.ActionSheet`;
	if ((item?.flags?.core?.sheetClass) !== target) return false;
	const c = change ?? {};
	// Reset-to-default forms: `flags.core.-=sheetClass` or the whole `flags.core` being cleared.
	if (foundry.utils.getProperty(c, "flags.core.-=sheetClass") === null) return true;
	if (foundry.utils.getProperty(c, "flags.core") === null) return true;
	const newSheet = foundry.utils.getProperty(c, "flags.core.sheetClass");
	if (newSheet === undefined) return false;
	return newSheet !== target;
}

/* The authored Attack Modifier lands on top of the to-hit or the DC GMMC already built from the monster.
   A shortcode for a term already in there is therefore counted twice. */
function _doubledBonusCodes(activityType, relatedStat) {
	const mod = `${relatedStat || "max"}Mod`;
	if (activityType === "save") return ["dcPrimaryBonus", "saveDc", mod];
	// A blank stat leaves the ability mod to dnd5e, which this field does not land on top of.
	if (activityType === "attack") return relatedStat ? ["attackBonus", mod] : ["attackBonus"];
	return [];
}

function _warnAboutDoubledBonus(item, change) {
	const readAttack = (field) => {
		const path = `flags.gmm.blueprint.data.attack.${field}`;
		const incoming = foundry.utils.getProperty(change ?? {}, path);
		return (incoming === undefined) ? foundry.utils.getProperty(item, path) : incoming;
	};

	const bonus = foundry.utils.getProperty(change ?? {}, "flags.gmm.blueprint.data.attack.bonus");
	if ((typeof bonus !== "string") || !bonus.includes("[")) return;
	// The sheet submits the whole blueprint every time. An unchanged field would otherwise warn on every save.
	if (bonus === (item?.flags?.gmm?.blueprint?.data?.attack?.bonus ?? "")) return;

	const typed = Shortcoder.findShortcodes(bonus);
	const activityType = Activities.activityTypeFor(readAttack("type"));
	for (const code of _doubledBonusCodes(activityType, readAttack("related_stat"))) {
		if (!typed.includes(code)) continue;
		const message = game.i18n.format(
			`gmm.action.blueprint.attack.bonus_doubles_${activityType === "save" ? "dc" : "attack"}`,
			{ code: code }
		);
		ui.notifications?.warn(message);
		console.warn(`GMM | ${message}`);
	}
}

/* First-time conversion: everything lands in one update so the hook is not re-entered. */
async function _confirmAndConvertVanillaItem(item, originalChange, originalOptions, isDestructive = true) {
	// Only prompt when there are activities to replace. Trait items with none convert silently.
	if (isDestructive) {
		const ConfirmDialog = foundry?.applications?.api?.DialogV2;
		let confirmed = false;
		if (ConfirmDialog?.confirm) {
			const name = foundry.utils.escapeHTML?.(item.name) ?? item.name;
			confirmed = await ConfirmDialog.confirm({
				window: { title: game.i18n.localize("gmm.action.convert.title") },
				content: game.i18n.format("gmm.action.convert.content", { name }),
				rejectClose: false,
				modal: true
			});
		} else {
			confirmed = window.confirm(game.i18n.format("gmm.action.convert.confirm", { name: item.name }));
		}
		if (!confirmed) return;
	}

	// A JSON string, not an object: a deep-merged re-snapshot would resurrect deleted activities.
	const savedActivities = JSON.stringify(Activities.snapshotActivities(item));

	const blueprint = ActionBlueprint.deriveFromVanillaItem(item);
	// `buildActivityUpdate` alone would skip the description rewrite and leave vanilla enricher markup.
	const update = foundry.utils.mergeObject(
		foundry.utils.deepClone(originalChange ?? {}),
		{
			flags: { gmm: { blueprint, savedActivities } },
			...ActionBlueprint.getItemDataFromBlueprint(blueprint, item),
			...Activities.buildForeignActivityPurge(item)
		},
		{ inplace: false }
	);
	const passOptions = foundry.utils.mergeObject(
		foundry.utils.deepClone(originalOptions ?? {}),
		{ gmmConvertingFromVanilla: true },
		{ inplace: false }
	);
	await item.update(update, passOptions);
	console.log(`GMM | Converted item ${item.name} (${item.id}) from vanilla to scaling action.`);
}

/* Re-conversion keeps both sets of edits: the preserved blueprint and the current activities. */
async function _reconvertToScaling(item, originalChange, originalOptions) {
	const blueprint = item.flags.gmm.blueprint;
	const savedActivities = JSON.stringify(Activities.snapshotActivities(item));
	const update = foundry.utils.mergeObject(
		foundry.utils.deepClone(originalChange ?? {}),
		{
			// A later rebuild must not read a stash this update has already consumed.
			flags: { gmm: { savedActivities, savedGmmActivities: "{}" } },
			...Activities.buildActivityUpdate(item, blueprint),
			...Activities.buildForeignActivityPurge(item)
		},
		{ inplace: false }
	);
	const passOptions = foundry.utils.mergeObject(
		foundry.utils.deepClone(originalOptions ?? {}),
		{ gmmConvertingFromVanilla: true },
		{ inplace: false }
	);
	await item.update(update, passOptions);
	console.log(`GMM | Re-converted item ${item.name} (${item.id}) to scaling action from preserved blueprint.`);
}

/* The GMM flags are kept, so the item can be toggled back. */
async function _revertToVanilla(item, originalChange, originalOptions) {
	const update = foundry.utils.mergeObject(
		foundry.utils.deepClone(originalChange ?? {}),
		Activities.buildRestoreUpdate(item),
		{ inplace: false }
	);
	const passOptions = foundry.utils.mergeObject(
		foundry.utils.deepClone(originalOptions ?? {}),
		{ gmmRevertingToVanilla: true },
		{ inplace: false }
	);
	await item.update(update, passOptions);
	console.log(`GMM | Reverted item ${item.name} (${item.id}) to vanilla; scaling data preserved in flags.`);
}

function _isGmmMonster(actor) {
	return !!actor?.isGmmMonster?.();
}

/* `appliedMax` lives in the module flag scope because `flags.gmm` is rebuilt each prepareData. */
async function _syncScalingMonsterHp(actor, { force = false } = {}) {
	if (!_isGmmMonster(actor)) return;
	if (!actor.system?.attributes?.hp) return;
	// Formula HP is owned by the sheet's "Roll HP" button, which sets current and max together.
	if (actor.flags?.gmm?.monster?.data?.hit_points?.use_formula) return;
	if (!Number.isFinite(actor._gmmBaseMax)) return;

	const max = Math.max(1, actor._gmmBaseMax);
	const appliedMax = actor.getFlag(GMM_MODULE_TITLE, "appliedMax");

	if (force || (appliedMax !== undefined && appliedMax !== max)) {
		await actor.update({
			"system.attributes.hp.value": max,
			[`flags.${GMM_MODULE_TITLE}.appliedMax`]: max
		});
	} else if (appliedMax === undefined) {
		// First sighting: track the max without touching current HP, so an existing damaged monster isn't healed.
		await actor.setFlag(GMM_MODULE_TITLE, "appliedMax", max);
	}
}

async function _syncParagonDefenses(actor) {
	if (!_isGmmMonster(actor)) return;
	const paragonDefenses = actor.flags?.gmm?.monster?.data?.paragon_defenses;
	if (!paragonDefenses) return;

	const max = Number(paragonDefenses.maximum?.value) || 0;
	const applied = actor.getFlag(GMM_MODULE_TITLE, "appliedParagonDefenses");
	if (applied === max) return;

	const update = { [`flags.${GMM_MODULE_TITLE}.appliedParagonDefenses`]: max };
	if ((applied !== undefined) || (paragonDefenses.current ?? null) === null) {
		update["flags.gmm.blueprint.data.paragon_defenses.current"] = max;
	}
	await actor.update(update);
}

function _generateFlags() {
	const moduleFlagScope = `flags.gmm`;
	const moduleFlags = new Set([
	]);
	return Array.from(moduleFlags).filter((key) => key.startsWith(`${moduleFlagScope}.`));
}

function _applyTokenCompatibilityShim() {
	// dnd5e SaveActivity still uses the global `Token`, whose getter is deprecated on v13.
	try {
		// Not needed on Foundry v14+ and can fail because global `Token` is non-configurable there.
		if ((game.release?.generation ?? 0) >= 14) return;

		const TokenClass = foundry?.canvas?.placeables?.Token;
		if (!TokenClass) return;

		const desc = Object.getOwnPropertyDescriptor(globalThis, "Token");
		if (desc?.value === TokenClass) return;
		// Some runtimes expose `Token` as a locked global. Treat that as already handled.
		if (desc && !desc.configurable) return;

		try { Reflect.deleteProperty(globalThis, "Token"); } catch (_e) { /* ignore */ }

		Object.defineProperty(globalThis, "Token", {
			value: TokenClass,
			writable: true,
			configurable: true
		});
	} catch (e) {
		console.warn("GMM | Token compatibility shim failed", e);
	}
}

function _findDirectoryInsertionPoint(root) {
	if (!root?.querySelector) return null;
	const header = root.querySelector(".directory-header");
	if (!header) return null;
	const before = header.querySelector("search") ?? header.querySelector(".header-search");
	return { header, before };
}

async function _hookActorDirectory(html) {
	const target = _findDirectoryInsertionPoint(html);
	if (!target) return;
	let section = document.createElement("div");
	section.classList.add("header-actions", "action-buttons", "flexrow", "giffyglyph");
	section.insertAdjacentHTML(
		"afterbegin",
		`
			<div class="btn-group">
				<button type="button" data-action="create-scaling-monster"><i class="fas fa-skull"></i> ${game.i18n.format('gmm.sidebar.create_monster')}</button>
			</div>
		`
	);
	section.querySelector("[data-action='create-scaling-monster']").addEventListener("click", async (ev) => {
		ev.preventDefault();
		// Nested flags object: Foundry reads the bound sheet at `flags.core.sheetClass`, not a flat key.
		Actor.create({
			name: "New Scaling Monster",
			type: "npc",
			img: "icons/svg/eye.svg",
			flags: { core: { sheetClass: `${GMM_MODULE_TITLE}.MonsterSheet` } },
			system: {
				details: {
					alignment: "unaligned",
					type: { value: "humanoid" },
					cr: 1
				}
			}
		});
	});
	if (target.before) target.header.insertBefore(section, target.before);
	else target.header.appendChild(section);
}

async function _hookItemDirectory(html) {
	const target = _findDirectoryInsertionPoint(html);
	if (!target) return;
	let section = document.createElement("div");
	section.classList.add("header-actions", "action-buttons", "flexrow", "giffyglyph");
	section.insertAdjacentHTML(
		"afterbegin",
		`
			<div class="btn-group">
				<button type="button" data-action="create-scaling-action"><i class="fas fa-skull"></i> ${game.i18n.format('gmm.sidebar.create_action')}</button>
			</div>
		`
	);
	section.querySelector("[data-action='create-scaling-action']").addEventListener("click", (ev) => {
		ev.preventDefault();
		Item.create({
			name: "New Scaling Action",
			type: "feat",
			img: "icons/svg/clockwork.svg",
			flags: { core: { sheetClass: `${GMM_MODULE_TITLE}.ActionSheet` } }
		});
	});
	if (target.before) target.header.insertBefore(section, target.before);
	else target.header.appendChild(section);
}

function _registerSettings() {

	// One-shot. Re-running it would throw away every order a GM has since dragged.
	game.settings.register(GMM_MODULE_TITLE, "itemSortsNormalized", {
		scope: "world",
		config: false,
		default: false,
		type: Boolean
	});

	game.settings.register(GMM_MODULE_TITLE, "trackParagonActions", {
		name: "gmm.settings.track_paragon_actions.name",
		hint: "gmm.settings.track_paragon_actions.hint",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});

	game.settings.register(GMM_MODULE_TITLE, "trackParagonDefenses", {
		name: "gmm.settings.track_paragon_defenses.name",
		hint: "gmm.settings.track_paragon_defenses.hint",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});

	game.settings.register(GMM_MODULE_TITLE, "automateDeferrals", {
		name: "gmm.settings.automate_deferrals.name",
		hint: "gmm.settings.automate_deferrals.hint",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});

	game.settings.registerMenu(GMM_MODULE_TITLE, GMM_DEFERRAL_COUNTDOWN_MENU, {
		name: "gmm.settings.deferral_countdown.name",
		hint: "gmm.settings.deferral_countdown.hint",
		label: "gmm.settings.deferral_countdown.label",
		icon: "fas fa-stopwatch",
		type: DeferralCountdownSettings,
		restricted: true
	});

	game.settings.register(GMM_MODULE_TITLE, GMM_DEFERRAL_COUNTDOWN_SETTING, {
		scope: "world",
		config: false,
		default: { ...GMM_DEFERRAL_COUNTDOWN_DEFAULTS },
		type: Object,
		// Nothing marks a token dirty when a setting changes. Every client has to follow the GM's.
		onChange: () => DeferralCountdown.repaintAll()
	});

	game.settings.register(GMM_MODULE_TITLE, "automateDurations", {
		name: "gmm.settings.automate_durations.name",
		hint: "gmm.settings.automate_durations.hint",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterLayout", {
		name: "gmm.settings.monster_layout.name",
		scope: "world",
		config: true,
		default: "slide-out",
		type: String,
		choices: Object.fromEntries(GMM_GUI_LAYOUTS.monster.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterArtifactSkin", {
		name: "gmm.settings.monster_artifact_skin.name",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.monster.artifact.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterBlueprintSkin", {
		name: "gmm.settings.monster_blueprint_skin.name",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.monster.blueprint.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterPrimaryColor", {
		name: "gmm.settings.monster_primary_color.name",
		scope: "world",
		config: true,
		default: "blue",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "monsterSecondaryColor", {
		name: "gmm.settings.monster_secondary_color.name",
		scope: "world",
		config: true,
		default: "orange",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionLayout", {
		name: "gmm.settings.action_layout.name",
		scope: "world",
		config: true,
		default: "slide-out",
		type: String,
		choices: Object.fromEntries(GMM_GUI_LAYOUTS.action.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionArtifactSkin", {
		name: "gmm.settings.action_artifact_skin.name",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.action.artifact.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionBlueprintSkin", {
		name: "gmm.settings.action_blueprint_skin.name",
		scope: "world",
		config: true,
		default: "vanity",
		type: String,
		choices: Object.fromEntries(GMM_GUI_SKINS.action.blueprint.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionPrimaryColor", {
		name: "gmm.settings.action_primary_color.name",
		scope: "world",
		config: true,
		default: "blue-gray",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});

	game.settings.register(GMM_MODULE_TITLE, "actionSecondaryColor", {
		name: "gmm.settings.action_secondary_color.name",
		scope: "world",
		config: true,
		default: "amber",
		type: String,
		choices: Object.fromEntries(GMM_GUI_COLORS.map((x) => [ x.code, x.name]))
	});
}
