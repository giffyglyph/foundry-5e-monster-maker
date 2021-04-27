const Gui = (function() {

	function activateListeners(html) {
		html.find('.gg5e-mm-accordion .accordion-section__header').click((e) => _toggleAccordionCollapse(e));
		html.find('.gg5e-mm-panel.panel--collapsible .panel__header').click((e) => _togglePanelCollapse(e));
		html.find('button.move-up').click((e) => _moveUp(e));
		html.find('button.move-down').click((e) => _moveDown(e));
		html.find('button[data-action="open-modal"]').click((e) => _openModal(e));
		html.find('button[data-action="close-modal"]').click((e) => closeModal(e));
	}

	function prepareGui(...data) {
		return $.extend(true, {}, _getDefaultGui(), ...data);
	}

	function setAccordions(html, accordions) {
		if (accordions) {
			for (const [key, value] of Object.entries(accordions)) {
				let accordion = html.find(`#${key.replace(/_/g, "-")}`);
				if (value) {
					value.split(",").forEach((x) => accordion.find(`[data-section='${x.trim()}']`).addClass("opened"));
				}
			}
		}
	}

	function setPanels(html, panels) {
		if (panels) {
			for (const [key, value] of Object.entries(panels)) {
				if (value === "closed") {
					html.find(`#${key.replace(/_/g, "-")}`).addClass("closed");
				}
			}
		}
	}

	function setScrollbars(html, scrollbars) {
		if (scrollbars) {
			for (const [key, value] of Object.entries(scrollbars)) {
				html.find(`#${key.replace(/_/g, "-")}`).scrollLeft(value.x);
				html.find(`#${key.replace(/_/g, "-")}`).scrollTop(value.y);
			}
		}
	}

	function _getDefaultGui() {
		return {
			data: {
				accordions: null,
				panels: null,
				scrollbars: null
			}
		}
	}

	function _openModal(event) {
		const button = event.currentTarget.closest("button");
		const modal = $(button).closest(".gg5e-mm-window").find(`#${button.dataset.modal}`)
		if (modal) {
			modal.addClass("open");
		}
	}

	function closeModal(event) {
		const modal = event.currentTarget.closest(".gg5e-mm-modal");
		modal.classList.remove("open");
	}

	function _togglePanelCollapse(event) {
		const panel = event.currentTarget.closest(".gg5e-mm-panel");
		const panelId = panel.id.replace(/-/g, '_');
		const newState = panel.classList.contains("closed") ? "opened" : "closed";
		$(panel).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.gui.data.panels.${panelId}']`).val(newState).trigger("change");
	}

	function _toggleAccordionCollapse(event) {
		const accordion = event.currentTarget.closest(".gg5e-mm-accordion");
		const accordionId = accordion.id.replace(/-/g, '_');
		const section = event.currentTarget.closest(".accordion-section");
		let index = "";
		if (accordion.getAttribute("data-accordion-mode") == "single") {
			index = section.classList.contains("opened") ? "" : section.getAttribute("data-section");
		} else {
			section.classList.toggle("opened");
			index = [...accordion.querySelectorAll(".accordion-section.opened")].map((x) => x.getAttribute("data-section")).join(",");
		}
		$(accordion).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.gui.data.accordions.${accordionId}']`).val(index).trigger("change");
	}

	function _moveUp(event) {
		const li = event.currentTarget.closest('.move-parent');
		if (li.previousElementSibling) {
			li.parentNode.insertBefore(li, li.previousElementSibling);
		}
	}

	function _moveDown(event) {
		const li = event.currentTarget.closest('.move-parent');
		if (li.nextElementSibling) {
			li.parentNode.insertBefore(li.nextElementSibling, li);
		}
	}

	return {
		activateListeners: activateListeners,
		setAccordions: setAccordions,
		setPanels: setPanels,
		setScrollbars: setScrollbars,
		prepareGui: prepareGui,
		closeModal: closeModal
	};
})();

export default Gui;