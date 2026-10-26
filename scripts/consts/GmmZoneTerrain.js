/* Keyed by the book's modifier, valued by what carries it onto a placed area. */
export const GMM_ZONE_TERRAIN = {
	difficult: "difficult",
	half_cover: "document",
	lightly_obscured: "document",
	loud: "document",
	uncomfortable: "document",
	unstable: "document",
	damaging: "damaging",
	heavily_obscured: "darkness",
	three_quarters_cover: "document",
	impassable: "none",
	magical_darkness: "darkness",
	total_cover: "document",
	vacuum: "document",
	custom: "none"
};

export const GMM_ZONE_TERRAIN_TYPES = Object.keys(GMM_ZONE_TERRAIN);
