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
		initiative: {
			ability: "dex",
			advantage: false,
			modifier: null,
			override: false
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
			die_size: 4,
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
		proficiency_bonus: {
			modifier: null,
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
		},
		languages: {
			aarakocra: false,
			abyssal: false,
			aquan: false,
			auran: false,
			celestial: false,
			common: false,
			deep_speech: false,
			draconic: false,
			druidic: false,
			dwarvish: false,
			elvish: false,
			giant: false,
			gith: false,
			gnoll: false,
			gnomish: false,
			goblin: false,
			halfling: false,
			ignan: false,
			infernal: false,
			orc: false,
			primordial: false,
			sylvan: false,
			terran: false,
			thieves_cant: false,
			undercommon: false,
			other: null
		},
		damage_resistances: {
			acid: false,
			bludgeoning: false,
			cold: false,
			fire: false,
			force: false,
			lightning: false,
			necrotic: false,
			physical: false,
			piercing: false,
			poison: false,
			psychic: false,
			radiant: false,
			slashing: false,
			thunder: false,
			other: null
		},
		damage_vulnerabilities: {
			acid: false,
			bludgeoning: false,
			cold: false,
			fire: false,
			force: false,
			lightning: false,
			necrotic: false,
			physical: false,
			piercing: false,
			poison: false,
			psychic: false,
			radiant: false,
			slashing: false,
			thunder: false,
			other: null
		},
		damage_immunities: {
			acid: false,
			bludgeoning: false,
			cold: false,
			fire: false,
			force: false,
			lightning: false,
			necrotic: false,
			non_magical_physical: false,
			piercing: false,
			poison: false,
			psychic: false,
			radiant: false,
			slashing: false,
			thunder: false,
			other: null
		},
		condition_immunities: {
			blinded: false,
			charmed: false,
			deafened: false,
			diseased: false,
			exhaustion: false,
			frightened: false,
			grappled: false,
			incapacitated: false,
			invisible: false,
			paralyzed: false,
			petrified: false,
			poisoned: false,
			prone: false,
			restrained: false,
			stunned: false,
			unconcious: false,
			other: null
		},
		skills: {
			acrobatics: null,
			animal_handling: null,
			arcana: null,
			athletics: null,
			deception: null,
			history: null,
			insight: null,
			intimidation: null,
			investigation: null,
			medicine: null,
			nature: null,
			perception: null,
			performance: null,
			persuasion: null,
			religion: null,
			sleight_of_hand: null,
			stealth: null,
			survival: null
		},
		challenge_rating: {
			modifier: null,
			override: false
		},
		xp: {
			modifier: null,
			override: false
		}
	}
}