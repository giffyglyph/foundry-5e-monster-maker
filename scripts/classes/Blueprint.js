import MonsterBlueprint from './MonsterBlueprint.js';

const Blueprint = (function() {

    function prepareBlueprint(type, ...data) {

        switch(type) {
            case "monster":
                return MonsterBlueprint.prepareBlueprint(type, ...data);
                break;
            default:
                throw `Blueprint type [${type}] is not supported.`; 
                break;
        }
    }

    return {
		prepareBlueprint: prepareBlueprint
	};
})();

export default Blueprint;