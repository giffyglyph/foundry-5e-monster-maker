import { GMM_ACTION_BLUEPRINT } from "../consts/GmmActionBlueprint.js";

const ActionBlueprint = (function() {

	const mappings = [
		{ from: "description.image", to: "img" },
		{ from: "description.name", to: "name" },
		{ from: "description.text", to: "data.description.value" },
		{ from: "activation.cost", to: "data.activation.cost" },
		{ from: "activation.type", to: "data.activation.type" },
		{ from: "activation.condition", to: "data.activation.condition" },
		{ from: "cover", to: "data.cover" },
		{ from: "target.value", to: "data.target.value" },
		{ from: "target.units", to: "data.target.units" },
		{ from: "target.type", to: "data.target.type" },
		{ from: "target.width", to: "data.target.width" },
		{ from: "range.value", to: "data.range.value" },
		{ from: "range.long", to: "data.range.long" },
		{ from: "range.units", to: "data.range.units" },
		{ from: "duration.value", to: "data.duration.value" },
		{ from: "duration.units", to: "data.duration.units" },
		{ from: "uses.units", to: "data.uses.value" },
		{ from: "uses.maximum", to: "data.uses.max" },
		{ from: "uses.per", to: "data.uses.per" },
		{ from: "resource_consumption.type", to: "data.consume.type" },
		{ from: "resource_consumption.target", to: "data.consume.target" },
		{ from: "resource_consumption.amount", to: "data.consume.amount" },
		{ from: "recharge.value", to: "data.recharge.value" },
		{ from: "recharge.is_charged", to: "data.recharge.charged" }
	];

	function createFromItem(item) {
		const blueprint = $.extend(true, {}, GMM_ACTION_BLUEPRINT, item.data.data.gmm ? _verifyBlueprint(item.data.data.gmm.blueprint) : null);
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
				if (hasProperty(item.data, x.to)) {
					setProperty(blueprintData, x.from, getProperty(item.data, x.to));
				}
			});

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

		return itemData;
	}

	return {
		createFromItem: createFromItem,
		getItemDataFromBlueprint: getItemDataFromBlueprint
	};
})();

export default ActionBlueprint;