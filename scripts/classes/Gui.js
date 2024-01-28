export default class Gui {

	constructor() {
		this._accordions = [];
		this._panels = [];
		this._scrollbars = [];
		this._isExpanded = false;
	}

	activateListeners($el) {
		$el.find('.gmm-accordion .accordion-section__header button').click((e) => e.stopPropagation() );
		$el.find('.gmm-accordion .accordion-section__header').click((e) => this._toggleAccordionCollapse(e));
		$el.find('.gmm-panel.panel--collapsible .panel__header').click((e) => this._togglePanelCollapse(e));
		$el.find('button.move-up').click((e) => this._moveUp(e));
		$el.find('button.move-down').click((e) => this._moveDown(e));
		$el.find('button[data-action="open-modal"]').click((e) => this._openModal(e));
		$el.find('button[data-action="close-modal"]').click((e) => this._closeModal(e));
		$el.find('button[data-action="close-accordion"]').click((e) => this._closeAccordion(e));
		$el.find('button[data-action="expand-window"]').click((e) => this._expandWindow(e));
		$el.find('input[data-action="update-field"]').change((e) => this._updateField(e));
		$el.find('[data-track-scrollbars="true"]').scroll((e) => this._updateScrollbar(e));
		$el.find('.form-fieldset__header').click((e) => this._toggleFormFieldset(e));
		$el.find('.form-fieldset__header button').click((e) => e.stopPropagation());
		$el.find('[data-action="open-config"]').click((e) => this._openConfig(e));
		$el.find('input.tstCheckbox').click((e) => this._limitTst(e));
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
			$el.closest(".gmm-window").find(".gmm-forge").addClass("expanded");
		}
	}

	updateFrom(html) {
		this._updateAccordions(html);
		this._updatePanels(html);
		this._updateScrollbars(html);
		this._updateWindow(html);
	}

	_openConfig(event) {
		let target = event.currentTarget.closest("[data-action='open-config']").dataset.config;
		if (target) {
			const forge = event.currentTarget.closest(".gmm-forge");
			if (!forge.classList.contains("expanded")) {
				this._expandWindow(event);
			}
			const section = forge.querySelector(`.gmm-blueprint [data-section="${target}"]`);
			const accordion = forge.querySelectorAll(`.gmm-blueprint .accordion-section`);
			[...accordion].forEach((x) => {
				x.classList.remove("opened");
				x.querySelector(".accordion-section__body").style.display = "none";
			});
			section.classList.add("opened");
			section.querySelector(".accordion-section__body").style.removeProperty("display");
			section.scrollIntoView({ block: 'nearest' });
			this._updateAccordions(event.currentTarget.closest(".gmm-window"));
		}
	}

	_updateAccordions(html) {
		this._accordions = [];
		html.querySelectorAll(".gmm-accordion").forEach((x) => {
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
		html.querySelectorAll(".gmm-panel.panel--collapsible").forEach((x) => {
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
		this._isExpanded = html.closest(".gmm-window").querySelector(".gmm-forge").classList.contains("expanded");
	}

	_openModal(event) {
		const button = event.currentTarget.closest("button");
		const modal = button.closest(".gmm-window").querySelector(`#${button.dataset.modal}`)
		if (modal) {
			modal.classList.add("open");
			button.closest(".gmm-forge").classList.add("open-modal");
		}
	}

	_closeAccordion(event) {
		const button = event.currentTarget.closest("button");
		const accordion = button.closest(".gmm-window").querySelectorAll(`#${button.dataset.accordion} .accordion-section`);
		[...accordion].forEach((x) => {
			x.classList.add("collapsing");
			$(x.querySelector(".accordion-section__body")).slideUp(100, function() {
				x.classList.remove("collapsing");
				$(x).toggleClass('opened', $(this).is(':visible'));
			});
		});
		this._accordions = this._accordions.filter((x) => x.id != button.dataset.accordion);
	}

	_closeModal(event) {
		const modal = event.currentTarget.closest(".gmm-modal");
		modal.classList.remove("open");
		event.currentTarget.closest(".gmm-forge").classList.remove("open-modal");
	}

	_limitTst(event) {
		if (event.currentTarget.getAttribute("checked") == false)
			return true;

		let checkedChecks = document.querySelectorAll(".tstCheckbox:checked");
		let tst = event.currentTarget.closest("#monster__tst_count");
		if (checkedChecks.length >= Number(tst.getAttribute("name")) + 1)
			event.preventDefault();
	}

	_toggleAccordionCollapse(event) {
		const accordion = event.currentTarget.closest(".gmm-accordion");
		const section = event.currentTarget.closest(".accordion-section");
		if (accordion.getAttribute("data-accordion-mode") == "single") {
			[...accordion.querySelectorAll(".accordion-section.opened")].filter((x) => x != section).forEach((x) => {
				x.classList.add("collapsing");
				$(x.querySelector(".accordion-section__body")).slideToggle(100, function() {
					x.classList.remove("collapsing");
					$(x).toggleClass('opened', $(this).is(':visible'));
				});
			});
		}

		section.classList.add("collapsing");
		let gui = this;
		$(section.querySelector(".accordion-section__body")).slideToggle(100, function() {
			section.classList.remove("collapsing");
			$(section).toggleClass('opened', $(this).is(':visible'));
			gui._updateAccordions(event.currentTarget.closest(".gmm-window"));
			gui._updateScrollbars(event.currentTarget.closest(".gmm-window"));
		});
	}

	_togglePanelCollapse(event) {
		let panel = event.currentTarget.closest(".gmm-panel");
		let panelBody = panel.querySelector(".panel__body");
		let gui = this;
		panel.classList.add("collapsing");
		$(panelBody).slideToggle(100, function() {
			panel.classList.remove("collapsing");
			$(panel).toggleClass('closed', !$(this).is(':visible'));
			gui._updatePanels(event.currentTarget.closest(".gmm-window"));
			gui._updateScrollbars(event.currentTarget.closest(".gmm-window"));
		});
	}

	_toggleFormFieldset(event) {
		let fieldset = event.currentTarget.closest(".form-fieldset");
		fieldset.classList.add("collapsing");
		$(fieldset.querySelector(".form-fieldset__body")).slideToggle(100, function() {
			fieldset.classList.remove("collapsing");
			$(fieldset).toggleClass('closed', !$(this).is(':visible'));
		});
	}

	_expandWindow(event) {
		event.currentTarget.closest(".gmm-window").querySelector(".gmm-forge").classList.toggle("expanded");
		this._updateWindow(event.currentTarget.closest(".gmm-window"));
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
		const output = event.currentTarget.closest(".gmm-window").querySelector(`input[name='${field}']`);

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