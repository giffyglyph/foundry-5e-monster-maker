/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
    return loadTemplates([
      "modules/giffyglyphs-5e-monster-maker/templates/partials/monster_options.html",
      "modules/giffyglyphs-5e-monster-maker/templates/partials/monster_view.html"
    ]);
  };
  