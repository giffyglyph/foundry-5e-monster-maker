import CompatibilityHelpers from "./CompatibilityHelpers.js";
import { formatTargetLabel, formatRangeLabel } from "./Labels.js";
import { buildSaveDcFormula, buildDurationSaveDcFormula } from "./SaveDc.js";
const Shortcoder = (function () {
    /* A resolver returning `undefined` leaves the token intact, and `type: "string"` strips the brackets after substitution. */
    const SHORTCODES = [
        { code: "level", data: "level.value" },
        { code: "attackBonus", data: "attack_bonus.value" },
        { code: "damage", data: "damage_per_action.value" },
        { code: "dcPrimaryBonus", data: "attack_dcs.primary.value" },
        {
            code: "saveDc",
            // Alias for `[dcPrimaryBonus+maxMod]`: standard GMMC save DC formula.
            resolver: (monsterData) => {
                if (!monsterData) return undefined;
                const dc = CompatibilityHelpers.getProperty(monsterData, "attack_dcs.primary.value");
                const mod = CompatibilityHelpers.getProperty(monsterData, "ability_modifiers.max.value");
                if (dc === undefined || mod === undefined) return undefined;
                const sum = Number(dc) + Number(mod);
                return Number.isFinite(sum) ? sum : undefined;
            }
        },
        {
            code: "featureDc",
            // The value the card already prints, so authored text and card cannot disagree.
            resolver: (monsterData, itemContext) => {
                if (!itemContext) return undefined;
                for (const activity of itemContext.system?.activities ?? []) {
                    const value = Number(activity?.save?.dc?.value);
                    if (Number.isFinite(value) && value > 0) return value;
                }
                return _resolveDcFormula(buildSaveDcFormula, monsterData, itemContext);
            }
        },
        {
            code: "durationSaveDc",
            // No activity to read: an attack-type feature's recurring save lives only in the OverTime string.
            resolver: (monsterData, itemContext) => _resolveDcFormula(buildDurationSaveDcFormula, monsterData, itemContext)
        },
        { code: "strMod", data: "ability_modifiers.str.value" },
        { code: "dexMod", data: "ability_modifiers.dex.value" },
        { code: "conMod", data: "ability_modifiers.con.value" },
        { code: "intMod", data: "ability_modifiers.int.value" },
        { code: "wisMod", data: "ability_modifiers.wis.value" },
        { code: "chaMod", data: "ability_modifiers.cha.value" },
        { code: "maxMod", data: "ability_modifiers.max.value" },
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
        { code: "hpMax", data: "hit_points.effective_maximum" },
        { code: "naturalMax", data: "hit_points.natural_maximum" },
        { code: "damageDie", data: "damage_per_action.die_size" },
        { code: "name", data: "name", type: "string" },
        {
            code: "target",
            type: "string",
            // Without an item there is no blueprint to read, so the literal token is left in place.
            resolver: (_monsterData, itemContext) => {
                if (!itemContext) return undefined;
                const blueprintData = itemContext?.flags?.gmm?.blueprint?.data;
                return formatTargetLabel(blueprintData?.target, blueprintData?.range);
            }
        },
        {
            code: "range",
            type: "string",
            resolver: (_monsterData, itemContext) => {
                if (!itemContext) return undefined;
                const blueprintData = itemContext?.flags?.gmm?.blueprint?.data;
                const range = blueprintData?.range;
                const attackType = blueprintData?.attack?.type;
                return formatRangeLabel(range, attackType);
            }
        }
    ];

    /* mathjs resolves `range` from its own scope, so an unresolved shortcode would evaluate to its source text. */
    const SHORTCODE_WORDS = new RegExp(`\\b(${SHORTCODES.map((x) => x.code).join("|")})\\b`, "i");

    /* What to write instead when a shortcode turns up in an effect change value. `maxMod` and
     * `dcPrimaryBonus` are absent because each is one term of the save DC with no path of its own. */
    const ROLL_DATA_EQUIVALENTS = Object.assign({
        level: "@gmm.level",
        attackBonus: "@gmm.attackBonus",
        saveDc: "@gmm.saveDc",
        damage: "@gmm.damage",
        naturalMax: "@gmm.naturalMax",
        proficiency: "@attributes.prof",
        cr: "@details.cr",
        xp: "@details.xp.value",
        hpMax: "@attributes.hp.effectiveMax",
        ac: "@attributes.ac.value",
        name: "@name"
    }, ...["str", "dex", "con", "int", "wis", "cha"].map((x) => ({
        [`${x}Mod`]: `@abilities.${x}.mod`,
        [`${x}Save`]: `@abilities.${x}.save.value`
    })));

    /* `[isDamaged]` and `2d6[fire]` both ship in GMMC content without being shortcodes. */
    function findShortcodes(text) {
        if (typeof text !== "string" || !text.includes("[")) return [];
        const found = new Set();
        for (const token of text.match(/\[.*?\]/g) ?? []) {
            if (/^\[\s*\//.test(token) || /^\[\[/.test(token)) continue;
            SHORTCODES.forEach((x) => {
                if (new RegExp(`\\b${x.code}\\b`, "i").test(token)) found.add(x.code);
            });
        }
        return [...found];
    }

    function suggestRollData(code) {
        return ROLL_DATA_EQUIVALENTS[code] ?? null;
    }

    /* Guarded because a DC shortcode typed into the Modifier field would otherwise recurse forever. */
    let _resolvingDc = false;
    function _resolveDcFormula(build, monsterData, itemContext) {
        const blueprintData = itemContext?.flags?.gmm?.blueprint?.data;
        if (!blueprintData || !monsterData || _resolvingDc) return undefined;
        _resolvingDc = true;
        try {
            return replaceShortcodes(build(blueprintData), monsterData, false, itemContext);
        } finally {
            _resolvingDc = false;
        }
    }

    function _resolveShortcodeValue(entry, monsterData, itemContext) {
        if (typeof entry.resolver === "function") {
            try { return entry.resolver(monsterData, itemContext); }
            catch (e) { console.error("GMM | shortcode resolver failed", entry.code, e); return undefined; }
        }
        if (entry.data && CompatibilityHelpers.hasProperty(monsterData, entry.data)) {
            return CompatibilityHelpers.getProperty(monsterData, entry.data);
        }
        return undefined;
    }

    function replaceShortcodes(text, monsterData, isDamage = false, itemContext = null) {
        if (!text) return "";
        if (!monsterData && !itemContext) return text;
        return text.replace(/\[.*?\]/g, (token) => {
            // Skip tokens that look like closing tags (e.g. `[/code]`, `[/url]`).
            if (/^\[\s*\//.test(token)) return token;
            // Skip tokens that are doubled-bracket forms (e.g. `[[lookup foo]]`, `[[name]]`).
            if (/^\[\[/.test(token)) return token;
            SHORTCODES.forEach((x) => {
                const value = _resolveShortcodeValue(x, monsterData, itemContext);
                if (value === undefined) return;
                try {
                    let regex = new RegExp(`\\b${x.code}\\b`, 'gi');
                    if (regex.test(token)) {
                        token = token.replace(regex, value);
                        if (x.type && x.type === "string") {
                            token = token.replace(/\[(.*?)\]/g, (token, t1) => t1);
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
            });
            try {
                token = token.replace(/\[(.*?)(, *?d(\d+))?\]/g, (token, t1, t2, t3) => _numberToRandom(token, t1, t3, monsterData?.damage_per_action?.maximum_dice));
            } catch (e) {
                if(e.message.startsWith("Undefined symbol") || e.message.startsWith("Value expected") || e.name === "SyntaxError") return token;
                console.error(e);
            }
            // An unresolved damage shortcode has to produce nothing rather than a wrong formula.
            if (isDamage && token.includes("["))
                return "";
            return token;
        });
    }

    function replaceShortcodesAndAddDamageType(text, monsterData, damageType, isDamage = false, itemContext = null) {
        let replaceText = replaceShortcodes(text, monsterData, isDamage, itemContext);
        return replaceText.replace(/(\d[^\+\- ]*)[\+\- ]?/g, (token) => token.trim() + (damageType ? `[${damageType}]` : ""));
    }

    function replaceShortcodesAndAddDamageTypeDamageObject(text, monsterData, damageType, isDamage = false, itemContext = null) {
        let replaceText = replaceShortcodes(text, monsterData, isDamage, itemContext);
        return [replaceText, damageType];
    }


    function _numberToRandom(token, value, die, maximumDice) {
        if (SHORTCODE_WORDS.test(value)) return token;
        try {
            let valueMath = math.evaluate(value);
            // Any other bare mathjs function name resolves the same way `range` does.
            if (typeof valueMath === "function") return token;
            if (die != undefined) {
                let scale = (Number(die) + 1) / 2;
                let dice = (maximumDice) ? Math.min(Math.floor(valueMath / scale), maximumDice) : Math.floor(valueMath / scale);
                let modifier = valueMath - Math.floor(dice * scale);

                if (dice > 0) {
                    return dice + "d" + die + ((modifier != 0) ? (" " + ((modifier > 0) ? "+ " : "- ") + Math.abs(modifier)) : "");
                } else {
                    return valueMath;
                }
            } else {
                return valueMath;
            }
        } catch (e) {
            if (!(e.message.startsWith("Undefined symbol") || e.message.startsWith("Value expected") || e.name === "SyntaxError"))
                console.error(e);
            return token;
        }
    }

    return {
        findShortcodes: findShortcodes,
        suggestRollData: suggestRollData,
        replaceShortcodes: replaceShortcodes,
        replaceShortcodesAndAddDamageType: replaceShortcodesAndAddDamageType,
        replaceShortcodesAndAddDamageTypeDamageObject: replaceShortcodesAndAddDamageTypeDamageObject
    };
})();

export default Shortcoder;