import { GMM_MONSTER_RANKS } from "./GmmMonsterRanks.js";
import { GMM_MONSTER_ROLES } from "./GmmMonsterRoles.js";

export const GMM_MONSTER_BLUEPRINT = {
	vid: 1,
	type: "monster",
	data: {
		ability_modifiers: {
			modifier: {
				value: "",
				override: false
			},
			ranking: ["str", "dex", "con", "int", "wis", "cha"],
		},
		actions: {
			always_show: true,
			items: []
		},
		armor_class: {
			modifier: {
				value: null,
				override: false
			},
			type: ""
		},
		attack_bonus: {
			modifier: {
				value: null,
				override: false
			},
			type: ""
		},
		attack_dcs: {
			primary: {
				modifier: {
					value: null,
					override: false
				},
				type: ""
			},
			secondary: {
				modifier: {
					value: null,
					override: false
				},
				type: ""
			}
		},
		biography: {
			always_hide: true,
			text: ""
		},
		bonus_actions: {
			always_show: false,
			items: []
		},
		challenge_rating: {
			modifier: {
				value: null,
				override: false
			}
		},
		combat: {
			level: 1,
			rank: {
				type: "standard",
				custom_name: "",
				modifiers: GMM_MONSTER_RANKS["standard"]
			},
			role: {
				type: "striker",
				custom_name: "",
				modifiers: GMM_MONSTER_ROLES["striker"]
			}
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
			other: "",
			paralyzed: false,
			petrified: false,
			poisoned: false,
			prone: false,
			restrained: false,
			stunned: false,
			unconcious: false
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
			other: "",
			physical: false,
			piercing: false,
			poison: false,
			psychic: false,
			radiant: false,
			slashing: false,
			thunder: false
		},
		damage_per_action: {
			modifier: {
				value: null,
				override: false
			},
			die_size: "4",
			maximum_dice: 0,
			type: ""
		},
		damage_resistances: {
			acid: false,
			bludgeoning: false,
			cold: false,
			fire: false,
			force: false,
			lightning: false,
			necrotic: false,
			other: "",
			physical: false,
			piercing: false,
			poison: false,
			psychic: false,
			radiant: false,
			slashing: false,
			thunder: false
		},
		damage_vulnerabilities: {
			acid: false,
			bludgeoning: false,
			cold: false,
			fire: false,
			force: false,
			lightning: false,
			necrotic: false,
			other: "",
			physical: false,
			piercing: false,
			poison: false,
			psychic: false,
			radiant: false,
			slashing: false,
			thunder: false
		},
		description: {
			alignment: {
				category: "unaligned",
				custom: ""
			},
			image: "icons/svg/mystery-man.svg",
			name: "Monster",
			size: "medium",
			type: {
				category: "humanoid",
				custom: "",
				tags: "",
				swarm: ""
			}
		},
		display: {
			layout: "slide-in-left",
			color: {
				primary: "blue",
				secondary: "deep-orange"
			},
			skin: {
				artifact: "vanity",
				blueprint: "vanity"
			}
		},
		hit_points: {
			current: null,
			temporary: null,
			maximum: {
				modifier: {
					value: null,
					override: false
				}
			}
		},
		initiative: {
			ability: "dex",
			advantage: false,
			modifier: {
				value: null,
				override: false
			},
		},
		inventory: {
			always_show: false,
			currency: {
				always_show: false,
				cp: null,
				ep: null,
				gp: null,
				pp: null,
				sp: null
			},
			encumbrance: {
				always_show: false,
				powerful_build: false,
				weight: {
					modifier: {
						value: null,
						override: false
					}
				},
				capacity: {
					modifier: {
						value: null,
						override: false
					}
				}
			},
			items: []
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
		lair_actions: {
			always_show: false,
			initiative: null,
			items: []
		},
		legendary_actions: {
			always_show: false,
			items: []
		},
		legendary_resistances: {
			always_show: false,
			current: null,
			maximum: null
		},
		paragon_actions: {
			always_show: false,
			current: null,
			maximum: {
				modifier: {
					value: null,
					override: false
				}
			}
		},
		passive_perception: {
			modifier: {
				value: null,
				override: false
			},
		},
		proficiency_bonus: {
			modifier: {
				value: null,
				override: false
			},
		},
		reactions: {
			always_show: false,
			items: []
		},
		saving_throws: {
			method: "sync",
			ranking: ["str", "dex", "con", "int", "wis", "cha"],
			modifier: {
				value: "",
				override: false
			},
		},
		senses: {
			blindsight: null,
			darkvision: null,
			tremorsense: null,
			truesight: null,
			units: null,
			other: ""
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
		speeds: {
			walk: null,
			burrow: null,
			climb: null,
			fly: null,
			swim: null,
			units: "feet",
			can_hover: false,
			other: ""
		},
		spellbook: {
			always_show: false,
			spellcasting: {
				ability: "int",
				level: null,
				dc: {
					modifier: {
						value: null,
						override: false
					}
				}
			},
			slots: {
				1: {
					current: null,
					maximum: null
				},
				2: {
					current: null,
					maximum: null
				},
				3: {
					current: null,
					maximum: null
				},
				4: {
					current: null,
					maximum: null
				},
				5: {
					current: null,
					maximum: null
				},
				6: {
					current: null,
					maximum: null
				},
				7: {
					current: null,
					maximum: null
				},
				8: {
					current: null,
					maximum: null
				},
				9: {
					current: null,
					maximum: null
				},
				pact: {
					level: null,
					current: null,
					maximum: null
				}
			},
			spells: {
				0: [],
				1: [],
				2: [],
				3: [],
				4: [],
				5: [],
				6: [],
				7: [],
				8: [],
				9: [],
				other: []
			}
		},
		traits: {
			always_show: true,
			items: []
		},
		xp: {
			modifier: {
				value: null,
				override: false
			}
		}
	}
};
