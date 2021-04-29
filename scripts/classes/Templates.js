const Templates = (function() {

	async function preloadTemplates() {

		return loadTemplates([
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/ability_ranking.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/condition_immunity.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/damage_immunity.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/damage_resistance.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/damage_vulnerability.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/language.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/monster_modifier.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/save_ranking.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/components/skill.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/about.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/ability_check.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/basic_attack_ac.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/basic_attack_save.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/basic_damage.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/modifiers.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/modifying_abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/ranked_abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/saving_throw.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/modals/tags.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/armor_class.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/attack_bonus.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/attack_dcs.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/biography.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/combat.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/condition_immunities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/cr.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/damage_immunities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/damage_resistances.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/damage_vulnerabilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/damage.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/description.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/display.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/hit_points.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/initiative.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/languages.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/lair_actions.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/legendary_actions.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/legendary_resistances.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/paragon_actions.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/perception.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/proficiency.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/saving_throws.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/senses.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/skills.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/speeds.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/blueprints/xp.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/abilities.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/biography.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/blocks.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/header.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/lair_actions.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/legendary_actions.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/legendary_resistances.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/paragon_actions.html",
			"modules/giffyglyphs-5e-monster-maker/templates/partials/monster/views/vanity/vanity.html"
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
					return game.i18n.format('gg5e_mm.monster.source.from', { value: x.value, source: x.source });
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
	}

	return {
		preloadTemplates: preloadTemplates,
		registerTemplateHelpers: registerTemplateHelpers
	};
})();

export default Templates;