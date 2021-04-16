import MonsterFactory from './MonsterFactory.js';

const Factory = (function() {

	function createEntity(blueprint) {

		switch(blueprint.type) {
			case "monster":
				return MonsterFactory.createEntity(blueprint);
				break;
			default:
				throw `Blueprint type [${blueprint.type}] is not supported.`; 
				break;
		}
	}

	return {
		createEntity: createEntity
	};
})();

export default Factory;