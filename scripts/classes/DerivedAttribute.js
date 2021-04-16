class DerivedAttribute {

	constructor() {
		this.value = 0;
		this.sources = [];
		this.has_modifier = false;
	}

	getValue() {
		return this.value;
	}

	setValue(value) {
		this.value = value;
	}

	addValue(value) {
		this.value += value;
	}

	setMinimumValue(value) {
		if (this.value < value) {
			this.value = value;
			this.setSource(1, "minimum allowed");
		};
	}

	getSources() {
		return this.sources;
	}

	setSources(sources) {
		this.sources = sources;
	}

	setSource(value, source) {
		this.sources = [{ value: value, source: source}];
	}

	addSource(value, source) {
		this.sources.push({ value: value, source: source});
	}

	setHasModifier(hasModifier) {
		this.has_modifier = hasModifier;
	}

	applyModifier(modifier, isFixed) {
		if (typeof modifier === "number") {
			if (isFixed) {
				this.value = modifier;
				this.setSource(modifier, "fixed modifier");
				this.has_modifier = true;
			} else if (modifier != 0) {
				this.value += modifier;
				this.addSource(modifier, "relative modifier");
				this.has_modifier = true;
			}
		}
	}
}

export default DerivedAttribute;
