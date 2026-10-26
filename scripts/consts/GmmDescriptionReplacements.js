/* Order matters: an earlier rule can shape the input a later one matches. */
export const GMM_DESCRIPTION_REPLACEMENTS = [
	{
		// `[[lookup @name lowercase]]{monster}` -> `[name]`
		pattern: /\[\[lookup\s+@name\s+lowercase\]\]\{monster\}/gi,
		replacement: "[name]"
	},
	{
		// `[[lookup @save.dc.value [activity=<id>]]]` -> the same activity DC, as a shortcode
		pattern: /\[\[lookup\s+@save\.dc\.value(?:\s+activity=[^\s\]]+)?\]\]/gi,
		replacement: "[featureDc]"
	},
	{
		// `[[lookup @target.template.size [activity=<id>]]]` -> `[target]`
		pattern: /\[\[lookup\s+@target\.template\.size(?:\s+activity=[^\s\]]+)?\]\]/gi,
		replacement: "[target]"
	},
	{
		// `[[lookup @range.value [activity=<id>]]]` -> `[range]`
		pattern: /\[\[lookup\s+@range\.value(?:\s+activity=[^\s\]]+)?\]\]/gi,
		replacement: "[range]"
	},
	{
		// `[[lookup @target.affects.special [activity=<id>]]]` -> literal "target" (not a shortcode)
		pattern: /\[\[lookup\s+@target\.affects\.special(?:\s+activity=[^\s\]]+)?\]\]/gi,
		replacement: "target"
	},
	{
		// `[[lookup @target.affects.type [activity=<id>]]]` -> literal "creature" (not a shortcode)
		pattern: /\[\[lookup\s+@target\.affects\.type(?:\s+activity=[^\s\]]+)?\]\]/gi,
		replacement: "creature"
	},
	{
		// strip `[[/attack extended]]` inline button
		pattern: /\[\[\/attack\s+extended\]\]/gi,
		replacement: ""
	},
	{
		// strip bare `[[/damage average|extended ...]]` (no formula). Must run before the general
		// damage rule so its formula capture can't grab `average`/`extended` as a fake formula.
		pattern: /\[\[\/damage(?:\s+(?:average|extended))+\s*\]\]/gi,
		replacement: ""
	}
];

/* Punctuation and HTML scaffolding count as empty, because substitution can leave both behind. */
export function isDescriptionEffectivelyEmpty(text) {
	if (typeof text !== "string" || !text.length) return true;
	const stripped = text
		.replace(/<[^>]*>/g, " ")
		.replace(/&[a-z#0-9]+;/gi, " ")
		.replace(/[\s\.,;:!\?\-\u2013\u2014\(\)\[\]\{\}"'`*_~]+/g, "");
	return stripped.length === 0;
}
