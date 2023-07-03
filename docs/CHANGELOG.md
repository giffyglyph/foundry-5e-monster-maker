![Monster Maker Social Banner](./img/fire-elemental.png)

# Changelog

[![Pull Requests Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat)](http://makeapullrequest.com)
[![Support Giffy on Patreon](https://img.shields.io/endpoint.svg?url=https%3A%2F%2Fshieldsio-patreon.vercel.app%2Fapi%3Fusername%3Dgiffyglyph%26type%3Dpatrons&style=flat-square)](https://patreon.com/giffyglyph)
[![Twitter](https://img.shields.io/twitter/follow/skyl3lazer?color=%231DA1F2&style=flat-square)](http://twitter.com/skyl3lazer)
[![Discord](https://img.shields.io/badge/contact-me-blue?logo=discord&logoColor=white)](https://discord.com/channels/@skyl3lazer)

## v0.10 (dev)

* Testing/confirming v11 compatability

## v0.9.3

* Fixed a small libwrapper issue that affected non-gmm item usage for some automations.

## v0.9

* Fixed ability_bonus on rank not affecting creatures
* Fixed some issue with libwrapper hooks doing unintended things to non GMM monsters (specifically item rolls)
* Updated pack deprecations. Note they still aren't all v3 abilities.
* Added missing strings
* Fixed paragon defenses reporting as action amount

## v0.8

* Added a shortcoder to CONFIG.Item.documentClass.prototype.use to make the damage on the item get shortcoded in at use-time
  * This should make shortcodes integrate better to other mods like RSR
* Fix for non-gmm shortcodes in descriptions breaking
* Updated some missing strings

## v0.7

* Fixed an issue with save DCs being null
* Added libwrapper as a dependency, and implemented it to cover anything that we wrapped already
* Updated processing for the following items to be affected by DAE and display correctly
  *  AC, Skills (proficiency and check bonuses), Passive Perception, Saving Throws, Initiative (doesn't display right)

## v0.6

* Fixed damage types
* Fixed occasional error with blank form fields causing errors

## v0.5

* Fixed damage, misses, and versatile damage

## v0.4

* Updating to GMM v3

## v0.3

* Updated to Foundry v10, dnd5e 2.1+, GMM v2
