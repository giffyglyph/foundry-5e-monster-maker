class DerivedAttribute {

	constructor() {
		this.value = 0;
		this.sources = [];
		this.has_modifier = false;
	}

	add(value, source) {
		if (value != 0) {
			this.value += value;
			this.sources.push({ value: (value >= 0) ? `+${value}` : `−${Math.abs(value)}`, source: source});
		}
	}

	multiply(value, source) {
		if (value != 1) {
			this.value *= value;
			this.sources.push({ value: `×${value}`, source: source});
		}
	}

	divide(value, source) {
		if (value != 1) {
			this.value /= value;
			this.sources.push({ value: `÷${value}`, source: source});
		}
	}

	set(value, source) {
		this.value = value;
		this.sources.push({ value: `=${value}`, source: source});
	}

	ceil() {
		this.value = Math.ceil(this.value);
	}

	floor() {
		this.value = Math.floor(this.value);
	}

	setMinimumValue(value) {
		if (this.value < value) {
			this.set(value, game.i18n.format('gmm.common.derived_source.minimum_allowed'));
		};
	}

	getValue() {
		return this.value;
	}

	setValue(value, source) {
		this.value = 0;
		this.sources = [];
		this.has_modifier = false;
		this.add(value, source);
	}

	getSources() {
		return this.sources;
	}

	setSources(sources) {
		this.sources = sources;
	}

	getHasModifiers() {
		return this.has_modifier;
	}

	setHasModifier(hasModifier) {
		this.has_modifier = hasModifier;
	}

	applyModifier(modifier, isFixed) {
		if (typeof modifier === "number") {
			if (isFixed) {
				this.setValue(modifier, game.i18n.format('gmm.common.derived_source.fixed_modifier'));
				this.has_modifier = true;
			} else if (modifier != 0) {
				this.add(modifier, game.i18n.format('gmm.common.derived_source.relative_modifier'));
				this.has_modifier = true;
			}
		}
	}

	round(scale) {
		this.value = Math.round(this.value * scale) / scale;
	}
}

export default DerivedAttribute;
