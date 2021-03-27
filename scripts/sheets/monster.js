export default class ActorSheetMonster extends ActorSheet {

	/** @override */
	static get defaultOptions() {
		return mergeObject(
			super.defaultOptions,
			{
				classes: ["window-gg5e-mm"],
				height: 900,
				width: 540,
				template: 'modules/giffyglyphs-5e-monster-maker/templates/sheets/monster.html',
				resizable: true,
				tabs: [{navSelector: ".sheet__tabs__nav", contentSelector: ".sheet__tabs__body", initial: "front"}]
			}
		);
	}

	/** @override */
    getData() {
        const data = super.getData();
		data.gg5e_mm = {
			core: {
				level: 1,
				role: "striker",
				rank: "standard",
				players: 4
			},
			tags: [],
			ac: {
				value: 10,
				type: null
			},
			hp: {
				average: 33,
				roll: null
			},
			speeds: [
				{
					type: "normal",
					value: "30 ft."
				},
				{
					type: "burrow",
					value: "1"
				},
				{
					type: "climb",
					value: "2"
				},
				{
					type: "fly",
					value: "3"
				},
				{
					type: "swim",
					value: "4"
				},
				{
					type: "other",
					value: "5"
				}
			],
			"abilities": {
				"str": {
					"score": 16,
					"modifier": 3
				},
				"dex": {
					"score": 14,
					"modifier": 2
				},
				"con": {
					"score": 12,
					"modifier": 1
				},
				"int": {
					"score": 12,
					"modifier": 1
				},
				"wis": {
					"score": 10,
					"modifier": 0
				},
				"cha": {
					"score": 8,
					"modifier": -1
				}
			},
			"savingThrows": [
				{
					"ability": "str",
					"modifier": 3
				},
				{
					"ability": "dex",
					"modifier": 1
				},
				{
					"ability": "con",
					"modifier": 1
				},
				{
					"ability": "int",
					"modifier": -2
				},
				{
					"ability": "wis",
					"modifier": -2
				},
				{
					"ability": "cha",
					"modifier": -2
				}
			],
			"skills": [
				{
					"name": "acrobatics",
					"modifier": 4
				},
				{
					"name": "arcana",
					"modifier": 3
				},
				{
					"name": "religion",
					"modifier": 3
				}
			],
			"vulnerabilities": [],
			"resistances": [],
			"immunities": [
				"acid"
			],
			"conditions": [
				"blinded"
			],
			"senses": [
				{
					"type": "blindsight",
					"value": "1"
				},
				{
					"type": "darkvision",
					"value": "2"
				},
				{
					"type": "tremorsense",
					"value": "3"
				},
				{
					"type": "truesight",
					"value": "4"
				},
				{
					"type": "other",
					"value": "5"
				},
				{
					"type": "passive Perception",
					"value": 10
				}
			],
			"languages": [
				"123123",
				"goblin",
				"infernal"
			],
			"challenge": {
				"rating": "1/4",
				"proficiency": 2,
				"xp": 50
			},
			"traits": [
				{
					"name": "(Striker) Savage Assault",
					"detail": "Once per turn, add your level in extra damage to an attack."
				},
				{
					"name": "Shifty",
					"detail": "You can <i>Disengage</i> as a bonus action."
				}
			],
			"actions": [
				{
					"name": "Slash",
					"detail": "<i>Melee Weapon Attack:</i> +5 vs AC. <i>Hit:</i> 3 (1d4 + 1) slashing damage."
				},
				{
					"name": "Knockback",
					"detail": "<i>Melee Weapon Attack:</i> DC 13 vs Strength. <i>Hit:</i> the target is pushed up to 10 ft away."
				}
			],
			"reactions": [],
			"paragonActions": null,
			"legendaryActionsPerRound": 0,
			"legendaryActions": [],
			"lairActionsInitiative": 0,
			"lairActions": [],
			"notes": [
				"123123123123asdawdawd",
				"12312313aw awdawdawd",
				"123123awdaw dawd"
			],
			"initiative": null,
			"attack": {
				"bonus": 5,
				"damage": 3,
				"isActive": false,
				"isActiveSmaller": false
			},
			"dc": {
				"primary": 13,
				"secondary": 10
			},
			"isQuickstart": true
		};
		console.log(data);
        return data;
    }

	activateListeners(html) {
		html.find('.panel--collapsible .panel__header').click(this._togglePanelCollapse.bind(this));
		super.activateListeners(html);
	}

	_togglePanelCollapse(event) {
		const li = event.currentTarget.closest(".panel--collapsible");
		li.classList.toggle("collapsed");
	}
}
