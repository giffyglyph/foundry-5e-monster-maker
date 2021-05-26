const Templates = (function() {

	async function preloadTemplates() {

		return loadTemplates([
			"modules/giffyglyphs-5e-monster-maker/templates/monster/skins/vanity/partials/blueprint_item.html",
			"modules/giffyglyphs-5e-monster-maker/templates/monster/skins/vanity/partials/artifact_item.html",
			"modules/giffyglyphs-5e-monster-maker/templates/monster/skins/vanity/partials/monster_modifier.html",
			"modules/giffyglyphs-5e-monster-maker/templates/monster/skins/vanity/blueprint.html",
			"modules/giffyglyphs-5e-monster-maker/templates/monster/skins/vanity/artifact.html",
			"modules/giffyglyphs-5e-monster-maker/templates/action/skins/vanity/blueprint.html",
			"modules/giffyglyphs-5e-monster-maker/templates/action/skins/vanity/artifact.html"
		]);
	};

	function registerTemplateHelpers() {

		Handlebars.registerHelper('concat', function(...args) {
			return args.slice(0, -1).join('');
		});

		Handlebars.registerHelper('eq', function(a, b) {
			return a === b;
		});

		Handlebars.registerHelper('strlen', function(str) {
			return String(str).length;
		});

		Handlebars.registerHelper('toggleCustom', function(showCustom, options) {
			let html = options.fn(this);
			if (showCustom !== "custom") {
				html = html.replace(/input /g, "input type='hidden'");
			}
			return html;
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

		Handlebars.registerHelper('getSkillProficiency', function(skills, code) {
			if (skills) {
				const skill = skills.find((x) => x.code == code);
				return (skill) ? skill.value : 0;
			} else {
				return 0;
			}
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
	}

	return {
		preloadTemplates: preloadTemplates,
		registerTemplateHelpers: registerTemplateHelpers
	};
})();

export default Templates;