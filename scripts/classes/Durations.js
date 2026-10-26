import Shortcoder from "./Shortcoder.js";
import AutomationHelpers from "./AutomationHelpers.js";
import CompatibilityHelpers from "./CompatibilityHelpers.js";
import { GMM_MODULE_TITLE } from "../consts/GmmModuleTitle.js";

/* Every recurring type but one belongs to midi or DAE. An absent module degrades a type to a plain
 * lifetime rather than breaking it. */
const Durations = (function () {

	const GMM_DURATIONS_SETTING = "automateDurations";
	const GMM_DURATION_FLAG = "duration";
	const GMM_APPLICATION_FLAG = "durationApplication";

	/* Two uses of one feature share an item, an origin, and every flag GMMC forges. Only the create call
	 * they arrive in tells them apart. */
	const GMM_APPLICATION_OPTION = "gmmDurationApplication";

	const GMM_DURATION_EFFECT_ID = (typeof dnd5e !== "undefined" && dnd5e?.utils?.staticID)
		? dnd5e.utils.staticID("gmmduration")
		: "gmmduration00000";

	const GMM_DURATION_IMG = "icons/magic/time/clock-stopwatch-white-blue.webp";

	const OVERTIME_KEY = "flags.midi-qol.OverTime";

	const TYPES = {
		instant: { applies: false },
		end_of_your_turn: { applies: true, expiry: "sourceEnd", rounds: 1 },
		end_of_target_turn: { applies: true, expiry: "targetEnd", rounds: 1, cancellable: true },
		timed: { applies: true, hasPeriod: true, periodRequired: true, reappliable: true, cancellable: true },
		ongoing: { applies: true, hasPeriod: true, hasSave: true, saveRequired: true, saveTurn: "start", reappliable: true, cancellable: true },
		save_ends: { applies: true, hasPeriod: true, hasSave: true, saveRequired: true, saveTurn: "end", reappliable: true, cancellable: true },
		permanent: { applies: true },
		special: { applies: false }
	};

	/* v14 dropped the `{rounds, turns, seconds}` shape for a value/units pair drawn from this list. */
	const EFFECT_UNITS = {
		turn: "turns",
		round: "rounds",
		minute: "minutes",
		hour: "hours",
		day: "days",
		month: "months",
		year: "years"
	};

	function _rules(type) {
		return TYPES[type] ?? TYPES.instant;
	}

	function isEnabled() {
		try {
			return !!game.settings.get(GMM_MODULE_TITLE, GMM_DURATIONS_SETTING);
		} catch (error) {
			return false;
		}
	}

	/* New automation is not shipped to v13. */
	function isSupported() {
		return (game.release?.generation ?? 0) >= 14;
	}

	function read(blueprint) {
		const d = blueprint?.data?.duration ?? blueprint?.duration ?? {};
		return {
			type: TYPES[d.type] ? d.type : fromUnits(d.units, d.value).type,
			units: d.units ?? "",
			value: d.value ?? "",
			saveAbility: d.save?.ability ?? "",
			reapplies: d.reapplies ?? "",
			cancel: d.cancel ?? ""
		};
	}

	/* Reapplication stays off. The pre-type field was a label. Reading it as a behavior would turn every
	 * timed damage action into a damage-over-time. */
	function fromUnits(units, value) {
		switch (units) {
			case "perm": return { type: "permanent", units: "", value: "", reapplies: "" };
			case "spec": return { type: "special", units: "", value: "", reapplies: "" };
			case "inst":
			case "":
			case null:
			case undefined: return { type: "instant", units: "", value: "", reapplies: "" };
			default: return { type: "timed", units, value: value ?? "", reapplies: "" };
		}
	}

	/* `inst`, `perm` and `spec` are a type, not a number */
	function isPeriodUnits(units) {
		return !!EFFECT_UNITS[units];
	}

	/* Read by the sheet and never written back. That keeps a blueprint portable into a world with a
	 * different module set. */
	function describe(blueprint) {
		const duration = read(blueprint);
		const rules = _rules(duration.type);
		const needs = [];
		if (rules.hasSave || duration.reapplies === "target") needs.push("midi-qol");
		// dnd5e 6 resolves the pseudo-expiries itself. Before that only DAE knows what they mean.
		if (rules.expiry && !CompatibilityHelpers.dnd5eAtLeast("6.0")) needs.push("dae");
		return {
			duration,
			rows: {
				period: !!rules.hasPeriod,
				periodRequired: !!rules.periodRequired,
				save: !!rules.hasSave,
				// midi builds no save at all from a blank ability, so the type cannot work without one.
				saveMissing: !!rules.saveRequired && !duration.saveAbility,
				reapplies: !!rules.reappliable,
				cancel: !!rules.cancellable,
				concentration: !!rules.hasPeriod
			},
			missing: [...new Set(needs)].filter(id => !game.modules?.get?.(id)?.active)
		};
	}

	/* Also the lifetime dnd5e gives a Concentrating effect. A type without a period deliberately
	 * carries no number. */
	function buildActivityDuration(blueprint, concentration) {
		const duration = read(blueprint);
		const shared = { concentration: !!concentration, special: "", override: false };

		if (_rules(duration.type).hasPeriod && duration.units) {
			return { ...shared, value: duration.value ?? null, units: duration.units };
		}
		switch (duration.type) {
			case "permanent": return { ...shared, value: null, units: "perm" };
			case "special": return { ...shared, value: null, units: "spec" };
			case "end_of_your_turn":
			case "end_of_target_turn": return { ...shared, value: 1, units: "round" };
			default: return { ...shared, value: null, units: "inst" };
		}
	}

	/* dnd5e 6 stamps an expiry on a valueless duration in any other units, ending the effect a turn on. */
	function indefinite() {
		return { value: null, units: "turns", expiry: null };
	}

	function _effectDuration(duration, rules) {
		const out = { ...indefinite(), expiry: rules.expiry ?? null };
		if (rules.rounds) {
			out.value = rules.rounds;
			out.units = "rounds";
			return out;
		}
		const value = Number(duration.value);
		if (!rules.hasPeriod || !EFFECT_UNITS[duration.units] || !Number.isFinite(value) || value <= 0) return out;
		out.value = value;
		out.units = EFFECT_UNITS[duration.units];
		return out;
	}

	/* Read from the activity rather than the type, because a type may be keyed to a target and a placed
	 * area has no single one. */
	function areaLifetime(duration) {
		const units = EFFECT_UNITS[duration?.units];
		const value = Number(duration?.value);
		if (!units || !Number.isFinite(value) || value <= 0) return null;
		// Core defaults a numeric duration to `turnStart`, so a world-time lifetime has to say `null` out loud.
		return (units === "rounds" || units === "turns")
			? { value, units, expiry: "turnEnd" }
			: { value, units, expiry: null };
	}

	/* Separated with `#` because a damage formula may legally contain a comma. The `,` separator applies
	 * only when no `#` is present. */
	function _overTimeChanges(duration, rules, damage, saveDc, saveMacros) {
		const changes = [];

		if (rules.hasSave) {
			const parts = [
				`turn=${rules.saveTurn}`,
				"rollType=save",
				`saveAbility=${duration.saveAbility}`,
				// A DC nobody can derive is left unsaid. midi then builds no save, rather than a wrong one.
				...(saveDc ? [`saveDC=${saveDc}`] : []),
				"saveCount=1-",
				// midi runs these inside the save's own workflow, which is the only place the result is readable.
				...(saveMacros?.length ? [`macro=${saveMacros.join(",")}`] : [])
			];
			// Ongoing's damage is the failure branch of its own save, not a separate tick.
			if (rules.saveTurn === "start" && damage?.formula) {
				parts.push(`damageRoll=${damage.formula}`, `damageType=${damage.type ?? ""}`, "saveDamage=nodamage");
			}
			changes.push({ key: OVERTIME_KEY, value: parts.join("#"), type: "override", priority: 20 });
		}

		if (duration.reapplies === "target" && damage?.formula) {
			const parts = [
				"turn=start",
				"rollType=damage",
				`damageRoll=${damage.formula}`,
				`damageType=${damage.type ?? ""}`
			];
			changes.push({ key: `${OVERTIME_KEY}Reapply`, value: parts.join("#"), type: "override", priority: 20 });
		}

		return changes;
	}

	/* Forged even when the action inflicts no condition, because a purely recurring damage effect would
	 * otherwise have no document to hang its flags on. */
	function buildEffectData(blueprint, { name, img, damage, saveDc, saveMacros } = {}) {
		const duration = read(blueprint);
		const rules = _rules(duration.type);
		if (!rules.applies || !isSupported() || !isEnabled()) return null;

		return {
			_id: GMM_DURATION_EFFECT_ID,
			name: name || "Duration",
			img: img || GMM_DURATION_IMG,
			// v14 moved effect changes off the document and into its type data.
			system: {
				changes: _overTimeChanges(duration, rules, damage, saveDc, saveMacros)
			},
			duration: _effectDuration(duration, rules),
			transfer: false,
			flags: {
				[GMM_MODULE_TITLE]: {
					[GMM_DURATION_FLAG]: {
						type: duration.type,
						reapplies: duration.reapplies || null,
						formula: damage?.formula ?? "",
						damageType: damage?.type ?? ""
					}
				}
			}
		};
	}

	function isDurationEffect(effect) {
		return !!effect?.flags?.[GMM_MODULE_TITLE]?.[GMM_DURATION_FLAG];
	}

	/* An instant payload forges nothing. Neither does a world with the automation off. */
	function forgesCarrier(blueprint) {
		return !!buildEffectData(blueprint);
	}

	/* The stored change values still carry shortcodes. Only the owning scaler can resolve them. */
	function resolveEffectFormulas(item, monsterData) {
		if (!monsterData) return;
		const effect = item?.effects?.get?.(GMM_DURATION_EFFECT_ID);
		if (!effect) return;
		const flag = effect.flags?.[GMM_MODULE_TITLE]?.[GMM_DURATION_FLAG];
		if (flag && typeof flag.formula === "string" && flag.formula.includes("[")) {
			flag.formula = Shortcoder.replaceShortcodes(flag.formula, monsterData, false, item);
		}
		for (const change of effect.system?.changes ?? effect.changes ?? []) {
			if (typeof change.value === "string" && change.value.includes("[")) {
				change.value = Shortcoder.replaceShortcodes(change.value, monsterData, false, item);
			}
		}
	}

	function _applicationOf(effect) {
		return effect?.flags?.[GMM_MODULE_TITLE]?.[GMM_APPLICATION_FLAG] ?? null;
	}

	/* Stamped on carrier and payload alike, so either end of the pair can name the other. */
	function _stampApplication(effect, item, options) {
		if (!options || !item.effects?.get?.(GMM_DURATION_EFFECT_ID)) return;
		options[GMM_APPLICATION_OPTION] ??= foundry.utils.randomID();
		effect.updateSource({
			[`flags.${GMM_MODULE_TITLE}.${GMM_APPLICATION_FLAG}`]: options[GMM_APPLICATION_OPTION]
		});
	}

	/* The tray applies `effect.toObject()`, a clone of _source that the resolution above never touched.
	 * This is the last point at which the scaler is still reachable. */
	function _onPreCreateActiveEffect(effect, data, options) {
		if (!isSupported() || !isEnabled()) return;
		const item = AutomationHelpers.resolveSourceItem(effect.origin);
		if (!item) return;
		_stampApplication(effect, item, options);

		if (!isDurationEffect(effect)) return;
		const monsterData = item.getOwningGmmMonster?.();
		if (!monsterData) return;

		const resolve = (value) => (typeof value === "string" && value.includes("["))
			? Shortcoder.replaceShortcodes(value, monsterData, false, item)
			: value;

		const update = {};
		// v14 has no top-level `changes`, so old-shape data written back under its own key is dropped.
		const changes = data.system?.changes ?? data.changes;
		if (Array.isArray(changes)) {
			update["system.changes"] = changes.map(c => ({ ...c, value: resolve(c.value) }));
		}

		const formula = data.flags?.[GMM_MODULE_TITLE]?.[GMM_DURATION_FLAG]?.formula;
		if (formula) update[`flags.${GMM_MODULE_TITLE}.${GMM_DURATION_FLAG}.formula`] = resolve(formula);

		if (!foundry.utils.isEmpty(update)) effect.updateSource(update);
	}

	function _sourceActorOf(effect) {
		const origin = effect?.origin;
		if (!origin) return null;
		const doc = fromUuidSync(origin);
		return doc?.actor ?? doc?.parent?.actor ?? doc?.parent ?? null;
	}

	/* The only record of the tick. The tick is not a workflow and produces no card of its own. */
	async function _applyDamage(actor, formula, damageType, name) {
		const roll = await new Roll(String(formula)).evaluate();
		await roll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor }),
			flavor: [name, damageType, "damage"].filter(x => x).join(" ")
		});
		const parts = [{ value: roll.total, damage: roll.total, type: damageType || "none" }];
		const token = actor.getActiveTokens?.()[0];
		if (globalThis.MidiQOL?.applyTokenDamage && token) {
			return globalThis.MidiQOL.applyTokenDamage(parts, roll.total, new Set([token]), null, new Set());
		}
		return actor.applyDamage?.(parts);
	}

	/* Combatants only. A creature outside the tracker has no turn for a source-keyed tick to arrive on. */
	function _sourceReapplyCarriers(combat, source) {
		const carriers = [];
		const seen = new Set();
		for (const combatant of combat?.combatants ?? []) {
			const actor = combatant.actor;
			if (!actor || seen.has(actor.uuid)) continue;
			seen.add(actor.uuid);
			for (const effect of actor.effects ?? []) {
				if (!isDurationEffect(effect) || !effect.active) continue;
				const flag = effect.flags[GMM_MODULE_TITLE][GMM_DURATION_FLAG];
				if (flag.reapplies !== "source" || !flag.formula) continue;
				if (_sourceActorOf(effect)?.uuid === source.uuid) carriers.push(effect);
			}
		}
		return carriers;
	}

	/* Ordered rather than equal, so a rewound tracker advancing again cannot tick a round twice. A round
	 * already spent stays spent, because a tick the GM has to apply by hand beats silent double damage. */
	function _tickedAlready(flag, combat) {
		const [id, round] = String(flag?.lastTick ?? "").split(":");
		return (id === combat.id) && (Number(round) >= Number(combat.round));
	}

	/* The one recurring type GMMC runs itself. midi and DAE both key a repeat to whoever holds the
	 * effect. This one is keyed to whoever inflicted it. */
	async function _onCombatTurnChange(combat) {
		if (!game.users.activeGM?.isSelf || !isEnabled() || !isSupported()) return;
		const source = combat?.combatant?.actor;
		if (!source) return;

		const tick = `${combat.id}:${combat.round}`;
		for (const effect of _sourceReapplyCarriers(combat, source)) {
			try {
				const flag = effect.flags[GMM_MODULE_TITLE][GMM_DURATION_FLAG];
				if (_tickedAlready(flag, combat)) continue;
				await effect.setFlag(GMM_MODULE_TITLE, GMM_DURATION_FLAG, { ...flag, lastTick: tick });
				await _applyDamage(effect.parent, flag.formula, flag.damageType, effect.name);
			} catch (error) {
				console.error("GMM | Source-keyed reapplication failed", error);
			}
		}
	}

	/* Not the origin string. Under midi every effect in one application carries the first one's uuid.
	 * Under core they all differ. */
	function _sourceItemIdOf(effect) {
		return AutomationHelpers.resolveSourceItem(effect?.origin)?.id ?? null;
	}

	function _carrierFor(effect) {
		const itemId = _sourceItemIdOf(effect);
		if (!itemId) return null;
		const carriers = [...(effect.parent?.effects ?? [])]
			.filter(e => isDurationEffect(e) && _sourceItemIdOf(e) === itemId);
		const application = _applicationOf(effect);
		return carriers.find(e => application && _applicationOf(e) === application) ?? carriers[0] ?? null;
	}

	function _claimedElsewhere(carrier, payload) {
		const application = _applicationOf(payload);
		if (!application) return false;
		return [...(carrier.parent?.effects ?? [])]
			.some(e => e.id !== carrier.id && isDurationEffect(e) && _applicationOf(e) === application);
	}

	/* A second use's doom clock and an area clock are both machinery rather than payload. Sweeping
	 * either would cancel a payload still in flight or take the area off the canvas. */
	function _payloadOf(carrier) {
		const itemId = _sourceItemIdOf(carrier);
		if (!itemId) return [];
		return [...(carrier.parent?.effects ?? [])].filter(e => e.id !== carrier.id
			&& !isDurationEffect(e)
			&& !e.flags?.[GMM_MODULE_TITLE]?.deferral
			&& !e.flags?.[GMM_MODULE_TITLE]?.areaClock
			&& _sourceItemIdOf(e) === itemId
			&& !_claimedElsewhere(carrier, e));
	}

	/* An authored effect carries whatever lifetime the GM gave it in the native config. The blueprint's
	 * own duration then contradicts it. The carrier's wins. */
	async function _slaveSiblingDurations(effect) {
		const parent = effect?.parent;
		if (!parent?.effects) return;
		const carrier = _carrierFor(effect);
		if (!carrier) return;
		const duration = carrier.toObject().duration;
		const updates = _payloadOf(carrier)
			.filter(e => !foundry.utils.objectsEqual(e.toObject().duration, duration))
			.map(e => ({ _id: e.id, duration }));
		if (updates.length) await parent.updateEmbeddedDocuments("ActiveEffect", updates);
	}

	/* dnd5e deletes an effect's dependents with it. That is what cancels a pending doom when the players
	 * break concentration. The link waits until here because the two live on different actors. */
	async function _onCreateActiveEffect(effect) {
		if (!game.users.activeGM?.isSelf || !isSupported()) return;
		await _slaveSiblingDurations(effect);

		const deferral = effect?.flags?.[GMM_MODULE_TITLE]?.deferral;
		if (!isDurationEffect(effect) && !deferral) return;
		const source = _sourceActorOf(effect);
		const itemId = AutomationHelpers.resolveSourceItem(effect.origin)?.id ?? null;
		const concentration = AutomationHelpers.concentrationFor(source, itemId);
		if (!concentration) return;
		try {
			await effect.setFlag("dnd5e", "dependentOn", concentration.uuid);
		} catch (error) {
			console.warn("GMM | Linking a clock to its concentration failed", error);
		}
	}

	function _isPayload(document) {
		return isDurationEffect(document) || !!document?.flags?.[GMM_MODULE_TITLE]?.deferral;
	}

	/* Only a deferred feature's concentration lacks an expiry. Only it needs ending by hand. The
	 * dependents check keeps a multi-target feature concentrating until the last carrier is gone. */
	async function releaseConcentration(item, { ignore = null } = {}) {
		const concentration = AutomationHelpers.concentrationFor(item?.actor, item?.id);
		// v14 prepares a blank value to Infinity, so only a finite one is a real expiry.
		if (!concentration || Number.isFinite(concentration.duration?.value)) return;
		// An area is a dependent too, and it never leaves while the concentration holds.
		if (concentration.getDependents().some(d => d.id !== ignore && _isPayload(d))) return;
		try {
			await concentration.delete();
		} catch (error) {
			console.warn("GMM | Concentration was already released on another path", error);
		}
	}

	async function _onDeleteActiveEffect(effect) {
		if (!game.users.activeGM?.isSelf || !isDurationEffect(effect)) return;

		const payload = _payloadOf(effect).map(e => e.id);
		if (payload.length) await effect.parent?.deleteEmbeddedDocuments("ActiveEffect", payload);

		const item = AutomationHelpers.resolveSourceItem(effect.origin);
		await releaseConcentration(item, { ignore: effect.id });
	}

	/* A world left on the default expiry action marks a carrier rather than deleting it. The payload is
	 * marked the same way, because which of the two happens is the world's policy and not GMMC's. */
	async function _onUpdateActiveEffect(effect) {
		if (!game.users.activeGM?.isSelf || !isDurationEffect(effect)) return;
		if (effect.active || effect.disabled) return;
		const updates = _payloadOf(effect)
			.filter(e => e.active)
			.map(e => ({ _id: e.id, "duration.expired": true }));
		if (updates.length) await effect.parent?.updateEmbeddedDocuments("ActiveEffect", updates);
	}

	function init() {
		Hooks.on("preCreateActiveEffect", _onPreCreateActiveEffect);
		Hooks.on("createActiveEffect", _onCreateActiveEffect);
		Hooks.on("updateActiveEffect", _onUpdateActiveEffect);
		Hooks.on("deleteActiveEffect", _onDeleteActiveEffect);
		Hooks.on("combatTurnChange", _onCombatTurnChange);
	}

	return {
		GMM_DURATIONS_SETTING,
		GMM_DURATION_EFFECT_ID,
		TYPES,
		isEnabled,
		isSupported,
		read,
		fromUnits,
		isPeriodUnits,
		indefinite,
		describe,
		isDurationEffect,
		buildActivityDuration,
		buildEffectData,
		forgesCarrier,
		releaseConcentration,
		areaLifetime,
		resolveEffectFormulas,
		init
	};
})();

export default Durations;
