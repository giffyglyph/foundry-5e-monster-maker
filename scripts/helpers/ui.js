export default class Ui {

    static activateListeners(html) {
        html.find('.gg5e-mm-accordion .accordion-section__header').click((e) => this._toggleAccordionCollapse(e));
		html.find('.gg5e-mm-panel.panel--collapsible .panel__header').click((e) => this._togglePanelCollapse(e));
    }

    static _togglePanelCollapse(event) {
		const li = event.currentTarget.closest(".gg5e-mm-panel");
		const panelId = li.id.replace(/-/g, '_');
		const isOpen = !li.classList.contains("closed");
		$(li).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.ui.panels.${panelId}']`).val(!isOpen).trigger("change");
	}

	static _toggleAccordionCollapse(event) {
		const li = event.currentTarget.closest(".accordion-section");
		const accordion = event.currentTarget.closest(".gg5e-mm-accordion");
		const accordionId = accordion.id.replace(/-/g, '_');
		const index = (li.classList.contains("opened") ? null : li.getAttribute("data-section"));
		$(li).closest(".gg5e-mm-window").find(`input[name='data.gg5e_mm.ui.accordions.${accordionId}']`).val(index).trigger("change");
	}

	static getDefaultUi() {
		return {
			accordions: {},
			panels: {}
		};
	}
}