import { GMM_MODULE_TITLE } from '../consts/GmmModuleTitle.js';

const GMM_QUERY_TIMEOUT = 5000;

/* Midi's save and damage passes run on the client that used the activity, which is the attacker's rather
 * than the target's, so a write to the target rejects on permissions unless a GM makes it. */
const GmRouting = (function () {

	function _name(operation) {
		return `${GMM_MODULE_TITLE}.${operation}`;
	}

	// Named operations rather than a generic write, so a caller cannot ask for an arbitrary update.
	function register(operation, handler) {
		CONFIG.queries ??= {};
		CONFIG.queries[_name(operation)] = handler;
	}

	async function run(operation, data, subject) {
		const query = _name(operation);
		const handler = CONFIG.queries?.[query];
		if (!handler) return undefined;

		const gm = game.users.activeGM;
		try {
			if (gm?.isSelf) return await handler(data);
			if (gm) return await gm.query(query, data, { timeout: GMM_QUERY_TIMEOUT });
			// Owning the subject is the only way the write still lands with nobody to route to.
			if (subject?.isOwner) return await handler(data);
			throw new Error("no active GM is connected");
		} catch (error) {
			console.warn(`GMM | ${operation} did not reach a GM: ${error.message}`);
			ui.notifications?.warn(game.i18n.localize("gmm.routing.failed"));
			return undefined;
		}
	}

	return {
		register: register,
		run: run
	};
})();

export default GmRouting;
