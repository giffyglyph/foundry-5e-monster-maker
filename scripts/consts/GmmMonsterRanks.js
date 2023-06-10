export const GMM_MONSTER_RANKS = {
	minion: {
		armor_class: 0,
		hit_points: 0.2,
		ability_bonus: 0,
		damage_per_action: 0.75,
		saving_throws: 1,
		attack_dcs: 0,
		initiative: 0,
		xp: 0.0625,
		threat: 1,
		paragon_actions: 0,
		paragon_defenses: 0,
		scale_with_players: false,
		target_players: 0.25,
		has_phases: false,
		phases: {
			current: 1,
			maximum: 1
		}
	},
	grunt: {
		armor_class: 0,
		hit_points: 1,
		ability_bonus: 0,
		damage_per_action: 1,
		saving_throws: 2,
		attack_dcs: 0,
		initiative: 0,
		xp: 0.25,
		threat: 2,
		paragon_actions: 0,
		paragon_defenses: 0,
		scale_with_players: false,
		target_players: 1,
		has_phases: false,
		phases: {
			current: 1,
			maximum: 1
		}
	},
	elite: {
		armor_class: 1,
		hit_points: 2,
		ability_bonus: 1,
		damage_per_action: 1.1,
		saving_throws: 3,
		attack_dcs: 0,
		initiative: 2,
		xp: 0.5,
		threat: 3,
		paragon_actions: 1,
		paragon_defenses: 0,
		scale_with_players: false,
		target_players: 2,
		has_phases: false,
		phases: {
			current: 1,
			maximum: 1
		}
	},
	paragon: {
		armor_class: 2,
		hit_points: 1,
		ability_bonus: 2,
		damage_per_action: 1.2,
		saving_throws: 3,
		attack_dcs: 0,
		initiative: 1,
		xp: 1,
		threat: 4,
		paragon_actions: 1,
		paragon_defenses: 1,
		scale_with_players: true,
		target_players: 4,
		has_phases: true,
		phases: {
			current: 1,
			maximum: 1
		}
	},
	custom: {
		armor_class: 0,
		hit_points: 1,
		attack_bonus: 0,
		damage_per_action: 1,
		saving_throws: 0,
		attack_dcs: 0,
		initiative: 0,
		xp: 1,
		threat: 1,
		paragon_actions: 0,
		paragon_defenses: 0,
		scale_with_players: false,
		target_players: 1,
		has_phases: false,
		phases: {
			current: 1,
			maximum: 1
		}
	}
};