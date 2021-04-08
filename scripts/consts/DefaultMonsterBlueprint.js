export const DEFAULT_MONSTER_BLUEPRINT = {
    vid: 1,
    type: "monster",
    data: {
        description: {
            size: "medium",
            type: {
                category: "humanoid",
                custom: null
            },
            tags: null,
            alignment: "unaligned"
        },
        combat: {
            level: 10,
            rank: {
                type: "standard",
                custom_name: null,
                modifiers: null
            },
            role: {
                type: "striker",
                custom_name: null,
                modifiers: null
            }
        },
        hit_points: {
            current: null,
            temporary: null,
            maximum: {
                modifier: null,
                override: false
            }
        },
        armor_class: {
            modifier: null,
            override: false,
            type: null
        },
        passive_perception: {
            modifier: null,
            override: false
        },
        attack_bonus: {
            modifier: null,
            override: false,
            type: null
        },
        attack_dcs: {
            primary: {
                modifier: null,
                override: false,
                type: null
            },
            secondary: {
                modifier: null,
                override: false,
                type: null
            }
        },
        damage_per_action: {
            modifier: null,
            override: false,
            dice_size: 4,
            maximum_dice: 0,
            type: null
        },
        ability_modifiers: {
            ranking: ["str", "dex", "con", "int", "wis", "cha"],
            modifiers: null,
            override: false,
        },
        saving_throws: {
            method: "sync",
            ranking: ["str", "dex", "con", "int", "wis", "cha"],
            modifiers: null,
            override: false
        },
        speeds: {
            walk: null,
            burrow: null,
            climb: null,
            fly: null,
            swim: null,
            units: "feet",
            can_hover: false
        },
        senses: {
            blindsight: null,
            darkvision: null,
            tremorsense: null,
            truesight: null,
            units: null,
            other: null
        }
    }
}