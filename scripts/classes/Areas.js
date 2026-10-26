import Activities from './Activities.js';
import AutomationHelpers from './AutomationHelpers.js';
import CompatibilityHelpers from './CompatibilityHelpers.js';
import Durations from './Durations.js';
import Zones from './Zones.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

/* dnd5e honors `flags.dnd5e.dependentOn` through a mixin it never puts on a Region, so a placed area
   never registers itself and nothing ever deletes it. */
const Areas = (function () {

	const GMM_AREA_CLOCK_FLAG = "areaClock";

	function init() {
		Hooks.on("createRegion", _onCreateRegion);
		Hooks.on("updateRegion", _track);
		Hooks.on("deleteRegion", _onDeleteRegion);
		Hooks.on("preCreateActiveEffect", _keepLifetime);
		Hooks.on("updateActiveEffect", _onUpdateActiveEffect);
		Hooks.once("ready", _trackExisting);
	}

	/* dnd5e 6.0 repurposes `origin` to the casting token and moves the activity onto its own flag. */
	function _gmmActivityUuid(region) {
		const uuid = region?.getFlag?.("dnd5e", "activity") ?? region?.getFlag?.("dnd5e", "origin");
		if (typeof uuid !== "string") return null;
		return Activities.isGmmActivityId(uuid.split(".Activity.")[1]) ? uuid : null;
	}

	function _track(region) {
		if (!game.user?.isGM) return;
		const owner = region?.getFlag?.("dnd5e", "dependentOn");
		if (typeof owner !== "string" || !_gmmActivityUuid(region)) return;
		dnd5e?.registry?.dependents?.track(owner, region);
	}

	function _isAreaClock(effect) {
		return !!effect?.flags?.[GMM_MODULE_TITLE]?.[GMM_AREA_CLOCK_FLAG];
	}

	function _onDeleteRegion(region) {
		if (!game.user?.isGM) return;
		const owner = region?.getFlag?.("dnd5e", "dependentOn");
		if (typeof owner !== "string") return;
		dnd5e?.registry?.dependents?.untrack(owner, region);
		_deleteClock(region, owner).catch(e => console.warn("GMM | Deleting an area clock failed", e));
	}

	/* A clock owns one area, so the area going by any route takes the clock with it. */
	async function _deleteClock(region, owner) {
		if (!game.users.activeGM?.isSelf) return;
		const clock = fromUuidSync(owner);
		if (!_isAreaClock(clock)) return;
		if (clock.getFlag(GMM_MODULE_TITLE, GMM_AREA_CLOCK_FLAG)?.region !== region.uuid) return;
		await clock.delete();
	}

	/* dnd5e 6 stamps `turnStart` on a blank in-combat effect */
	function _keepLifetime(effect, data) {
		if (!_isAreaClock(effect)) return;
		const expiry = data?.duration?.expiry ?? null;
		if (effect.duration.expiry === expiry) return;
		effect.updateSource({ "duration.expiry": expiry });
	}

	/* A world left on the default expiry action marks the clock rather than deleting it, and only a
	   delete reaches the area. */
	function _onUpdateActiveEffect(effect) {
		if (!game.users.activeGM?.isSelf || !_isAreaClock(effect)) return;
		if (effect.active || effect.disabled) return;
		if (_systemDeletesExpired(effect)) return;
		effect.delete().catch(e => console.warn("GMM | Deleting an expired area clock failed", e));
	}

	/* dnd5e 6 deletes an expired effect itself when its actor is out of combat, and a second delete
	   raises a server error. */
	function _systemDeletesExpired(effect) {
		if (!CompatibilityHelpers.dnd5eAtLeast(6)) return false;
		const combat = effect.start?.combat ?? game.combat;
		return !combat?.getCombatantsByActor?.(effect.parent)?.length;
	}

	function _onCreateRegion(region) {
		_track(region);
		_declareOwner(region).catch(e => console.warn("GMM | Declaring an area's owner failed", e));
		Zones.attach(region, _gmmActivityUuid(region)).catch(e => console.warn("GMM | Attaching a zone failed", e));
	}

	/* midi declares a concentration owner itself and writes the same value.  */
	async function _declareOwner(region) {
		if (!game.users.activeGM?.isSelf || region.getFlag("dnd5e", "dependentOn")) return;
		const uuid = _gmmActivityUuid(region);
		if (!uuid) return;
		const item = AutomationHelpers.resolveSourceItem(uuid);
		const concentration = AutomationHelpers.concentrationFor(item?.actor, item?.id);
		if (concentration) {
			await region.setFlag("dnd5e", "dependentOn", concentration.uuid);
			return;
		}
		const clock = await _buildClock(region, item, uuid);
		if (clock) await region.setFlag("dnd5e", "dependentOn", clock.uuid);
	}

	function _midiCleansUp() {
		if (!game.modules.get("midi-qol")?.active) return false;
		return !!globalThis.MidiQOL?.configSettings?.()?.autoRemoveTemplate;
	}

	/* An area needs one source-side document whose ending is its own, and concentration is that
	   document wherever there is one. */
	async function _buildClock(region, item, activityUuid) {
		if (_midiCleansUp()) return null;
		const actor = item?.actor;
		const activity = item?.system?.activities?.get?.(activityUuid.split(".Activity.")[1]);
		const duration = Durations.areaLifetime(activity?.duration);
		if (!actor || !duration) return null;

		const data = {
			name: item.name,
			img: item.img,
			origin: item.uuid,
			duration,
			transfer: false,
			flags: { [GMM_MODULE_TITLE]: { [GMM_AREA_CLOCK_FLAG]: { region: region.uuid } } }
		};
		// Core keys the start to whoever was acting when the effect began, which need not be the scaler.
		const combatant = game.combat?.started ? game.combat.getCombatantsByActor(actor)?.[0] : null;
		const start = combatant ? CONFIG.ActiveEffect.documentClass.getEffectStart?.() : null;
		if (start) data.start = { ...start, combatant: combatant.id, initiative: combatant.initiative ?? null };

		const [clock] = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
		return clock ?? null;
	}

	/* An area outlives the session that placed it, and nothing refills the registry on a reload. */
	function _trackExisting() {
		for (const scene of game.scenes ?? []) {
			for (const region of scene.regions ?? []) _track(region);
		}
	}

	return {
		init: init
	};
})();

export default Areas;
