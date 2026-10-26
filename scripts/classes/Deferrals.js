import Activities from './Activities.js';
import AutomationHelpers from './AutomationHelpers.js';
import Durations from './Durations.js';
import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

const GMM_DEFERRALS_SETTING = "automateDeferrals";
const GMM_CLOCK_FLAG = "deferral";
const GMM_ACTIVATION_FLAG = "deferralActivation";
const GMM_MESSAGE_FLAG = "deferralResolution";

/* GMMC counts the turns itself: an effect's duration measures elapsed rounds, not turns its bearer has taken. */
const Deferrals = (function () {

	/* Templates placed before their clock exists, keyed by the activity uuid stamped on them. */
	const _pendingTemplates = new Map();

	/* Activations in flight, so a template one of them places can be told from a GM drawing onto a running clock. */
	const _activationsInFlight = new Set();

	/* The listeners waiting to sweep one gate's templates, so a second use cannot leave the first's behind. */
	const _gateSweeps = new Map();

	function init() {
		Hooks.on("dnd5e.preActivityConsumption", _onPreActivityConsumption);
		Hooks.on("dnd5e.postActivityConsumption", _onPostActivityConsumption);
		Hooks.on("dnd5e.preCreateActivityTemplate", _onCreateTemplateData);
		Hooks.on("dnd5e.createMeasuredTemplate", _onCreateTemplateData);
		Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
		Hooks.on("createActiveEffect", _onCreateActiveEffect);
		Hooks.on("deleteActiveEffect", _onDeleteActiveEffect);
		Hooks.on("combatTurnChange", _onCombatTurnChange);
		Hooks.on("deleteCombat", _onDeleteCombat);
		Hooks.on("preDeleteToken", _onPreDeleteToken);
		Hooks.on("preDeleteActor", _onPreDeleteActor);
		Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
		Hooks.on("createRegion", _onCreateRegionTemplate);
	}

	function _isEnabled() {
		try {
			return !!game.settings.get(GMM_MODULE_TITLE, GMM_DEFERRALS_SETTING);
		} catch (error) {
			return false;
		}
	}

	/* Nothing here needs v14 yet, but new automation is not shipped to v13. */
	function _isSupported() {
		return (game.release?.generation ?? 0) >= 14;
	}

	function _combatantFor(actor) {
		const combat = game.combat;
		if (!combat?.started) return null;
		const combatant = combat.getCombatantsByActor(actor)[0] ?? null;
		return combatant ? { combat, combatant } : null;
	}

	/* The card, the uses and the template are all already done when this fires, under midi too. */
	async function _onPostUseActivity(activity, _usageConfig, results) {
		try {
			if (activity?.id !== Activities.GMM_ACTIVITY_ID) return;
			_activationsInFlight.delete(activity.uuid);
			const captured = _drainTemplates(activity.uuid);
			const placed = (results?.templates ?? []).flat().map(_regionUuid).filter(_ => _);
			const templateUuids = Array.from(new Set([...placed, ...captured]));

			const item = activity.item;
			const deferral = Activities.readDeferral(item?.flags?.gmm?.blueprint);
			if (deferral?.type === "dooming") return void _sweepGateTemplates(activity, item, templateUuids);
			if (deferral?.type !== "delayed") return;

			const deferredId = Activities.GMM_DEFERRED_ACTIVITY_ID;
			if (!item.system?.activities?.has?.(deferredId)) return;

			// A countdown in the scaler's turns is meaningless without turns, so resolve rather than plant one.
			const inCombat = _combatantFor(item.actor);
			if (!_isEnabled() || !_isSupported() || !inCombat || !game.users.activeGM) {
				return void await _useDeferredActivity(item);
			}

			await _plantClock(item, deferral, templateUuids, inCombat);
		} catch (error) {
			console.error("GMM | Deferral activation failed", error);
		}
	}

	/* dnd5e hands back the deprecated MeasuredTemplate facade. The document that exists is the Region. */
	function _regionUuid(template) {
		if (!template?.id) return null;
		return template.parent?.regions?.get(template.id)?.uuid ?? template.uuid ?? null;
	}

	/* A use that dies before it commits leaves its mark behind, so a fresh one starts by dropping it. */
	function _onPreActivityConsumption(activity) {
		if (activity?.id === Activities.GMM_ACTIVITY_ID) _activationsInFlight.delete(activity.uuid);
	}

	function _onPostActivityConsumption(activity) {
		if (activity?.id === Activities.GMM_ACTIVITY_ID) _activationsInFlight.add(activity.uuid);
	}

	/* The marker rides the document, so every client reaches the same verdict on a placement without a socket. */
	function _onCreateTemplateData(activity, templateData) {
		if (!_activationsInFlight.has(activity?.uuid)) return;
		// 5.3 hands over one template's data. 6.0 hands over the array of regions about to be created.
		for (const data of [templateData].flat()) {
			foundry.utils.setProperty(data, `flags.${GMM_MODULE_TITLE}.${GMM_ACTIVATION_FLAG}`, activity.uuid);
		}
	}

	function _drainTemplates(origin) {
		const uuids = _pendingTemplates.get(origin) ?? [];
		_pendingTemplates.delete(origin);
		return uuids;
	}

	/* The gate's duration is `spec`, so midi's instantaneous sweep can never see it. GMMC runs midi's rule instead. */
	function _sweepGateTemplates(activity, item, uuids) {
		if (!uuids.length) return;
		if (!globalThis.MidiQOL?.configSettings?.()?.autoRemoveInstantaneousTemplate) return;
		const delivery = item?.system?.activities?.get?.(Activities.GMM_DEFERRED_ACTIVITY_ID);
		if (delivery?.duration?.units !== "inst") return;

		// A roll that never finishes leaves the previous use's listeners waiting here.
		_dropGateSweep(activity.uuid);

		const sweep = () => {
			_dropGateSweep(activity.uuid);
			_deleteTemplates(uuids).catch(e => console.warn("GMM | Doom gate template cleanup failed", e));
		};
		// Not `postUseActivity`: midi has not targeted off the area yet when that fires.
		const onComplete = (workflow) => {
			if (workflow?.activity?.uuid === activity.uuid) sweep();
		};
		// An aborted workflow is never rolled complete, and midi reads a `false` from here as an abort.
		const onAbort = () => { sweep(); };
		const abortHook = `midi-qol.preAbort.${activity.uuid}`;
		_gateSweeps.set(activity.uuid, { onComplete, onAbort, abortHook });
		Hooks.on("midi-qol.RollComplete", onComplete);
		Hooks.on(abortHook, onAbort);
	}

	function _dropGateSweep(activityUuid) {
		const entry = _gateSweeps.get(activityUuid);
		if (!entry) return;
		_gateSweeps.delete(activityUuid);
		Hooks.off("midi-qol.RollComplete", entry.onComplete);
		Hooks.off(entry.abortHook, entry.onAbort);
	}

	/* The gate applied the clock, so this is where GMMC first sees it and the only place its source is resolvable. */
	async function _onCreateActiveEffect(effect, _options, _userId) {
		// Not the creating user: DAE applies to an owned target on that player's client, so only the GM can act.
		if (!game.users.activeGM?.isSelf) return;
		const clock = _readClock(effect);
		if (_clockKind(clock) !== "dooming") return;

		try {
			const item = AutomationHelpers.resolveSourceItem(effect.origin);

			// A countdown in the bearer's turns is meaningless without turns, so resolve rather than leave it sitting.
			if (_isEnabled() && _isSupported() && _combatantFor(effect.parent)) {
				// Don't stamp clock if there's no deferral
				if (item) await effect.setFlag(GMM_MODULE_TITLE, GMM_CLOCK_FLAG, { ...clock, sourceUuid: item.uuid });
				return;
			}
			if (!await _cancel(effect, { silent: true, release: false })) return;
			if (item) await _useDeferredActivity(item, { targets: _bearerTokens(effect) });
		} catch (error) {
			console.error("GMM | Doom clock setup failed", error);
		}
	}


	/* A delayed clock rides the item's own actor. A doom clock rides someone else's. */
	function _sourceItem(effect, clock) {
		if (clock?.sourceUuid) return fromUuidSync(clock.sourceUuid) ?? null;
		return effect?.parent?.items?.get?.(clock?.itemId) ?? null;
	}

	function _clockKind(clock) {
		return clock?.kind ?? (clock ? "delayed" : null);
	}

	/* Only a carrier's deletion ends the gate's concentration. An exit reached without one ends it here. */
	function _releaseConcentration(effect, clock) {
		const item = _sourceItem(effect, clock);
		if (!item) return Promise.resolve();
		return Durations.releaseConcentration(item, { ignore: effect.id });
	}

	function _bearerTokens(effect) {
		return effect?.parent?.getActiveTokens?.(false, true) ?? [];
	}

	async function _plantClock(item, deferral, templateUuids, { combat, combatant }) {
		const effectData = {
			name: game.i18n.format("gmm.deferral.clock.name", { name: item.name, rounds: deferral.timer }),
			img: item.img,
			origin: item.uuid,
			/* No duration value, matching the doom clock. One that carries a value can expire on its own,
			   which under `expiryAction: delete` removes it in the turn its last tick resolves. */
			duration: Durations.indefinite(),
			start: {
				time: game.time.worldTime,
				combat: combat.id,
				combatant: combatant.id,
				initiative: combatant.initiative ?? null,
				round: combat.round ?? null,
				turn: combat.turn ?? null
			},
			// CONDITIONAL draws no icon for a clock, which carries no duration.
			showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON?.ALWAYS,
			// Creation data is not expanded, so a dotted flag key would be stored as one literal key.
			flags: {
				[GMM_MODULE_TITLE]: {
					[GMM_CLOCK_FLAG]: {
						kind: "delayed",
						name: item.name,
						itemId: item.id,
						timer: deferral.timer,
						remaining: deferral.timer,
						cancel: deferral.cancel ?? "",
						templateUuids,
						lastTick: (combat.combatant?.id === combatant.id) ? `${combat.id}:${combat.round}` : null
					}
				}
			}
		};

		await item.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
	}

	/* A template can land before its clock or after it. midi auto-places inside `use()`. A GM draws one later. */
	function _onCreateRegionTemplate(region, _options, userId) {
		// dnd5e 6.0 repurposes `origin` to the casting token and moves the activity onto its own flag.
		const origin = region.getFlag("dnd5e", "activity") ?? region.getFlag("dnd5e", "origin");
		if (typeof origin !== "string" || !origin.endsWith(`.Activity.${Activities.GMM_ACTIVITY_ID}`)) return;

		/* Two uses of one action share an origin, so an activation's own template must never reach the append
		   branch: `_clockFor` would hand it the earlier use's countdown. */
		const effect = region.getFlag(GMM_MODULE_TITLE, GMM_ACTIVATION_FLAG) ? null : _clockFor(origin);
		if (!effect) {
			// Whoever placed it is whoever will drain it: `postUseActivity` fires only on that client.
			if (userId === game.user.id) {
				_pendingTemplates.set(origin, [...(_pendingTemplates.get(origin) ?? []), region.uuid]);
			}
			return;
		}

		if (!game.users.activeGM?.isSelf) return;
		const clock = _readClock(effect);
		if (clock.templateUuids?.includes(region.uuid)) return;
		effect.setFlag(GMM_MODULE_TITLE, GMM_CLOCK_FLAG, {
			...clock,
			templateUuids: [...(clock.templateUuids ?? []), region.uuid]
		}).catch(e => console.warn("GMM | Attaching a late template to a deferral clock failed", e));
	}

	function _clockFor(origin) {
		const item = fromUuidSync(origin)?.item;
		const actor = item?.actor;
		if (!actor) return null;
		return _clockEffects(actor).find(e => _readClock(e)?.itemId === item.id) ?? null;
	}

	/* Ordered rather than equal, so a rewound tracker advancing again cannot tick a round twice. */
	function _tickedAlready(clock, combat) {
		const [id, round] = String(clock?.lastTick ?? "").split(":");
		return (id === combat.id) && (Number(round) >= Number(combat.round));
	}

	/* `lastTick` guards a turn against ticking twice, and a replayed round against ticking at all. */
	async function _onCombatTurnChange(combat, _prior, _current) {
		if (!game.users.activeGM?.isSelf || !_isEnabled()) return;
		const actor = combat?.combatant?.actor;
		if (!actor) return;

		for (const effect of _clockEffects(actor)) {
			try {
				const clock = _readClock(effect);
				const current = Number(clock.remaining ?? clock.timer ?? 1);
				// The card is already out. Ticking again would re-post it every turn.
				if (!(current > 0)) continue;

				const tick = `${combat.id}:${combat.round}`;
				if (_tickedAlready(clock, combat)) continue;

				const remaining = current - 1;
				const update = { flags: { [GMM_MODULE_TITLE]: { [GMM_CLOCK_FLAG]: { ...clock, remaining, lastTick: tick } } } };
				// The name is where the count reaches the effects list, which is the one surface a badge cannot serve.
				update.name = _clockName(effect, clock, remaining);
				await effect.update(update);

				if (remaining > 0) _postCountdown(actor, effect, clock, remaining);
				else await _postResolutionCard(effect);
			} catch (error) {
				console.error("GMM | Deferral countdown failed", error);
			}
		}
	}

	/* Not `effect.name`: a renamed clock already carries its count, so reusing it would nest one qualifier in another. */
	function _featureName(effect, clock) {
		return clock?.name || _sourceItem(effect, clock)?.name || effect.name;
	}

	function _clockName(effect, clock, remaining) {
		const key = _clockKind(clock) === "dooming" ? "gmm.deferral.clock.doomed" : "gmm.deferral.clock.name";
		return game.i18n.format(key, {
			name: _featureName(effect, clock),
			rounds: remaining
		});
	}

	function _postCountdown(actor, effect, clock, remaining) {
		const key = _clockKind(clock) === "dooming" ? "gmm.deferral.doom_countdown" : "gmm.deferral.countdown";
		return ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor }),
			content: `<p><em>${game.i18n.format(key, {
				name: _featureName(effect, clock),
				target: actor.name,
				rounds: remaining
			})}</em></p>`
		});
	}

	async function _postResolutionCard(effect) {
		const actor = effect.parent;
		const clock = _readClock(effect);
		const item = _sourceItem(effect, clock);
		if (!item) return void await _cancel(effect, { silent: true });

		const dooming = _clockKind(clock) === "dooming";
		const area = dooming ? { tokens: [], unread: 0, hasArea: false } : await _templateTargets(clock);
		const targetNames = dooming ? [actor.name] : area.tokens.map(t => t.name);

		const content = await foundry.applications.handlebars.renderTemplate(
			`modules/${GMM_MODULE_TITLE}/templates/chat/deferral-resolution.html`,
			{
				name: item.name,
				cancel: clock.cancel,
				targets: targetNames,
				hasTargets: !!targetNames.length,
				unread: area.unread > 0,
				hasArea: area.hasArea,
				dooming: dooming,
				effectUuid: effect.uuid
			}
		);

		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor }),
			content,
			whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
			flags: { [GMM_MODULE_TITLE]: { [GMM_MESSAGE_FLAG]: { effectUuid: effect.uuid } } }
		});
	}

	function _onRenderChatMessage(message, html) {
		const flag = message.getFlag(GMM_MODULE_TITLE, GMM_MESSAGE_FLAG);
		if (!flag?.effectUuid) return;

		const buttons = [...html.querySelectorAll("[data-gmm-deferral]")];
		for (const button of buttons) {
			button.addEventListener("click", async () => {
				// Tested and set before the first await, which two clicks on one client would both clear.
				if (buttons.some(b => b.disabled)) return;
				for (const b of buttons) b.disabled = true;

				const effect = await fromUuid(flag.effectUuid);
				// The clock is gone, so the card has already been answered.
				if (!effect) return void _warnAnswered();
				const answered = (button.dataset.gmmDeferral === "resolve")
					? await _resolve(effect)
					: await _cancel(effect);
				if (!answered) _warnAnswered();
			});
		}
	}

	function _warnAnswered() {
		ui.notifications?.warn(game.i18n.localize("gmm.deferral.already_resolved"));
	}

	async function _claimClock(effect, options) {
		try {
			await effect.delete(options);
			return true;
		} catch (error) {
			console.warn("GMM | A deferral clock was already answered on another client", error);
			return false;
		}
	}

	async function _resolve(effect) {
		const clock = _readClock(effect);
		const item = _sourceItem(effect, clock);
		if (!item) return await _cancel(effect, { silent: true });

		// Targets first: deleting the clock takes the template with it.
		const targets = _clockKind(clock) === "dooming"
			? _bearerTokens(effect)
			: (await _templateTargets(clock)).tokens;
		if (!await _cancel(effect, { silent: true, release: false })) return false;
		await _useDeferredActivity(item, { targets });
		return true;
	}

	/* midi drives its whole workflow from `completeActivityUse`. Core dnd5e has no equivalent entry point. */
	async function _useDeferredActivity(item, { targets = null } = {}) {
		const activity = item.system?.activities?.get?.(Activities.GMM_DEFERRED_ACTIVITY_ID);
		if (!activity) return;

		// Occupants as of now, not activation: leaving the area before zero is meant to save you.
		if (targets?.length) {
			for (const token of Array.from(game.user.targets)) token.setTarget(false, { releaseOthers: false });
			for (const token of targets) token.object?.setTarget(true, { releaseOthers: false });
		}

		const midi = game.modules.get("midi-qol");
		const message = { data: { flags: { [GMM_MODULE_TITLE]: { deferredFrom: item.name } } } };
		if (midi?.active && globalThis.MidiQOL?.completeActivityUse) {
			await MidiQOL.completeActivityUse(activity, {}, {}, message);
		} else {
			await activity.use({}, {}, message);
		}

		if (!Durations.forgesCarrier(item.flags?.gmm?.blueprint)) await Durations.releaseConcentration(item);
	}

	async function _cancel(effect, { silent = false, release = true } = {}) {
		const clock = _readClock(effect);
		const actor = effect.parent;
		const name = _featureName(effect, clock);
		// midi ends a concentration the moment its last dependent goes.
		if (!await _claimClock(effect, { noConcentrationCheck: !release })) return false;
		if (!silent) {
			await ChatMessage.create({
				speaker: ChatMessage.getSpeaker({ actor }),
				content: `<p><em>${game.i18n.format("gmm.deferral.cancelled", { name })}</em></p>`
			});
		}
		if (release) await _releaseConcentration(effect, clock);
		return true;
	}

	/* An effect destroyed with its parent fires no delete hook, and `pre` is where its flags are still readable. */
	function _onPreDeleteToken(token) {
		// A linked token leaves the actor and its clock behind, so that clock has to go explicitly.
		_releasePending(token?.actor, { andEffects: !!token?.actorLink });
	}

	function _onPreDeleteActor(actor) {
		_releasePending(actor, { andEffects: false });
	}

	function _releasePending(actor, { andEffects }) {
		if (!game.users.activeGM?.isSelf || !actor) return;
		for (const effect of _clockEffects(actor)) {
			const clock = _readClock(effect);
			if (andEffects) effect.delete().catch(e => console.warn("GMM | Deferral clock cleanup failed", e));
			else if (clock?.templateUuids?.length) {
				_deleteTemplates(clock.templateUuids).catch(e => console.warn("GMM | Deferral template cleanup failed", e));
			}
			_releaseConcentration(effect, clock).catch(e => console.warn("GMM | Deferral concentration release failed", e));
		}
	}

	/* The canvas marker goes whenever the clock does, however it ended. */
	function _onDeleteActiveEffect(effect, _options, _userId) {
		if (!game.users.activeGM?.isSelf) return;
		const clock = _readClock(effect);
		if (!clock?.templateUuids?.length) return;
		_deleteTemplates(clock.templateUuids).catch(e => console.warn("GMM | Deferral template cleanup failed", e));
	}

	/* An unresolved deferral is a fizzled one. */
	function _onDeleteCombat(combat, _options, _userId) {
		if (!game.users.activeGM?.isSelf) return;
		const seen = new Set();
		for (const combatant of combat?.combatants ?? []) {
			const actor = combatant.actor;
			if (!actor || seen.has(actor.uuid)) continue;
			seen.add(actor.uuid);
			for (const effect of _clockEffects(actor)) {
				const clock = _readClock(effect);
				effect.delete()
					.then(() => _releaseConcentration(effect, clock))
					.catch(e => console.warn("GMM | Deferral cleanup on combat end failed", e));
			}
		}
	}

	function _readClock(effect) {
		return effect?.getFlag?.(GMM_MODULE_TITLE, "deferral") ?? null;
	}

	function _clockEffects(actor) {
		return Array.from(actor?.effects ?? []).filter(e => _readClock(e));
	}

	/* No area, an area that has gone, and an area that cannot be measured are three different answers to the GM. */
	async function _templateTargets(clock) {
		const uuids = clock?.templateUuids ?? [];
		if (!uuids.length) return { tokens: [], unread: 0, hasArea: false };

		// Resolved up front because both tiers below return no tokens for a template that has gone.
		const found = [];
		let unread = 0;
		for (const uuid of uuids) {
			const template = await fromUuid(uuid);
			if (_isMeasurableHere(template)) found.push({ uuid, template });
			else unread += 1;
		}
		if (!found.length) return { tokens: [], unread, hasArea: true };

		// Preferred, so the card cannot list a token midi will then refuse to target.
		const viaMidi = globalThis.MidiQOL?.computeTargetsFromTemplates;
		if (viaMidi) {
			try {
				// The stored strings, so midi is handed what GMMC recorded rather than a re-derived uuid.
				const surviving = found.map(f => f.uuid);
				return { tokens: (viaMidi(surviving) ?? []).map(t => t.document ?? t), unread, hasArea: true };
			} catch (error) {
				console.warn("GMM | midi template targeting failed; measuring the template directly", error);
			}
		}

		const tokens = [];
		for (const { template } of found) {
			for (const token of template.parent?.tokens ?? []) {
				if (template.testPoint(token.getCenterPoint())) tokens.push(token);
			}
		}
		return { tokens, unread, hasArea: true };
	}

	/* Both tiers measure the viewed scene's tokens. A template on another scene would be measured against the
	   wrong ones. A facade uuid, stored by a clock planted before this shape changed, has no `testPoint`. */
	function _isMeasurableHere(template) {
		return typeof template?.testPoint === "function" && template.parent?.id === canvas.scene?.id;
	}

	async function _deleteTemplates(uuids) {
		for (const uuid of uuids ?? []) {
			const template = await fromUuid(uuid);
			if (!template) continue;
			try {
				await template.delete();
			} catch (error) {
				// Foundry rejects the loser of a delete race
				if (!/does not exist/i.test(error?.message ?? "")) throw error;
			}
		}
	}

	return {
		init: init
	};
})();

export default Deferrals;
