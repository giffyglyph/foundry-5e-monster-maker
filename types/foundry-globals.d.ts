// Foundry exposes some namespaced members as globals too. Its own global.d.mts
// declares only a few of them, so the ones GMMC calls bare are declared here.
// Classes are re-declared as empty subclasses because a `const` of a class type
// supports neither `new` nor `extends`.

declare global {
	/**
	 * A simple event framework used throughout Foundry Virtual Tabletop.
	 * When key actions or events occur, a "hook" is defined where user-defined callback functions can execute.
	 */
	class Hooks extends foundry.helpers.Hooks {}

	class Roll extends foundry.dice.Roll {}
	class Actor extends foundry.documents.Actor {}
	class Item extends foundry.documents.Item {}
	class ActiveEffect extends foundry.documents.ActiveEffect {}
	class ChatMessage extends foundry.documents.ChatMessage {}
	class TokenDocument extends foundry.documents.TokenDocument {}
	class Token extends foundry.canvas.placeables.Token {}

	const fromUuid: typeof foundry.utils.fromUuid;
	const fromUuidSync: typeof foundry.utils.fromUuidSync;

	/**
	 * The dnd5e system namespace, assigned to globalThis by the system and merged
	 * onto game.system at init.
	 */
	const dnd5e: typeof import("@dnd5e/dnd5e.mjs") & {
		config: typeof import("@dnd5e/dnd5e.mjs").DND5E;
		registry: Record<string, unknown>;
		ui: Record<string, unknown>;
		version: string;
	};

	/**
	 * libWrapper, a required dependency. Only the surface GMMC uses is declared.
	 */
	const libWrapper: {
		register(
			module: string,
			target: string,
			fn: Function,
			type?: "WRAPPER" | "MIXED" | "OVERRIDE",
			options?: object
		): number;
		unregister(module: string, target: string, fail?: boolean): void;
		unregister_all(module: string): void;
	};
}

export {};
