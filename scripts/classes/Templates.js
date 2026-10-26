import { GMM_MODULE_TITLE } from "../consts/GmmModuleTitle.js";

const Templates = (function() {

	function getRelativePath(path) {
		return `modules/${GMM_MODULE_TITLE}/templates/${path}`;
	}

	async function preloadTemplates() {

		return foundry.applications.handlebars.loadTemplates([
			getRelativePath("monster/skins/vanity/partials/blueprint_item.html"),
			getRelativePath("monster/skins/vanity/partials/blueprint_effect.html"),
			getRelativePath("monster/skins/vanity/partials/blueprint_condition.html"),
			getRelativePath("monster/skins/vanity/partials/artifact_loot.html"),
			getRelativePath("monster/skins/vanity/partials/artifact_action.html"),
			getRelativePath("monster/skins/vanity/partials/artifact_spell.html"),
			getRelativePath("monster/skins/vanity/blueprint.html"),
			getRelativePath("monster/skins/vanity/artifact.html"),
			getRelativePath("action/skins/vanity/blueprint.html"),
			getRelativePath("action/skins/vanity/artifact.html"),
			getRelativePath("chat/deferral-resolution.html"),
			getRelativePath("settings/deferral-countdown.html")
		]);
	};

	function registerTemplateHelpers() {

		// About 40 forge templates still use the legacy `{{#select VALUE}}` block, so the helper stays.
		Handlebars.registerHelper('select', function(selected, options) {
			const value = (selected === null || selected === undefined) ? "" : String(selected);
			const escaped = Handlebars.Utils.escapeExpression(value)
				.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const rgx = new RegExp(` value=["']${escaped}["']`);
			const html = options.fn(this);
			return html.replace(rgx, "$& selected");
		});

		Handlebars.registerHelper('includes', function(list, value) {
			return Array.isArray(list) && list.includes(value);
		});

		Handlebars.registerHelper('json', function (context) {
			return JSON.stringify(context);
		});

		Handlebars.registerHelper('strlen', function(str) {
			return String(str).length;
		});

		Handlebars.registerHelper('repeat', function(n, block) {
			var accum = '';
			for(var i = 0; i < n; ++i)
				accum += block.fn(i);
			return accum;
		});

		Handlebars.registerHelper('for', function(from, to, incr, block) {
			var accum = '';
			for(var i = from; i < to; i += incr)
				accum += block.fn(i);
			return accum;
		});

		Handlebars.registerHelper('parseSources', function(sources) {
			if (sources) {
				return sources.map((x) => {
					return game.i18n.format('gmm.common.derived_source.from', { value: x.value, source: x.source });
				}).join(",&#010;");
			} else {
				return "";
			}
		});

		Handlebars.registerHelper('getSkillProficiency', function(skills, code, role) {
			if (skills) {
				let skill = skills.find((x) => x.code == code);
				return (skill) ? skill.value : 0;
			} else {
				return 0;
			}
		});
		Handlebars.registerHelper('ifParagonShow', function () {

		});
		Handlebars.registerHelper('modSkillsExist', function (skills) {
			return (skills.find((x) => x.value > 0))
		});

		Handlebars.registerHelper('getSaveTrain', function (saves, code) {
			return saves[code].trained;
		});

		Handlebars.registerHelper('formatChallengeRating', function(cr) {
			switch (cr) {
				case 0.125:
					return "1/8";
					break;
				case 0.25:
					return "1/4";
					break;
				case 0.5:
					return "1/2";
					break;
				default:
					return cr;
					break;
			}
		});

		Handlebars.registerHelper('add', function(...args) {
			return args.slice(0, -1).reduce((a, b) => a + b, 0);
		});

		Handlebars.registerHelper('getTemplate', function(path) {
			return getRelativePath(path);
		});


		Handlebars.registerHelper('isTstOverLimit', function (trainedSaves, maxTst) {
			return Object.values(trainedSaves ?? {}).filter((x) => x?.trained).length > maxTst;
		});
	}

	return {
		preloadTemplates: preloadTemplates,
		registerTemplateHelpers: registerTemplateHelpers,
		getRelativePath: getRelativePath
	};
})();

export default Templates;