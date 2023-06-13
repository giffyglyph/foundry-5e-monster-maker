import { GMM_MODULE_TITLE } from "../consts/GmmModuleTitle.js";

const Templates = (function() {

	function getRelativePath(path) {
		return `modules/${GMM_MODULE_TITLE}/templates/${path}`;
	}

	async function preloadTemplates() {

		return loadTemplates([
			getRelativePath("monster/skins/vanity/partials/blueprint_item.html"),
			getRelativePath("monster/skins/vanity/partials/artifact_loot.html"),
			getRelativePath("monster/skins/vanity/partials/artifact_action.html"),
			getRelativePath("monster/skins/vanity/partials/artifact_spell.html"),
			getRelativePath("monster/skins/vanity/blueprint.html"),
			getRelativePath("monster/skins/vanity/artifact.html"),
			getRelativePath("action/skins/vanity/blueprint.html"),
			getRelativePath("action/skins/vanity/artifact.html")
		]);
	};

	function registerTemplateHelpers() {

		Handlebars.registerHelper('concat', function(...args) {
			return args.slice(0, -1).join('');
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
				//if (!skill) skill = role.skill_prof.find((x) => x.code == code);
				return (skill) ? skill.value : 0;
			} else {
				return 0;
			}
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

		Handlebars.registerHelper('getTstCount', function (maxTst) {
			var checkedChecks = document.querySelectorAll(".tstCheckbox:checked");
			return checkedChecks.length > maxTst;
		});

		Handlebars.registerHelper({
			eq: (v1, v2) => v1 === v2,
			ne: (v1, v2) => v1 !== v2,
			lt: (v1, v2) => v1 < v2,
			gt: (v1, v2) => v1 > v2,
			lte: (v1, v2) => v1 <= v2,
			gte: (v1, v2) => v1 >= v2,
			and() {
				return Array.prototype.every.call(arguments, Boolean);
			},
			or() {
				return Array.prototype.slice.call(arguments, 0, -1).some(Boolean);
			}
	});
	}

	return {
		preloadTemplates: preloadTemplates,
		registerTemplateHelpers: registerTemplateHelpers,
		getRelativePath: getRelativePath
	};
})();

export default Templates;