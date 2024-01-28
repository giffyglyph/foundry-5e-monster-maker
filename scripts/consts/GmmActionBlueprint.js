export const GMM_ACTION_BLUEPRINT = {
	vid: 1,
	type: "action",
	data: {
		description: {
			image: "icons/svg/clockwork.svg",
			name: "Scaling Action",
			text: null
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
			value: "",
			units: ""
		},
		uses: {
			value: "",
			maximum: "",
			per: ""
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
			message: null,
			related_stat: "str"
		}
	}
};
