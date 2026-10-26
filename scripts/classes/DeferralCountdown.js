import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';
import {
	GMM_DEFERRAL_COUNTDOWN_DEFAULTS,
	GMM_DEFERRAL_COUNTDOWN_SETTING
} from '../consts/GmmDeferralCountdown.js';

const GMM_CLOCK_FLAG = "deferral";
const GMM_BADGE_PROPERTY = "gmmDeferralBadge";
const GMM_REGION_REMAINING = "gmmDeferralRemaining";
const GMM_BADGE_EXTRA_STROKE = 1;

/* No socket and no write of its own. The effect update each tick already performs repaints every client. */
const DeferralCountdown = (function () {

	function init() {
		Hooks.on("drawToken", _paintToken);
		Hooks.on("refreshToken", _paintToken);
		Hooks.on("drawRegion", _resolveRegion);
		Hooks.on("refreshRegion", _renderRegion);
		Hooks.on("createActiveEffect", _onClockChanged);
		Hooks.on("updateActiveEffect", _onClockChanged);
		Hooks.on("deleteActiveEffect", _onClockChanged);
	}

	/* A stored object predating a new control is missing its key, so every read lands on the defaults first. */
	function getSettings() {
		try {
			const stored = game.settings.get(GMM_MODULE_TITLE, GMM_DEFERRAL_COUNTDOWN_SETTING);
			return { ...GMM_DEFERRAL_COUNTDOWN_DEFAULTS, ...(stored ?? {}) };
		} catch (error) {
			return { ...GMM_DEFERRAL_COUNTDOWN_DEFAULTS };
		}
	}

	/* The nameplate's own style, so a badge belongs to the same family as every other label on a token. */
	function buildStyle(config, { fontSize, due }) {
		const style = CONFIG.canvasTextStyle.clone();
		style.fontFamily = config.font || GMM_DEFERRAL_COUNTDOWN_DEFAULTS.font;
		style.fontSize = fontSize;
		style.fill = (due ? config.dueColor : config.color) || GMM_DEFERRAL_COUNTDOWN_DEFAULTS.color;
		style.strokeThickness = style.strokeThickness + GMM_BADGE_EXTRA_STROKE;
		style.align = "center";
		return style;
	}

	/* A percentage of the smaller side, so a badge can never outgrow the token or area carrying it. */
	function fontSizeFor(config, width, height) {
		return Math.max(1, Math.min(width, height) * (Number(config.size) || 0) / 100);
	}

	function labelFor(remaining) {
		return remaining > 0 ? String(remaining) : game.i18n.localize("gmm.deferral.clock.due");
	}

	function repaintAll() {
		for (const token of canvas?.tokens?.placeables ?? []) _paintToken(token);
		for (const region of canvas?.regions?.placeables ?? []) _resolveRegion(region);
	}

	function _paintToken(token) {
		// Core hides a secret token's effects from anyone but an observer. A countdown is one of them.
		const remaining = token.document.isSecret ? null : _lowestRemaining(token.actor);
		const config = getSettings();
		// Anchored to the chosen edge rather than inset from it, so a large badge cannot hang off the token.
		const anchorX = { left: 0, center: 0.5, right: 1 }[config.horizontal] ?? 0.5;
		const anchorY = { top: 0, center: 0.5, bottom: 1 }[config.vertical] ?? 0.5;
		_render(token, remaining, {
			width: token.w,
			height: token.h,
			x: token.w * anchorX,
			y: token.h * anchorY,
			anchorX,
			anchorY
		});
	}

	/* Resolving walks a uuid and an effect list, so a refresh reuses what the last draw worked out. */
	function _resolveRegion(region) {
		region[GMM_REGION_REMAINING] = _remainingOf(_clockForRegion(region));
		_renderRegion(region);
	}

	/* An area is any shape, so the position controls cannot apply to it. */
	function _renderRegion(region) {
		const bounds = region.bounds;
		const center = region.center;
		_render(region, region[GMM_REGION_REMAINING] ?? null, {
			width: bounds.width,
			height: bounds.height,
			x: center.x,
			y: center.y,
			anchorX: 0.5,
			anchorY: 0.5
		});
	}

	function _render(placeable, remaining, layout) {
		try {
			const config = getSettings();
			let badge = placeable[GMM_BADGE_PROPERTY];
			if (!config.enabled || (remaining === null)) {
				if (badge && !badge.destroyed) badge.visible = false;
				return;
			}

			if (!badge || badge.destroyed) {
				const text = new foundry.canvas.containers.PreciseText("", CONFIG.canvasTextStyle.clone());
				badge = placeable[GMM_BADGE_PROPERTY] = placeable.addChild(text);
			}

			const due = !(remaining > 0);
			const fontSize = fontSizeFor(config, layout.width, layout.height);
			// A refresh runs every animation frame a placeable moves. Assigning a style re-rasterizes the glyph.
			const signature = `${config.font}|${fontSize}|${due ? config.dueColor : config.color}`;
			if (badge.gmmStyleSignature !== signature) {
				badge.style = buildStyle(config, { fontSize, due });
				badge.gmmStyleSignature = signature;
			}

			badge.text = labelFor(remaining);
			badge.anchor.set(layout.anchorX, layout.anchorY);
			badge.position.set(layout.x, layout.y);
			badge.visible = true;
		} catch (error) {
			console.error("GMM | Drawing a deferral countdown failed", error);
		}
	}

	function _onClockChanged(effect) {
		const clock = effect?.getFlag?.(GMM_MODULE_TITLE, GMM_CLOCK_FLAG);
		for (const uuid of clock?.templateUuids ?? []) {
			const region = fromUuidSync(uuid)?.object;
			if (region) _resolveRegion(region);
		}
	}

	/* `templateUuids` is the only link that survives two uses of one action sharing an origin. */
	function _clockForRegion(region) {
		const document = region?.document;
		if (!document) return null;
		// dnd5e 6.0 repurposes `origin` to the casting token and moves the activity onto its own flag.
		const origin = document.getFlag("dnd5e", "activity") ?? document.getFlag("dnd5e", "origin");
		if (typeof origin !== "string") return null;

		const actor = fromUuidSync(origin)?.item?.actor;
		for (const effect of actor?.effects ?? []) {
			const clock = effect.getFlag(GMM_MODULE_TITLE, GMM_CLOCK_FLAG);
			if (clock?.templateUuids?.includes(document.uuid)) return clock;
		}
		return null;
	}

	function _remainingOf(clock) {
		if ((clock?.kind === "dooming") && !clock.sourceUuid) return null;
		const remaining = Number(clock?.remaining ?? clock?.timer);
		return (Number.isFinite(remaining) && (remaining >= 0)) ? remaining : null;
	}

	/* The nearest clock is the only one the book's countdown is about. */
	function _lowestRemaining(actor) {
		let lowest = null;
		for (const effect of actor?.effects ?? []) {
			const remaining = _remainingOf(effect.getFlag(GMM_MODULE_TITLE, GMM_CLOCK_FLAG));
			if (remaining === null) continue;
			if ((lowest === null) || (remaining < lowest)) lowest = remaining;
		}
		return lowest;
	}

	return {
		init: init,
		getSettings: getSettings,
		buildStyle: buildStyle,
		fontSizeFor: fontSizeFor,
		labelFor: labelFor,
		repaintAll: repaintAll
	};
})();

export default DeferralCountdown;
