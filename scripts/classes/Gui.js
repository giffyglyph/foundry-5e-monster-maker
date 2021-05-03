export default class Gui {

	constructor() {
		this._accordions = [];
		this._panels = [];
		this._scrollbars = [];
		this._isExpaned = false;
	}

	activateListeners($el) {
		$el.find('.gg5e-mm-accordion .accordion-section__header').click((e) => this._toggleAccordionCollapse(e));
		$el.find('.gg5e-mm-panel.panel--collapsible .panel__header').click((e) => this._togglePanelCollapse(e));
		$el.find('button.move-up').click((e) => this._moveUp(e));
		$el.find('button.move-down').click((e) => this._moveDown(e));
		$el.find('button[data-action="open-modal"]').click((e) => this._openModal(e));
		$el.find('button[data-action="close-modal"]').click((e) => this._closeModal(e));
		$el.find('button[data-action="close-accordion"]').click((e) => this._closeAccordion(e));
		$el.find('button[data-action="expand-window"]').click((e) => this._expandWindow(e));
		$el.find('input[data-action="update-field"]').change((e) => this._updateField(e));
		$el.find('[data-track-scrollbars="true"]').scroll((e) => this._updateScrollbar(e));
	}

	applyTo($el) {
		this._accordions.forEach((x) => {
			x.sections.forEach((y) => {
				$el.find(`#${x.id} [data-section='${y}']`).addClass("opened");
			});
		});
		this._panels.forEach((x) => {
			$el.find(`#${x}`).addClass("closed");
			$el.find(`#${x} .panel__body`).css("display", "none");
		});
		this._scrollbars.forEach((x) => {
			$el.find(`#${x.id}`).scrollLeft(x.x);
			$el.find(`#${x.id}`).scrollTop(x.y);
		});
		if (this._isExpanded) {
			$el.closest(".gg5e-mm-window").addClass("expanded");
		}
	}

	updateFrom(html) {
		this._updateAccordions(html);
		this._updatePanels(html);
		this._updateScrollbars(html);
		this._updateWindow(html);
	}

	_updateAccordions(html) {
		this._accordions = [];
		html.querySelectorAll(".gg5e-mm-accordion").forEach((x) => {
			if (x.hasAttribute("id")) {
				this._accordions.push({
					id: x.getAttribute("id"),
					sections: [...x.querySelectorAll('.accordion-section.opened')].map((y) => y.getAttribute("data-section"))
				});
			}
		});
	}

	_updatePanels(html) {
		this._panels = [];
		html.querySelectorAll(".gg5e-mm-panel.panel--collapsible").forEach((x) => {
			if (x.hasAttribute("id") && x.classList.contains("closed")) {
				this._panels.push(x.getAttribute("id"));
			}
		});
	}

	_updateScrollbars(html) {
		this._scrollbars = [];
		html.querySelectorAll("[data-track-scrollbars='true']").forEach((x) => {
			if (x.hasAttribute("id")) {
				this._scrollbars.push({
					id: x.getAttribute("id"),
					x: x.scrollLeft,
					y: x.scrollTop
				});
			}
		});
	}

	_updateScrollbar(event) {
		const li = event.currentTarget.closest("[data-track-scrollbars='true']");
		const index = this._scrollbars.findIndex((x) => x.id == li.getAttribute("id"));
		if (index == -1) {
			this._scrollbars.push({
				id: li.getAttribute("id"),
				x: li.scrollLeft,
				y: li.scrollTop
			});
		} else {
			this._scrollbars[index].x = li.scrollLeft;
			this._scrollbars[index].y = li.scrollTop;
		}
	}

	_updateWindow(html) {
		this._isExpanded = html.closest(".gg5e-mm-window").classList.contains("expanded");
	}

	_openModal(event) {
		const button = event.currentTarget.closest("button");
		const modal = button.closest(".gg5e-mm-window").querySelector(`#${button.dataset.modal}`)
		if (modal) {
			modal.classList.add("open");
			button.closest(".gg5e-mm-sheet").classList.add("open-modal");
		}
	}

	_closeAccordion(event) {
		const button = event.currentTarget.closest("button");
		const accordion = button.closest(".gg5e-mm-window").querySelectorAll(`#${button.dataset.accordion} .accordion-section`);
		[...accordion].forEach((x) => {
			x.classList.add("collapsing");
			$(x.querySelector(".accordion-section__body")).slideUp("fast", function() {
				x.classList.remove("collapsing");
				$(x).toggleClass('opened', $(this).is(':visible'));
			});
		});
		this._accordions = this._accordions.filter((x) => x.id != button.dataset.accordion);
	}

	_closeModal(event) {
		const modal = event.currentTarget.closest(".gg5e-mm-modal");
		modal.classList.remove("open");
		event.currentTarget.closest(".gg5e-mm-sheet").classList.remove("open-modal");
	}

	_toggleAccordionCollapse(event) {
		const accordion = event.currentTarget.closest(".gg5e-mm-accordion");
		const section = event.currentTarget.closest(".accordion-section");
		if (accordion.getAttribute("data-accordion-mode") == "single") {
			[...accordion.querySelectorAll(".accordion-section.opened")].filter((x) => x != section).forEach((x) => {
				x.classList.add("collapsing");
				$(x.querySelector(".accordion-section__body")).slideToggle("fast", function() {
					x.classList.remove("collapsing");
					$(x).toggleClass('opened', $(this).is(':visible'));
				});
			});
		}

		section.classList.add("collapsing");
		let gui = this;
		$(section.querySelector(".accordion-section__body")).slideToggle("fast", function() {
			section.classList.remove("collapsing");
			$(section).toggleClass('opened', $(this).is(':visible'));
			gui._updateAccordions(event.currentTarget.closest(".gg5e-mm-window"));
			gui._updateScrollbars(event.currentTarget.closest(".gg5e-mm-window"));
		});
	}

	_togglePanelCollapse(event) {
		let panel = event.currentTarget.closest(".gg5e-mm-panel");
		let panelBody = panel.querySelector(".panel__body");
		let gui = this;
		panel.classList.add("collapsing");
		$(panelBody).slideToggle("fast", function() {
			panel.classList.remove("collapsing");
			$(panel).toggleClass('closed', !$(this).is(':visible'));
			gui._updatePanels(event.currentTarget.closest(".gg5e-mm-window"));
			gui._updateScrollbars(event.currentTarget.closest(".gg5e-mm-window"));
		});
	}

	_expandWindow(event) {
		event.currentTarget.closest(".gg5e-mm-window").classList.toggle("expanded");
		this._updateWindow(event.currentTarget.closest(".gg5e-mm-window"));
	}

	_moveUp(event) {
		const li = event.currentTarget.closest('.move-parent');
		if (li.previousElementSibling) {
			li.parentNode.insertBefore(li, li.previousElementSibling);
		}
	}

	_moveDown(event) {
		const li = event.currentTarget.closest('.move-parent');
		if (li.nextElementSibling) {
			li.parentNode.insertBefore(li.nextElementSibling, li);
		}
	}

	_updateField(event) {
		const input = event.currentTarget.closest("input");
		const field = input.dataset.field;
		const type = input.dataset.type ? input.dataset.type : "text";
		const output = event.currentTarget.closest(".gg5e-mm-window").querySelector(`input[name='${field}']`);

		switch (type) {
			case "number":
				const value = event.currentTarget.value;
				if (["+", "-"].includes(value[0])) {
					output.value = Number(output.value) + parseFloat(value);
				} else if (value[0] === "=") {
					output.value = Number(value.slice(1));
				} else {
					output.value = Number(event.currentTarget.value);
				}
				break;
			default:
				output.value = event.currentTarget.value;
				break;
		}

		output.dispatchEvent(new Event('change'));
	}
}