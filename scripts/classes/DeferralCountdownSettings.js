import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';
import {
	GMM_DEFERRAL_COUNTDOWN_DEFAULTS,
	GMM_DEFERRAL_COUNTDOWN_HORIZONTAL,
	GMM_DEFERRAL_COUNTDOWN_SETTING,
	GMM_DEFERRAL_COUNTDOWN_VERTICAL
} from '../consts/GmmDeferralCountdown.js';
import DeferralCountdown from './DeferralCountdown.js';

const GMM_PREVIEW_SAMPLE = 3;

export default class DeferralCountdownSettings extends foundry.applications.api.HandlebarsApplicationMixin(
	foundry.applications.api.ApplicationV2
) {

	/** @inheritDoc */
	static DEFAULT_OPTIONS = {
		id: "gmm-deferral-countdown-settings",
		tag: "form",
		position: { width: 480, height: "auto" },
		window: { title: "gmm.settings.deferral_countdown.title", contentClasses: ["standard-form"] },
		form: { handler: DeferralCountdownSettings.#onSubmit, closeOnSubmit: true }
	};

	/** @inheritDoc */
	static PARTS = {
		form: { template: `modules/${GMM_MODULE_TITLE}/templates/settings/deferral-countdown.html` },
		footer: { template: "templates/generic/form-footer.hbs" }
	};

	/** @inheritDoc */
	async _prepareContext(options) {
		const config = DeferralCountdown.getSettings();
		return {
			...(await super._prepareContext(options)),
			config: config,
			vertical: this.#choices(GMM_DEFERRAL_COUNTDOWN_VERTICAL, "vertical", config.vertical),
			horizontal: this.#choices(GMM_DEFERRAL_COUNTDOWN_HORIZONTAL, "horizontal", config.horizontal),
			fonts: this.#fonts(config.font),
			buttons: [{ type: "submit", icon: "fa-solid fa-save", label: "SETTINGS.Save" }]
		};
	}

	/* The form outlives its own contents across a re-render, so one listener here covers every render. */
	_onFirstRender(context, options) {
		super._onFirstRender(context, options);
		for (const event of ["change", "input"]) {
			this.element.addEventListener(event, () => this.#drawPreviews());
		}
	}

	/** @inheritDoc */
	_onRender(context, options) {
		super._onRender(context, options);
		this.#drawPreviews();
	}

	#choices(codes, group, selected) {
		return codes.map(code => ({
			value: code,
			label: game.i18n.localize(`gmm.settings.deferral_countdown.${group}.${code}`),
			selected: code === selected
		}));
	}

	/* A font the world has since dropped would otherwise vanish from the list and silently reset the badge. */
	#fonts(selected) {
		const families = Object.keys(foundry.applications.settings.menus.FontConfig.getAvailableFontChoices());
		if (selected && !families.includes(selected)) families.unshift(selected);
		return families.map(family => ({ value: family, label: family, selected: family === selected }));
	}

	/* The live form, not the saved setting, so the preview answers what the GM is about to save. */
	#readForm() {
		return DeferralCountdownSettings.#merge(new foundry.applications.ux.FormDataExtended(this.element).object);
	}

	/* A custom element that has not upgraded yet reports no value. Spreading that would store undefined. */
	static #merge(submitted) {
		const merged = { ...GMM_DEFERRAL_COUNTDOWN_DEFAULTS };
		for (const [key, value] of Object.entries(submitted ?? {})) {
			if ((key in merged) && (value !== undefined) && (value !== null) && (value !== "")) merged[key] = value;
		}
		return merged;
	}

	#drawPreviews() {
		const config = this.#readForm();
		for (const element of this.element.querySelectorAll("canvas[data-gmm-preview]")) {
			this.#drawPreview(element, config, element.dataset.gmmPreview === "due");
		}
	}

	/* The same TextStyle the token draws, so a font, size or color that fails here fails on the canvas too. */
	#drawPreview(element, config, due) {
		const { width, height } = element;
		const context = element.getContext("2d");
		context.clearRect(0, 0, width, height);

		context.fillStyle = "#b0b0b0";
		context.fillRect(0, 0, width / 2, height);
		context.fillStyle = "#303030";
		context.fillRect(width / 2, 0, width / 2, height);
		if (!config.enabled) return;

		const fontSize = DeferralCountdown.fontSizeFor(config, width, height);
		const style = DeferralCountdown.buildStyle(config, { fontSize, due });
		const x = { left: 0, center: 0.5, right: 1 }[config.horizontal] ?? 0.5;
		const y = { top: 0, center: 0.5, bottom: 1 }[config.vertical] ?? 0.5;
		const label = DeferralCountdown.labelFor(due ? 0 : GMM_PREVIEW_SAMPLE);

		context.font = style.toFontString();
		context.textAlign = { left: "left", center: "center", right: "right" }[config.horizontal] ?? "center";
		context.textBaseline = { top: "top", center: "middle", bottom: "bottom" }[config.vertical] ?? "middle";
		context.shadowColor = style.dropShadowColor;
		context.shadowBlur = style.dropShadowBlur;
		context.lineWidth = style.strokeThickness;
		context.strokeStyle = style.stroke;
		context.strokeText(label, width * x, height * y);
		context.shadowBlur = 0;
		context.fillStyle = style.fill;
		context.fillText(label, width * x, height * y);
	}

	static async #onSubmit(event, form, formData) {
		const submitted = DeferralCountdownSettings.#merge(formData.object);
		await game.settings.set(GMM_MODULE_TITLE, GMM_DEFERRAL_COUNTDOWN_SETTING, submitted);
	}
}
