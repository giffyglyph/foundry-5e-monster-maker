export const MONSTER_ROLES = {
    controller: {
        armor_class: -2,
        hit_points: 1,
        attack_bonus: 0,
        damage_per_action: 1,
        saving_throws: -1,
        attack_dcs: 0
    },
    defender: {
        armor_class: 2,
        hit_points: 1,
        attack_bonus: 0,
        damage_per_action: 1,
        saving_throws: 1,
        attack_dcs: 0
    },
    lurker: {
        armor_class: -4,
        hit_points: 0.5,
        attack_bonus: 2,
        damage_per_action: 1.5,
        saving_throws: -2,
        attack_dcs: 2
    },
    scout: {
        armor_class: -2,
        hit_points: 1,
        attack_bonus: 0,
        damage_per_action: 0.75,
        saving_throws: -1,
        attack_dcs: 0
    },
    sniper: {
        armor_class: 0,
        hit_points: 0.75,
        attack_bonus: 0,
        damage_per_action: 1.25,
        saving_throws: 0,
        attack_dcs: 0
    },
    striker: {
        armor_class: -4,
        hit_points: 1.25,
        attack_bonus: 2,
        damage_per_action: 1.25,
        saving_throws: -2,
        attack_dcs: 2
    },
    supporter: {
        armor_class: -2,
        hit_points: 0.75,
        attack_bonus: 0,
        damage_per_action: 0.75,
        saving_throws: -1,
        attack_dcs: 0
    },
    custom: {
        armor_class: 0,
        hit_points: 1,
        attack_bonus: 0,
        damage_per_action: 1,
        saving_throws: 0,
        attack_dcs: 0
    }
};