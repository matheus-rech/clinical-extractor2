/**
 * DynamicFields - Dynamic form field generation and management
 *
 * Responsibilities:
 * - Add/remove dynamic form fields (indications, interventions, arms, etc.)
 * - Generate HTML for dynamic field types
 * - Update arm selectors when arms are added/removed
 * - Maintain field counters
 * - Expose window-bound functions for HTML onclick handlers
 */

// Temporary reference to FormManager (will be properly imported after module setup)
let FormManager: any;

// Initialization function to set external dependencies
export function setDependencies(deps: { formManager: any }) {
    FormManager = deps.formManager;
}

/**
 * DynamicFields object - manages dynamic field generation
 */
const DynamicFields = {
    // Track counters for each field type
    counters: {
        indication: 0,
        intervention: 0,
        arm: 0,
        mortality: 0,
        mrs: 0,
        complication: 0,
        predictor: 0
    },

    /**
     * Initialize dynamic fields system
     * Exposes functions globally for HTML onclick handlers
     */
    initialize: function() {
        // Expose functions globally for HTML onclick
        window.addIndication = () => this.addIndication();
        window.addIntervention = () => this.addIntervention();
        window.addArm = () => this.addArm();
        window.addMortality = () => this.addMortality();
        window.addMRS = () => this.addMRS();
        window.addComplication = () => this.addComplication();
        window.addPredictor = () => this.addPredictor();
        window.removeElement = (btn: HTMLElement) => this.removeElement(btn);
        window.updateArmSelectors = () => this.updateArmSelectors();
    },

    /**
     * Generic field addition logic
     * @param type - Type of field to add
     * @param containerId - ID of container element
     */
    addField: function(type: string, containerId: string) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const count = this.counters[type]++;
        const div = document.createElement('div');
        div.className = 'dynamic-container';
        let htmlContent = '';

        switch (type) {
            case 'indication':
                htmlContent = `
                    <h4>Indication ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group">
                            <label>Sign/Symptom</label>
                            <select name="indication_sign_${count}" class="linked-input">
                                <option value="">Select...</option>
                                <option value="Drowsiness">Drowsiness</option>
                                <option value="GCS_Drop">Drop in GCS</option>
                                <option value="Imaging_Mass_Effect">Imaging signs of mass effect</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Count (N)</label>
                            <input type="number" name="indication_count_${count}" class="linked-input">
                        </div>
                    </div>`;
                break;

            case 'intervention':
                htmlContent = `
                    <h4>Intervention Type ${count + 1}</h4>
                    <div class="form-group"><label>Surgical Type</label><select name="intervention_type_${count}" class="linked-input"><option value="">Select...</option><option value="SDC_EVD">SDC + EVD</option><option value="SDC_ALONE">SDC Alone</option><option value="EVD_ALONE">EVD Alone</option></select></div>
                    <div class="form-group"><label>Time To Surgery (Hours)</label><input type="number" step="0.1" name="intervention_time_${count}" class="linked-input"></div>
                    <div class="form-group"><label>Duraplasty?</label><select name="intervention_duraplasty_${count}" class="linked-input"><option value="null">Unknown</option><option value="true">Yes</option><option value="false">No</option></select></div>`;
                break;

            case 'arm':
                htmlContent = `
                    <h3>Study Arm ${count + 1}</h3>
                    <div class="grid-2col">
                        <div class="form-group"><label>Label</label><input type="text" name="arm_label_${count}" class="linked-input arm-label-input" oninput="updateArmSelectors()"></div>
                        <div class="form-group"><label>Sample Size (N)</label><input type="number" name="arm_n_${count}" class="linked-input"></div>
                    </div>`;
                break;

            case 'mortality':
                htmlContent = `
                    <h4>Mortality Data Point ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group"><label>Arm</label><select name="mortality_arm_${count}" class="arm-selector linked-input"></select></div>
                        <div class="form-group"><label>Timepoint</label><input type="text" name="mortality_tp_${count}" class="linked-input"></div>
                    </div>
                    <div class="grid-2col">
                        <div class="form-group"><label>Deaths (N)</label><input type="number" name="mortality_deaths_${count}" class="linked-input"></div>
                        <div class="form-group"><label>Total (N)</label><input type="number" name="mortality_total_${count}" class="linked-input"></div>
                    </div>`;
                break;

            case 'mrs':
                htmlContent = `
                    <h4>mRS Data Point ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group"><label>Arm</label><select name="mrs_arm_${count}" class="arm-selector linked-input"></select></div>
                        <div class="form-group"><label>Timepoint</label><input type="text" name="mrs_tp_${count}" class="linked-input"></div>
                    </div>
                    <h5>Distribution (Counts)</h5>
                    <div class="grid-mrs">
                        ${[0,1,2,3,4,5,6].map(i => `<div class="form-group"><label>${i}</label><input type="number" name="mrs_${i}_${count}" class="linked-input"></div>`).join('')}
                    </div>`;
                break;

            case 'complication':
                htmlContent = `
                    <h4>Complication ${count + 1}</h4>
                    <div class="grid-2col">
                        <div class="form-group"><label>Description</label><input type="text" name="comp_desc_${count}" class="linked-input"></div>
                        <div class="form-group"><label>Arm</label><select name="comp_arm_${count}" class="arm-selector linked-input"></select></div>
                    </div>
                    <div class="form-group"><label>Count (N)</label><input type="number" name="comp_count_${count}" class="linked-input"></div>`;
                break;

            case 'predictor':
                htmlContent = `
                    <h4>Predictor Analysis ${count + 1}</h4>
                    <div class="form-group"><label>Predictor Variable</label><input type="text" name="pred_var_${count}" class="linked-input"></div>
                    <div class="grid-3col">
                        <div class="form-group"><label>Effect Size (OR/HR)</label><input type="number" step="0.01" name="pred_effect_${count}" class="linked-input"></div>
                        <div class="form-group"><label>95% CI (Lower)</label><input type="number" step="0.01" name="pred_ci_lower_${count}" class="linked-input"></div>
                        <div class="form-group"><label>95% CI (Upper)</label><input type="number" step="0.01" name="pred_ci_upper_${count}" class="linked-input"></div>
                    </div>
                    <div class="form-group"><label>p-Value</label><input type="number" step="0.001" name="pred_pvalue_${count}" class="linked-input"></div>`;
                break;
        }

        htmlContent += `<button type="button" class="remove-btn" onclick="removeElement(this)">Remove</button>`;
        div.innerHTML = htmlContent;

        container.appendChild(div);

        // Re-bind listeners for new fields
        if (FormManager) {
            FormManager.initializeFormFields();
        }

        // Update selectors if an arm was added or if field uses arms
        if (type === 'arm') {
            this.updateArmSelectors();
        }
        if (type === 'mortality' || type === 'mrs' || type === 'complication') {
            this.updateArmSelectors();
        }
    },

    // Convenience methods for each field type
    addIndication: function() {
        this.addField('indication', 'indications-container');
    },

    addIntervention: function() {
        this.addField('intervention', 'interventions-container');
    },

    addArm: function() {
        this.addField('arm', 'arms-container');
    },

    addMortality: function() {
        this.addField('mortality', 'mortality-global-container');
    },

    addMRS: function() {
        this.addField('mrs', 'mrs-global-container');
    },

    addComplication: function() {
        this.addField('complication', 'complications-container');
    },

    addPredictor: function() {
        this.addField('predictor', 'predictors-container');
    },

    /**
     * Remove a dynamic field
     * @param button - The remove button that was clicked
     */
    removeElement: function(button: HTMLElement) {
        button.closest('.dynamic-container')?.remove();
        this.updateArmSelectors();
    },

    /**
     * Update all arm selector dropdowns with current arm labels
     */
    updateArmSelectors: function() {
        // Collect all arm labels
        const armLabels = Array.from(document.querySelectorAll('.arm-label-input'))
            .map(input => (input as HTMLInputElement).value.trim())
            .filter(Boolean);

        // Update all arm selectors
        document.querySelectorAll('.arm-selector').forEach(selectEl => {
            const select = selectEl as HTMLSelectElement;
            const currentValue = select.value;

            // Clear and rebuild options
            select.innerHTML = '<option value="">Select Arm...</option>';

            armLabels.forEach(label => {
                const option = new Option(label, label);
                select.add(option);
            });

            // Try to reselect the previous value if it still exists
            if (armLabels.includes(currentValue)) {
                select.value = currentValue;
            }
        });
    }
};

// Export default DynamicFields object
export default DynamicFields;

// Export individual functions for window binding
export const addIndication = () => DynamicFields.addIndication();
export const addIntervention = () => DynamicFields.addIntervention();
export const addArm = () => DynamicFields.addArm();
export const addMortality = () => DynamicFields.addMortality();
export const addMRS = () => DynamicFields.addMRS();
export const addComplication = () => DynamicFields.addComplication();
export const addPredictor = () => DynamicFields.addPredictor();
export const removeElement = (btn: HTMLElement) => DynamicFields.removeElement(btn);
export const updateArmSelectors = () => DynamicFields.updateArmSelectors();
