import CompatibilityHelpers from "./CompatibilityHelpers.js";

const AURA_MODULE_ID = "auraeffects";
const AURA_TYPE = "auraeffects.aura";
const GMM_PACK_PREFIX = "Compendium.giffyglyph-monster-maker-continued.";

/* An unregistered ActiveEffect subtype still applies its changes, so an aura in a world without Aura Effects would land its payload on the monster itself. */
const Auras = (function () {

	const reported = new Set();
	const bannered = new Set();
	let afterReady = false;

	function _inertModel() {
		const Base = foundry.data?.ActiveEffectTypeDataModel;
		return class InertAuraData extends (Base ?? foundry.abstract.TypeDataModel) {
			static defineSchema() {
				return Base ? super.defineSchema() : {};
			}

			/* Aura fields this shim knows nothing about survive, so installing the module later finds them intact. */
			static cleanData(data, options = {}, state) {
				/* v13 deletes unknown keys and has no prune option. Not cleaning is the only way to keep them. */
				if (!Base) return data;
				return super.cleanData(data, { ...options, prune: false }, state);
			}

			get isSuppressed() {
				return true;
			}

			prepareDerivedData() {
				super.prepareDerivedData?.();
				_report(this.parent);
			}
		};
	}

	function _report(effect) {
		if (!effect || !game.user?.isGM || effect.inCompendium) return;
		const uuid = effect.uuid;
		if (!uuid || reported.has(uuid)) return;
		reported.add(uuid);
		console.warn(`GMM | ${game.i18n.format("gmm.aura.effect_suppressed", {
			effect: effect.name,
			document: effect.parent?.documentName,
			parent: effect.parent?.name,
			module: AURA_MODULE_ID
		})}`);
		if (afterReady) _banner("gmm.aura.suppressed", reported.size);
	}

	function _actors() {
		const seen = new Map();
		game.actors?.forEach((actor) => seen.set(actor.uuid, actor));
		game.scenes?.forEach((scene) => scene.tokens?.forEach((token) => {
			if (token.actor) seen.set(token.actor.uuid, token.actor);
		}));
		return seen.values();
	}

	/* Children Aura Effects created before it was removed. Nothing is left to delete them, so they apply forever. */
	function _countStranded() {
		let count = 0;
		for (const actor of _actors()) {
			for (const effect of actor.effects ?? []) {
				/* getFlag throws on a scope belonging to an inactive module, and this only ever runs in that state. */
				if (effect.flags?.[AURA_MODULE_ID]?.fromAura) count += 1;
			}
		}
		return count;
	}

	function _banner(key, count) {
		if (!count || bannered.has(key)) return;
		bannered.add(key);
		ui.notifications?.warn(game.i18n.format(key, { count: count }));
	}

	/* Foundry's own error names the unregistered subtype and not the module that would register it. */
	function _explainRejections() {
		CompatibilityHelpers.safeWrap("Hooks.onError", function (wrapped, location, error, options = {}) {
			if (!String(error?.message ?? "").includes(AURA_TYPE)) return wrapped(location, error, options);
			ui.notifications?.warn(game.i18n.localize("gmm.aura.not_created"));
			return wrapped(location, error, { ...options, notify: null });
		}, "MIXED");
	}

	/* Provenance is stamped on a drag or an import and not on a programmatic create, so the blueprint carries the ones it misses. */
	function _isOurs(item) {
		if (item.flags?.gmm?.blueprint) return true;
		return String(item._stats?.compendiumSource ?? "").startsWith(GMM_PACK_PREFIX);
	}

	/* Foundry rejects the whole item rather than the effect, and nothing a client registers makes the subtype valid. */
	function _stripUnusableAuras() {
		CompatibilityHelpers.safeWrap("game.dnd5e.documents.Item5e.createDocuments", function (wrapped, data = [], operation = {}) {
			if (!Array.isArray(data)) return wrapped(data, operation);
			let dropped = 0;
			const cleaned = data.map((item) => {
				if (!Array.isArray(item?.effects)) return item;
				/* Only GMMC's own content, because re-importing from where it came from is the only way back to the aura. */
				if (!_isOurs(item)) return item;
				const kept = item.effects.filter((effect) => effect?.type !== AURA_TYPE);
				if (kept.length === item.effects.length) return item;
				dropped += item.effects.length - kept.length;
				return { ...item, effects: kept };
			});
			if (dropped) ui.notifications?.warn(game.i18n.format("gmm.aura.dropped", { count: dropped }));
			return wrapped(cleaned, operation);
		}, "WRAPPER");
	}

	function init() {
		if (game.modules.get(AURA_MODULE_ID)?.active) return;
		CONFIG.ActiveEffect.dataModels[AURA_TYPE] = _inertModel();
		_explainRejections();
		_stripUnusableAuras();
		Hooks.once("ready", () => {
			if (!game.user?.isGM) return;
			afterReady = true;
			_banner("gmm.aura.suppressed", reported.size);
			_banner("gmm.aura.stranded", _countStranded());
		});
	}

	return {
		init: init
	};
})();

export default Auras;
