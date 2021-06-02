const Shortcoder = (function() {

	const SHORTCODES = [
		{ code: "level", data: "level.value" },
		{ code: "attackBonus", data: "attack_bonus.value" },
		{ code: "damage", data: "damage_per_action.value" },
		{ code: "dcPrimaryBonus", data: "attack_dcs.primary.value" },
		{ code: "dcSecondaryBonus", data: "attack_dcs.secondary.value" },
		{ code: "strMod", data: "ability_modifiers.str.value" },
		{ code: "dexMod", data: "ability_modifiers.dex.value" },
		{ code: "conMod", data: "ability_modifiers.con.value" },
		{ code: "intMod", data: "ability_modifiers.int.value" },
		{ code: "wisMod", data: "ability_modifiers.wis.value" },
		{ code: "chaMod", data: "ability_modifiers.cha.value" },
		{ code: "strSave", data: "saving_throws.str.value" },
		{ code: "dexSave", data: "saving_throws.dex.value" },
		{ code: "conSave", data: "saving_throws.con.value" },
		{ code: "intSave", data: "saving_throws.int.value" },
		{ code: "wisSave", data: "saving_throws.wis.value" },
		{ code: "chaSave", data: "saving_throws.cha.value" },
		{ code: "proficiency", data: "proficiency_bonus.value" },
		{ code: "xp", data: "xp.value" },
		{ code: "cr", data: "challenge_rating.value" },
		{ code: "ac", data: "armor_class.value" },
		{ code: "hpMax", data: "hit_points.maximum.value" },
		{ code: "damageDie", data: "damage_per_action.die_size" }
	];

	function replaceShortcodes(text, monsterData) {
		return text.replace(/\[.*?\]/g, (token) => {
			SHORTCODES.forEach((x) => {
				if (hasProperty(monsterData, x.data)) {
					try {
						let regex = new RegExp(`\\b${x.code}\\b`, 'gi');
						token = token.replace(regex, getProperty(monsterData, x.data));
					} catch (e) {
						console.error(e);
					}
				}
			});
			try {
				token = token.replace(/\[(.*?)(, *?d(\d+))?\]/g, (token, t1, t2, t3) => _numberToRandom(token, t1, t3));
			} catch (e) {
				console.error(e);
			}
			return token;
		});
	}

	function _numberToRandom(token, value, die) {
		try {
			let valueMath = math.evaluate(value);
			if (die != undefined) {
				let scale = (Number(die) + 1) / 2;
				let dice = Math.floor(valueMath / scale);
				let modifier = valueMath - Math.floor(dice * scale);

				if (dice > 0) {
					return dice + "d" + die + ((modifier != 0) ? (" " + ((modifier > 0) ? "+ " : "− ") + Math.abs(modifier)) : "");
				} else {
					return valueMath;
				}
			} else {
				return valueMath;
			}
		} catch (e) {
			console.error(e);
			return token;
		}
	}

	return {
		replaceShortcodes: replaceShortcodes
	};
})();

export default Shortcoder;