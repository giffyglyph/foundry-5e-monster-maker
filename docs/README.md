![Monster Maker Social Banner](./img/fire-elemental.png)

# Giffyglyph's 5e Monster Maker Continued, by Skyl3lazer

[![Pull Requests Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)
[![Support Giffy on Patreon](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3Dgiffyglyph%26type%3Dpatrons&style=flat-square)](https://patreon.com/giffyglyph)
[![BlueSky](https://img.shields.io/badge/%40Skyl3lazer_on_BlueSky-grey?logo=bluesky&logoColor=%230285FF&labelColor=grey)](https://bsky.app/profile/skyl3lazer.bsky.social)
[![Discord](https://img.shields.io/badge/contact-me-blue?logo=discord&logoColor=white)](https://discord.com/channels/@skyl3lazer)


This is a continuation of the original module by Giffyglyph, updated to be compatable Foundry v14 (and mostly v13) and D&D 5.3.x
(Also check out my [v3 updated Webapp!](https://giffyglyphmonstermakerv3.azurewebsites.net/))

**NOTE:** See the AI Disclaimer below!

If you find issues not already listed in [DEV_TODO](https://github.com/Skyl3lazer/giffyglyph-monster-maker-continued/blob/main/docs/DEV_TODO.md) please leave an Issue here or contact me @Skyl3lazer on Discord.

Want to build new monsters for your [Foundry VTT](https://foundryvtt.com/) D&D 5e campaign, but aren't sure how to balance them easily? No worries—**Giffyglyph's 5e Monster Maker** has you covered! Build level-appropriate D&D 5e monsters in _seconds_ with an all-new automated monster sheet and scaling actions.

## Features

* A brand new monster sheet with customisable themes.
* Fully-scaled monster stats for levels -5 to 50.
* 4 monster roles — minion, standard, elite, and paragons.
* 6 combat roles — controller, defender, lurker, skirmisher, striker, and supporter.
* Change the level of any monster on-the-fly and watch their stats change.
* A new scaling action sheet with fully-scaling attacks.
* Premade attacks, traits and powers to easily create unique, thematic, and interesting monsters.
* Easy-to-use shortcodes to make custom scaling features even easier.
* Convert existing monsters in seconds by simply changing the active sheet.
* 18 expanded conditions as ready-to-drag active effects for use on scaler or vanilla abilities.
* Includes full stats from the **[Giffyglyph's Monster Maker PDF](https://giffyglyph.com/#giffyglyphs-monster-maker)**.

![Scaling Adult Dragon](./img/scaling-monster-level.gif)

## AI Disclaimer

[![AI-DECLARATION: copilot](https://img.shields.io/badge/䷼%20AI--DECLARATION-copilot-fee2e2?labelColor=fee2e2)](https://ai-declaration.md)

*This level comes from the use of AI in testing and deployment tasks, see [AI-DECLARATION.md](../AI-DECLARATION.md)*

* The v14 refactor was written largely via Opus. I (skyl3lazer) have reviewed and tested this code over time to ensure its function and stability. That said, there is still code that was written by AI, even if I don't plan on continuing to use it after the refactoring stage.

* I recognize that this may be disappointing to some people, which I understand. Put simply, due to the staggering amount of work required to make this refactor happen it would not have occured if I wasn't able to hand it off to the LLM tools like this. I just wasn't interested in doing the updates myself, and this allowed me to bring the module back to a working state.

* None of the code prior to v14dev was made with AI, it was my (and Giffyglyph's) codebase, which I am very familiar with. Going forward, AI will not be relied on to continue making changes. I may use it until then, depending on the scope of the change needed.

## Mind the Gap!

* There was a large gap between updates to this module. While the v13 branch will work with dnd5e 3.3.2 and V13, the 2.x versions of GMMC will REQUIRE
  - dnd5e 5.3.2
  - Foundry v13, ideally v14. 
* I will aim to be backwards compatible with v13 where I can, but development is aimed at v14.
* If you are using any flavor of dnd5e 4.x or 5.1/5.2, GMMC 2.x **will not work for you.** No backwards compatibility is planned.

## Installation

### Dependencies
These modules are required for GMMC to function.

* [libwrapper](https://foundryvtt.com/packages/lib-wrapper/) - Allows GMMC to interact nicely with other modules, including the optional modules.

### Recommended Modules
These modules are optional, but may improve the experience of using GMMC.

* [Midi QOL](https://foundryvtt.com/packages/midi-qol) - Provides core automation, which some compendium items have built in already if Midi is active.
* [Side Effects](https://foundryvtt.com/packages/side-effects) - Adds a sidebar effect directory and lets you turn effects into token statuses. Works with GMM's conditions compendium - see [Conditions](#conditions). Needs Foundry v14.
* [Automated Conditions 5E](https://foundryvtt.com/packages/automated-conditions-5e) - Adds more automation options. Needs Foundry v14.
* [Coven's Automation Toolkit](https://foundryvtt.com/packages/cat) - Adds more automation options.
* [Aura Effects](https://foundryvtt.com/packages/auraeffects) - Adds more automation options.
* [Enhanced Region Behavior](https://foundryvtt.com/packages/enhanced-region-behavior) - Adds more automation options.

---

You can install this Foundry module by copying a manifest URL into your Foundry setup:


* **v3 2.x (Main Release):** https://github.com/Skyl3lazer/giffyglyph-monster-maker-continued/releases/latest/download/module.json
  * The latest stable release - this is probably what you want.


* **v3 2.1.x (Dev, may be unstable):** https://github.com/Skyl3lazer/giffyglyph-monster-maker-continued/releases/download/dev-latest/module.json
  * Bleeding-edge builds from the dev branch. Newest fixes and features, but may be unstable. For testing and early access.


* **GMMC for Foundry V13/dnd5e 3.3.1:** https://raw.githubusercontent.com/Skyl3lazer/giffyglyph-monster-maker-continued/v13/module.json


* **MM v2 (Legacy, only for recovering monsters from old games):** https://raw.githubusercontent.com/Skyl3lazer/giffyglyph-monster-maker-continued/v2/module.json
  * This is the original GMM v2 module, only updated for Foundry v10 / dnd5e 2.1+. It won't be getting bugfixes, it's just for data recovery.


All of these use the same module id, so only **one can be installed on a Foundry setup at a time** - installing one replaces the others.

## Incompatibilities / Differences

* Some modules may have limited functionality with shortcodes in various fields. If you attempt to roll something and it doesn't roll, please submit an issue with your modlist.

## Getting Started

1. Install and activate the module.
2. On the sidebar under "Actors, you will see **"Create a Scaling Monster"**. Click it.
3. Customise your monster by changing the level, rank, and role. See your monster's stats update live with each change.
4. On the sidebar under "Items", you will see **"Create a Scaling Action"**. Click it. You can also click the "Add" button next to the Actions section on your monster.
5. Customise your action by adding an attack — try a _"Melee Weapon Attack"_!
6. Now drag the scaling action onto your scaling monster, and watch the action's attack bonus automatically change to match your monster's bonuses.

### Converting an old Monster

1. Open an existing monster, or import one from the SRD compendium.
2. Change the active sheet to **"Giffyglyph's 5e Monster Maker Continued"**.
3. Change the monster's level, rank, and role to suit the expected encounter.

### Converting an old Action

**NOTE**: As of 2.x, if you convert back and forth between scalar and vanilla actions, changes made in one mode won't reflect in the other.

1. Open an existing item, such as a weapon, feature, or piece of loot.
2. Change the active sheet to **"Giffyglyph's 5e Scaling Action"**.
3. Customise the action with some scaling features and shortcodes.

![Scaling Action](./img/frightful-presence.png)

## Conditions

The **GMM Effects** compendium holds the eighteen expanded conditions from the Monster Maker PDF -
Banished, Bleeding, Bound, Cursed, Dazed, Decaying, Dehydrated, Disoriented, Fatigued, Feeble,
Silenced, Slowed, Starving, Stinking, Swarmed, Transformed, Vulnerable and Exposed - in a
`Conditions` folder. Drag one onto a token to apply it.

## Roadmap

Currently GMMC handles GMMv3 functions as a standalone module, with some basic integrations working through other modules (MidiQOL, DAE). See [DEV_TODO](https://github.com/Skyl3lazer/giffyglyph-monster-maker-continued/blob/main/docs/DEV_TODO.md) for what I'm looking at next.

## Building from Source

The shipped compendium packs are compiled LevelDB, which is not committed to the repo. The editable source of truth is the YAML under `src/packs/`. If you clone this repo and point Foundry at the working tree, you must build the packs first or the compendiums will be empty.

```
npm install    # installs deps and builds the packs automatically (postinstall)
```

After that, whenever you edit a `.yml` under `src/packs/`, rebuild with:

```
npm run pack   # src/packs/*.yml -> packs/ (LevelDB Foundry loads)
```

To go the other way, extracting an existing pack back to editable YAML:

```
npm run unpack # packs/ -> src/packs/*.yml
```

Installs from a release manifest include the prebuilt packs and need none of this.

## Thank Yous!

Big shoutout to **@krigsmaskine** on Discord for assistance with the [tposney](https://github.com/tposney) modules and general testing

## Bugs and Feature Suggestions

If you notice a bug or have a feature suggestion, visit the **[issue board](https://github.com/Skyl3lazer/giffyglyph-monster-maker-continued/issues)** and open a ticket. Please make sure to be as thorough as possible in your report and attach screenshots where appropriate, as low-effort tickets may be closed out-of-hand.

## Support

[![Support Giffy on Patreon](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3Dgiffyglyph%26type%3Dpatrons&style=flat-square)](https://patreon.com/giffyglyph)
[![BlueSky](https://img.shields.io/badge/%40Skyl3lazer_on_BlueSky-grey?logo=bluesky&logoColor=%230285FF&labelColor=grey)](https://bsky.app/profile/skyl3lazer.bsky.social)

You can also see an updated GMMv3 webapp I've created [here](https://giffyglyphmonstermakerv3.azurewebsites.net/)

If you'd like to support the original creator of this module, please consider [becoming a patron](https://www.patreon.com/giffyglyph). You can also find more of Giffy's work at:

* [giffyglyph.com](https://giffyglyph.com)
* [twitter](https://twitter.com/giffyglyph)
* [twitch.tv/giffyglyph](https://twitch.tv/giffyglyph)

## Licensing

This module is licensed under the [Foundry Virtual Tabletop EULA: Limited License Agreement for module development](https://foundryvtt.com/article/license/).
