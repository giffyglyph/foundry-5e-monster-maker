export const GMM_ACTION_BLUEPRINT = {
	vid: 1,
	type: "action",
	data: {
		description: {
			image: "icons/svg/clockwork.svg",
			name: "Scaling Action",
			text: ""
		},
		display: {
			layout: "",
			color: {
				primary: "",
				secondary: ""
			},
			skin: {
				artifact: "",
				blueprint: ""
			}
		},
		requirements: {
			level: {
				min: null,
				max: null
			},
			rank: null,
			role: null
		},
		activation: {
			cost: null,
			type: null,
			condition: null
		},
		cover: null,
		deferral: {
			type: null,
			timer: null,
			cancel: null
		},
		effects: {
			always_show: false
		},
		target: {
			value: null,
			units: null,
			type: "creature",
			width: null,
			affects_self: false
		},
		// Top-level rather than inside `target`, which round-trips to the activity and would drop it.
		zone: {
			terrain: [],
			rules: [],
			audience: "any",
			once_per_turn: true
		},
		range: {
			value: null,
			long: null,
			units: null,
		},
		rarity: "common",
		duration: {
			type: "instant",
			value: "",
			units: "",
			save: {
				ability: "",
				modifier: {
					value: "",
					override: false
				}
			},
			reapplies: "",
			cancel: ""
		},
		uses: {
			value: "",
			maximum: "",
			per: ""
		},
		properties: {
			concentration: {
				checked: false
			}
		},
		resource_consumption: {
			type: null,
			target: null,
			amount: null
		},
		recharge: {
			value: null,
			is_charged: false
		},
		attack: {
			type: null,
			defense: "str",
			bonus: null,
			damage: {
				formula: null,
				type: null
			},
			miss: {
				percentage: null
			},
			message: null,
			related_stat: "max"
		}
	}
};
