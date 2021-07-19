const RollFormula = (function() {

	function getRollFormula(formula) {
    return formula.replace(/\+ *?\+/g, '+').replace(/\+ *?\-/g, '-').replace(/\+ *?\*/g, '*').replace(/\+ *?\//g, '/');
	}

	return {
		getRollFormula: getRollFormula
	};
})();

export default RollFormula;