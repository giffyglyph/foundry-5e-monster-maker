const ActionForge = (function() {

	function createArtifact(blueprint) {
		return {
			vid: 1,
			type: blueprint.type,
			data: {
				image: blueprint.data.description.image,
				name: _parseName(blueprint.data.description.name),
				type: _parseType(blueprint.data.activation.type),
				level_requirement: _parseLevelRequirement(blueprint.data.requirements.level.min, blueprint.data.requirements.level.max),
				rank_requirement: _parseRankRequirement(blueprint.data.requirements.rank),
				role_requirement: _parseRoleRequirement(blueprint.data.requirements.role),
				description: _parseDescription(blueprint.data.description.text),
				activation_time: _parseActivationTime(blueprint.data.activation),
				activation_cost: _parseActivationCost(blueprint.data.resource_consumption),
				target: _parseTarget(blueprint.data.target),
				range: _parseRange(blueprint.data.range),
				duration: _parseDuration(blueprint.data.duration),
				uses: _parseUses(blueprint.data.uses),
				attack: _parseAttack(blueprint.data.attack),
				recharge: _parseRecharge(blueprint.data.recharge),
				damage: _parseDamage(blueprint.data.attack)
			}
		};
	}

	function _parseName(name) {
		return (name && name.trim().length > 0) ? name.trim() : "???";
	}

	function _parseType(type) {
		return game.i18n.format(`gmm.action.artifact.action_type.${!type || type == "none" ? "trait" : type}`);
	}

	function _parseLevelRequirement(min, max) {
		if (min === null && max === null) {
			return game.i18n.format(`gmm.common.level.any`);
		} else if (min !== null && max !== null) {
			if (min == max) {
				return game.i18n.format(`gmm.common.level.single`, { level: min });
			} else {
				return game.i18n.format(`gmm.common.level.range`, { min: min, max: max });
			}
		} else if (max === null) {
			return game.i18n.format(`gmm.common.level.min`, { min: min });
		} else {
			return game.i18n.format(`gmm.common.level.max`, { max: max });
		}
	}

	function _parseRankRequirement(rank) {
		return game.i18n.format(`gmm.common.rank.${rank ? rank : "any"}`);
	}

	function _parseRoleRequirement(role) {
		return game.i18n.format(`gmm.common.role.${role ? role : "any"}`);
	}

	function _parseDescription(text) {
		return text;
	}

	function _parseActivationTime(activation) {
		if (activation.type) {
			let output = game.i18n.format(`gmm.action.artifact.activation.${activation.type}.${activation.cost > 1 ? "multiple" : "single"}`, { quantity: activation.cost});
			if (activation.condition) {
				output += ` (${activation.condition})`;
			}
			return output;
		} else {
			return "";
		}
	}

	function _parseTarget(target) {
		if (target.type) {
			switch (target.type) {
				case "self":
					return game.i18n.format(`gmm.action.labels.self`);
				case "ally":
				case "enemy":
				case "creature":
				case "object":
					return game.i18n.format(`gmm.action.labels.${target.type}.${target.value > 1 ? "multiple" : "single"}`, { quantity: Math.max(1, target.value) });
				case "line":
				case "wall":
					if (target.units) {
						if (["ft", "mi"].includes(target.units)) {
							let area = game.i18n.format(`gmm.action.labels.size.${target.units}.double`, { x: Math.max(1, target.value), y: Math.max(1, target.width) });
							return game.i18n.format(`gmm.action.labels.${target.type}`, { area: area });
						} else {
							return "";
						}
					} else {
						return "";
					}
				default:
					if (target.units) {
						if (["ft", "mi"].includes(target.units)) {
							let size = game.i18n.format(`gmm.action.labels.size.${target.units}.single`, { x: Math.max(1, target.value) });
							return game.i18n.format(`gmm.action.labels.${target.type}`, { size: size });
						} else {
							return "";
						}
					} else {
						return "";
					}
			}
		} else {
			return "";
		}
	}

	function _parseRange(range) {
		switch (range.units) {
			case "any":
			case "self":
			case "touch":
			case "spec":
				return game.i18n.format(`gmm.action.artifact.range.${range.units}`);
			case "ft":
			case "mi":
				if (range.value === null || range.value <= 0) {
					return "";
				} else {
					return game.i18n.format(`gmm.action.artifact.range.${range.units}.${range.long > 0 ? "long" : "normal"}`, { normal: range.value, long: range.long});
				}
			default:
				return "";
		}
	}

	function _parseDuration(duration) {
		if (duration.units) {
			switch (duration.units) {
				case "perm":
				case "spec":
				case "inst":
					return game.i18n.format(`gmm.action.artifact.duration.${duration.units}`);
				default:
					return game.i18n.format(`gmm.action.artifact.duration.${duration.units}.${duration.value > 1 ? "multiple" : "single"}`, { quantity: duration.value});
			}
		} else {
			return "";
		}
	}

	function _parseUses(uses) {
		if (uses.per && uses.max !== null) {
			let output = "";
			switch (uses.per) {
				case "sr":
				case "lr":
				case "day":
					output = game.i18n.format(`gmm.action.artifact.uses.${uses.per}`, { quantity: uses.max});
					break;
				case "charges":
					output = game.i18n.format(`gmm.action.artifact.uses.charges.${uses.max > 1 ? "multiple" : "single"}`, { quantity: uses.max});
					break;
			}
			if (uses.value !== null && uses.value < uses.max) {
				output += ` (${game.i18n.format(`gmm.action.artifact.uses.remaining`, { quantity: Math.max(0, uses.value)})})`;
			}
			return output;
		} else {
			return "";
		}
	}

	function _parseActivationCost(cost) {
		return cost;
	}

	function _parseAttack(attack) {
		switch (attack.type) {
			case "mwak":
			case "msak":
			case "rwak":
			case "rsak":
				return game.i18n.format(`gmm.action.artifact.attack.${attack.type}`, {
					bonus: `[attackBonus]${attack.bonus ? ` + ${attack.bonus}` : ``}`
				});
			case "save":
				return game.i18n.format(`gmm.action.artifact.attack.dc.${attack.defense}`, {
					dc: `[dcPrimaryBonus]${attack.bonus ? ` + ${attack.bonus}` : ``}`
				});
			case "other":
				return game.i18n.format(`gmm.action.artifact.attack.dc.${attack.defense}`, {
					dc: `[dcSecondaryBonus]${attack.bonus ? ` + ${attack.bonus}` : ``}`
				});
			default:
				return "";
		}
	}

	function _parseDamage(attack) {
		if (attack.type && attack.damage.formula) {
			if (attack.damage.type) {
				return `${attack.damage.formula} ${game.i18n.format(`gmm.common.damage.${attack.damage.type}`).toLowerCase()} damage`;
			} else {
				return `${attack.damage.formula}`;
			}
		} else {
			return "";
		}
	}

	function _parseRecharge(recharge) {
		if (recharge.value) {
			if (recharge.is_charged) {
				return `${recharge.value == 6 ? "6" : recharge.value + '-6'} (charged)`;
			} else {
				return `${recharge.value == 6 ? "6" : recharge.value + '-6'}`;
			}
		} else {
			return "";
		}
	}

	return {
		createArtifact: createArtifact
	};
})();

export default ActionForge;