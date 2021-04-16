const Dice = (function() {

	function getDiceRoll(average, dieSize, maximumDice) {
		let scale = (Number(dieSize) + 1) / 2;
		let dice = (maximumDice) ? Math.min(Math.floor(average / scale), maximumDice) : Math.floor(average / scale);
		let modifier = average - Math.floor(dice * scale);

		if (dice > 0) {
			return dice + "d" + dieSize + ((modifier != 0) ? (" " + ((modifier > 0) ? "+ " : "− ") + Math.abs(modifier)) : "");
		} else {
			return null;
		}
	}

	return {
		getDiceRoll: getDiceRoll
	};
})();

export default Dice;