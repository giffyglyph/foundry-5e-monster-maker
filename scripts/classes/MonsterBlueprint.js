import { DEFAULT_MONSTER_BLUEPRINT } from "../consts/DefaultMonsterBlueprint.js";
import { MONSTER_RANKS } from "../consts/MonsterRanks.js";
import { MONSTER_ROLES } from "../consts/MonsterRoles.js";

const MonsterBlueprint = (function() {

    function prepareBlueprint(type, ...data) {
        let blueprint = $.extend(true, {}, DEFAULT_MONSTER_BLUEPRINT, ...data);

        if (blueprint.data.combat.rank.modifiers == null) {
			blueprint.data.combat.rank.modifiers = MONSTER_RANKS[blueprint.data.combat.rank.type];
		}

		if (blueprint.data.combat.role.modifiers == null) {
			blueprint.data.combat.role.modifiers = MONSTER_ROLES[blueprint.data.combat.role.type];
		}

        blueprint.type = type;
        return blueprint;
    }

    return {
		prepareBlueprint: prepareBlueprint
	};
})();

export default MonsterBlueprint;