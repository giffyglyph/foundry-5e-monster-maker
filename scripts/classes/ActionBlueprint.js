import { GMM_ACTION_BLUEPRINT } from "../consts/GmmActionBlueprint.js";

const ActionBlueprint = (function() {

	const mappings = [
		{ from: "description.image", to: "img" },
		{ from: "description.name", to: "name" },
		{ from: "description.text", to: "system.description.value" },
		{ from: "activation.cost", to: "system.activation.cost" },
		{ from: "activation.type", to: "system.activation.type" },
		{ from: "activation.condition", to: "system.activation.condition" },
		{ from: "cover", to: "system.cover" },
		{ from: "attack.type", to: "system.actionType" },
		{ from: "attack.bonus", to: "system.attackBonus" },
		{ from: "attack.defense", to: "system.save.ability" },
		{ from: "target.value", to: "system.target.value" },
		{ from: "target.units", to: "system.target.units" },
		{ from: "target.type", to: "system.target.type" },
		{ from: "target.width", to: "system.target.width" },
		{ from: "range.value", to: "system.range.value" },
		{ from: "range.long", to: "system.range.long" },
		{ from: "range.units", to: "system.range.units" },
		{ from: "duration.value", to: "system.duration.value" },
		{ from: "duration.units", to: "system.duration.units" },
		{ from: "uses.value", to: "system.uses.value" },
		{ from: "uses.max", to: "system.uses.max" },
		{ from: "uses.per", to: "system.uses.per" },
		{ from: "resource_consumption.type", to: "system.consume.type" },
		{ from: "resource_consumption.target", to: "system.consume.target" },
		{ from: "resource_consumption.amount", to: "system.consume.amount" },
		{ from: "recharge.value", to: "system.recharge.value" },
		{ from: "recharge.is_charged", to: "system.recharge.charged" },
		{ from: "attack.versatile.damage", to: "system.damage.versatile"},
		{ from: "attack.miss.damage", to: "system.formula"}
	];

	function createFromItem(item) {
		const blueprint = $.extend(true, {}, GMM_ACTION_BLUEPRINT, item.system.gmm ? _verifyBlueprint(item.system.gmm.blueprint) : null);
		return _syncItemDataToBlueprint(blueprint, item);
	}

	function _verifyBlueprint(blueprint) {
		switch (blueprint.vid) {
			case 1:
				// Blueprint is up-to-date and requires no changes.
				return blueprint;
				break;
			default:
				console.error(`This action blueprint has an invalid version id [${blueprint.vid}] and can't be verified.`, blueprint);
				return null;
				break;
		}
	}

	function _syncItemDataToBlueprint(blueprint, item) {
		const blueprintData = blueprint.data;

		try {
			mappings.forEach((x) => {
				if (hasProperty(item, x.to)) {
					setProperty(blueprintData, x.from, getProperty(item, x.to));
				}
			});

			// Set damage array
			if (hasProperty(item.system, "damage.parts")) {
				setProperty(blueprintData, "attack.hit.damage", item.system.damage?.parts.map((x) => {
					return {
						formula: x[0],
						type: x[1]
					};
				}));
			} else {
				setProperty(blueprintData, "attack.hit.damage", []);
			}

			return blueprint;
		} catch (error) {
			console.error("Failed to load blueprint data from the current item", error);
			return blueprint;
		}
	}

	function getItemDataFromBlueprint(blueprint) {
		const itemData = {};

		mappings.forEach((x) => {
			if (hasProperty(blueprint.data, x.from)) {
				setProperty(itemData, x.to, getProperty(blueprint.data, x.from));
			}
		});

		// Set damage array
		if (getProperty(blueprint.data, "attack.hit.damage")) {
			setProperty(itemData, "data.damage.parts", Object.values(getProperty(blueprint.data, "attack.hit.damage")).map((x) => {
				return [x.formula, x.type];
			}));
		} else {
			setProperty(itemData, "data.damage.parts", []);
		}

		return itemData;
	}

	return {
		createFromItem: createFromItem,
		getItemDataFromBlueprint: getItemDataFromBlueprint
	};
})();

export default ActionBlueprint;