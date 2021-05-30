export const GMM_ACTION_BLUEPRINT = {
	vid: 1,
	type: "item",
	data: {
		description: {
			image: "icons/svg/mystery-man.svg",
			name: "Monster",
			text: null
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
		target: {
			value: null,
			units: null,
			type: null,
			width: null
		},
		range: {
			value: null,
			long: null,
			units: null,
		},
		duration: {
			value: null,
			units: null
		},
		uses: {
			value: null,
			maximum: null,
			per: null
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
			message: null
		}
	}
};
