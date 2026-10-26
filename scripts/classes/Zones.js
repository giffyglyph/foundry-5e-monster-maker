import Activities from './Activities.js';
import AutomationHelpers from './AutomationHelpers.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';
import { GMM_ZONE_TERRAIN } from '../consts/GmmZoneTerrain.js';

const MIDI_ID = "midi-qol";
const ERB_ID = "enhanced-region-behavior";
const TERRAIN_PACK = `${GMM_MODULE_TITLE}.gmm-effects`;

const MIDI_BEHAVIOR = `${MIDI_ID}.regionActivity`;
const ERB_BEHAVIOR = `${ERB_ID}.Trap`;

const MIDI_TRIGGERS = { enter: "entry", exit: "exit", turn_start: "turnStart", turn_end: "turnEnd" };
const REGION_EVENTS = { enter: "tokenEnter", exit: "tokenExit", turn_start: "tokenTurnStart", turn_end: "tokenTurnEnd" };

/* midi's own three-valued filter. Enemies means any disposition other than the scaler's. */
const DISPOSITION_FILTERS = { any: 0, ally: 1, enemy: -1 };

/* A Zone is authored provider-neutrally, so nothing before this point knows which module answers. */
const Zones = (function () {

	let _terrainEffects = null;

	function _active(id) {
		return !!game.modules?.get?.(id)?.active;
	}

	/* Placed areas outnumber Zones heavily, so nothing is looked up until one turns up. */
	async function _terrainEffectUuids(categories) {
		if (!categories.length) return [];
		if (!_terrainEffects) {
			_terrainEffects = new Map();
			const pack = game.packs?.get?.(TERRAIN_PACK);
			const index = pack ? await pack.getIndex({ fields: ["flags.gmm.terrain"] }) : [];
			for (const entry of index) {
				const category = entry?.flags?.gmm?.terrain;
				if (category) _terrainEffects.set(category, entry.uuid ?? pack.getUuid(entry._id));
			}
		}
		return categories.map(c => _terrainEffects.get(c)).filter(x => x);
	}

	function _sourceDisposition(item) {
		const actor = item?.actor;
		const token = actor?.getActiveTokens?.(false, true)?.[0] ?? actor?.token ?? actor?.prototypeToken;
		const disposition = token?.disposition;
		return Number.isFinite(disposition) ? disposition : null;
	}

	/* dnd5e filters on absolute disposition, so the relative rule has to be computed here. An
	 * unplaced scaler has no side, and reaching everyone beats reaching backwards. */
	function _ignoredDispositions(audience, disposition) {
		if (audience === "any" || disposition === null) return [];
		const all = [
			CONST.TOKEN_DISPOSITIONS.HOSTILE,
			CONST.TOKEN_DISPOSITIONS.NEUTRAL,
			CONST.TOKEN_DISPOSITIONS.FRIENDLY
		];
		return audience === "enemy" ? [disposition] : all.filter(d => d !== disposition);
	}

	function _named(item, key) {
		return game.i18n.format(`gmm.zone.behavior.${key}`, { name: item?.name ?? "" });
	}

	function _stamped(data) {
		return { ...data, flags: { [GMM_MODULE_TITLE]: { zone: true } } };
	}

	function _routes(zone) {
		const seen = new Set();
		for (const entry of zone.terrain) seen.add(GMM_ZONE_TERRAIN[entry.category]);
		return seen;
	}

	function _terrainBehaviors(item, zone, uuids) {
		const out = [];
		const routes = _routes(zone);

		if (routes.has("difficult") && CONFIG.RegionBehavior?.dataModels?.["dnd5e.difficultTerrain"]) {
			out.push(_stamped({
				type: "dnd5e.difficultTerrain",
				name: _named(item, "difficult"),
				// No blueprint field says whether a Zone is magical, so the schema's own default stands.
				system: { ignoredDispositions: _ignoredDispositions(zone.audience, _sourceDisposition(item)) }
			}));
		}

		// Both darkness modifiers reach the same behavior, so two of them are still one document.
		if (routes.has("darkness")) {
			out.push(_stamped({
				type: "adjustDarknessLevel",
				name: _named(item, "darkness"),
				system: {
					mode: CONFIG.RegionBehavior?.dataModels?.adjustDarknessLevel?.MODES?.OVERRIDE ?? 0,
					modifier: 1
				}
			}));
		}

		if (uuids.length) {
			out.push(_stamped({
				type: "applyActiveEffect",
				name: _named(item, "terrain"),
				system: { effects: uuids }
			}));
		}

		return out;
	}

	function _midiBehavior(item, zone, rules, activity) {
		if (!CONFIG.RegionBehavior?.dataModels?.[MIDI_BEHAVIOR]) return null;

		const resolved = [];
		for (const rule of rules) {
			for (const trigger of rule.triggers) {
				if (rule.payload === "effects") {
					const action = trigger === "exit" ? "removeEffect" : "applyEffect";
					for (const effect of _payloadEffects(item)) {
						resolved.push({ trigger: MIDI_TRIGGERS[trigger], action, targetUuid: effect.uuid });
					}
				} else if (activity) {
					resolved.push({ trigger: MIDI_TRIGGERS[trigger], action: "useActivity", targetUuid: activity.uuid });
				}
			}
		}
		if (!resolved.length) return null;

		return _stamped({
			type: MIDI_BEHAVIOR,
			name: _named(item, "rules"),
			system: {
				sourceItemUuid: item?.uuid ?? "",
				sourceActorUuid: item?.actor?.uuid ?? "",
				rules: resolved,
				dispositionFilter: DISPOSITION_FILTERS[zone.audience],
				castLevel: 0,
				excludeSource: true,
				oncePerTurn: zone.oncePerTurn,
				wallRestriction: "none"
			}
		});
	}

	function _payloadEffects(item) {
		return [...(item?.effects ?? [])].filter(e => e.transfer === false && !Activities.GMM_FORGED_EFFECT_IDS.has(e.id));
	}

	/* ERB rolls against the victim's roll data, so the scaler's numbers have to be settled here. */
	function _erbBehavior(item, rules, activity) {
		if (!CONFIG.RegionBehavior?.dataModels?.[ERB_BEHAVIOR]) return null;

		const parts = activity?.damage?.parts ?? [];
		if (!parts.length) return null;
		const damage = parts.map(p => Activities.damagePartToBlueprint(p).formula).filter(f => f).join(" + ");
		if (!damage) return null;

		const events = new Set();
		for (const rule of rules) {
			if (rule.payload !== "damage") continue;
			for (const trigger of rule.triggers) events.add(REGION_EVENTS[trigger]);
		}
		if (!events.size) return null;

		const type = Activities.damagePartToBlueprint(parts[0]).type;
		const system = {
			events: Array.from(events),
			automateDamage: true,
			saveAbility: [],
			skillChecks: [],
			// ERB compares `>=`, so an unrolled zero against a DC of zero would count as a save.
			saveDC: 1,
			damage,
			savedDamage: "0"
		};
		if (type && CONFIG.DND5E?.damageTypes?.[type]) system.damageType = type;

		return _stamped({ type: ERB_BEHAVIOR, name: _named(item, "rules"), system });
	}

	/* Once: a second pass would double every behavior on the area. */
	async function attach(region, activityUuid) {
		if (!game.users.activeGM?.isSelf || !activityUuid) return;
		if ([...(region?.behaviors ?? [])].some(b => b.getFlag?.(GMM_MODULE_TITLE, "zone"))) return;

		const item = AutomationHelpers.resolveSourceItem(activityUuid);
		const zone = Activities.readZone(item?.flags?.gmm?.blueprint);
		if (!zone) return;

		const documents = zone.terrain
			.filter(t => GMM_ZONE_TERRAIN[t.category] === "document")
			.map(t => t.category);
		const rules = Activities.zoneRules(item.flags.gmm.blueprint);
		const activity = item.system?.activities?.get?.(Activities.GMM_ZONE_ACTIVITY_ID) ?? null;

		const data = _terrainBehaviors(item, zone, await _terrainEffectUuids(documents));
		// midi is the better provider of the two, so ERB only answers where midi is absent.
		const carried = _active(MIDI_ID)
			? _midiBehavior(item, zone, rules, activity)
			: (_active(ERB_ID) ? _erbBehavior(item, rules, activity) : null);
		if (carried) data.push(carried);

		if (!data.length) return;
		const created = await region.createEmbeddedDocuments("RegionBehavior", data);
		await _sweepOccupants(created);
	}

	/* A Terrain Modifier is a property of the space, so it reaches whoever is already standing there. */
	async function _sweepOccupants(created) {
		const behavior = created.find(b => b.type === "applyActiveEffect");
		if (!behavior) return;
		await behavior.update({ "system.effects": Array.from(behavior.system.effects) }, { diff: false });
	}

	return {
		attach: attach
	};
})();

export default Zones;
