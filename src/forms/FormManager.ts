/**
 * FormManager - Centralized form state and navigation management
 *
 * Responsibilities:
 * - Form field initialization and validation
 * - Step-based navigation (next/prev/show)
 * - Field focus/blur event handling
 * - Form data collection
 * - UI state updates
 */

import SecurityUtils from '../utils/security';
import MemoryManager from '../utils/memory';


// Temporary reference to objects still in index.tsx
// These will be properly imported after Phase 6
let AppStateManager: any;
let StatusManager: any;
let DynamicFields: any;

// Initialization function to set external dependencies
export function setDependencies(deps: {
    appStateManager: any;
    statusManager: any;
    dynamicFields: any;
}) {
    AppStateManager = deps.appStateManager;
    StatusManager = deps.statusManager;
    DynamicFields = deps.dynamicFields;
}

/**
 * FormManager object - manages form lifecycle
 */
const FormManager = {
    validator: SecurityUtils, // Use SecurityUtils directly for validation

    /**
     * Initialize the form system
     */
    initialize: function() {
        this.initializeFormFields();
        this.initializeNavigation();
        if (DynamicFields) {
            DynamicFields.initialize(); // Initialize dynamic fields
        }
        this.showStep(0);
    },

    /**
     * Initialize form field event listeners
     * Registers focus/blur handlers for all .linked-input elements
     */
    initializeFormFields: function() {
        const inputs = document.querySelectorAll('.linked-input');
        inputs.forEach(input => {
            // Use MemoryManager if available, otherwise basic listeners
            const manager = window.MemoryManager || MemoryManager;

            // Focus handler - highlight active field
            manager.registerEventListener(input, 'focus', () => {
                document.querySelectorAll('.form-group').forEach(g => g.classList.remove('active-extraction'));
                const fieldName = (input as HTMLInputElement).name || input.id;

                if (AppStateManager) {
                    AppStateManager.setState({
                        activeField: fieldName,
                        activeFieldElement: input
                    });
                }

                input.closest('.form-group')?.classList.add('active-extraction');
                const indicator = document.getElementById('active-field-indicator');
                if (indicator) {
                    indicator.textContent = `Extracting: ${fieldName}`;
                    indicator.style.background = '#4CAF50';
                }
            });

            // Blur handler - validate field
            manager.registerEventListener(input, 'blur', () => {
                this.validateFieldUIUpdate(input);
            });
        });
    },

    /**
     * Validate a single field and update UI
     * @param input - The input element to validate
     * @returns boolean - Whether the field is valid
     */
    validateFieldUIUpdate: function(input: Element): boolean {
        const result = this.validator.validateInput(input as HTMLElement);
        input.classList.toggle('validation-error', !result.valid);

        const messageEl = input.nextElementSibling as HTMLElement;
        if (messageEl && messageEl.classList.contains('validation-message')) {
            messageEl.textContent = result.valid ? '' : result.message;
            messageEl.style.display = result.valid ? 'none' : 'block';
        }

        return result.valid;
    },

    /**
     * Initialize navigation button handlers
     */
    initializeNavigation: function() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-gsheets-btn');

        if (prevBtn) {
            prevBtn.onclick = () => this.previousStep();
        }
        if (nextBtn) {
            nextBtn.onclick = () => this.nextStep();
        }
        if (submitBtn) {
            submitBtn.onclick = (e) => window.handleSubmitToGoogleSheets(e);
        }
    },

    /**
     * Display a specific step and update UI
     * @param stepIndex - The step index to show (0-based)
     */
    showStep: function(stepIndex: number) {
        const steps = document.querySelectorAll('.step');
        const state = AppStateManager ? AppStateManager.getState() : { totalSteps: steps.length };

        // Toggle active class on steps
        steps.forEach((step, index) => step.classList.toggle('active', index === stepIndex));

        // Update prev button state
        const prevBtn = document.getElementById('prev-btn') as HTMLButtonElement;
        if (prevBtn) {
            prevBtn.disabled = (stepIndex === 0);
        }

        // Update step indicator
        const stepIndicator = document.getElementById('step-indicator');
        if (stepIndicator) {
            stepIndicator.textContent = `Step ${stepIndex + 1} of ${state.totalSteps}`;
        }

        // Show/hide next vs submit buttons
        const isLastStep = stepIndex === state.totalSteps - 1;
        const nextBtn = document.getElementById('next-btn') as HTMLElement;
        const submitBtnGroup = document.getElementById('submit-btn-group') as HTMLElement;

        if (nextBtn) {
            nextBtn.style.display = isLastStep ? 'none' : 'inline-block';
        }
        if (submitBtnGroup) {
            submitBtnGroup.style.display = isLastStep ? 'flex' : 'none';
        }

        // Scroll to top of form panel
        const formPanel = document.querySelector('.form-panel') as HTMLElement;
        if (formPanel) {
            formPanel.scrollTop = 0;
        }

        // Update progress bar
        const progressBar = document.getElementById('progress-bar') as HTMLElement;
        if (progressBar) {
            const progress = ((stepIndex + 1) / state.totalSteps) * 100;
            progressBar.style.width = progress + '%';
        }

        // Re-initialize fields in case dynamic ones were added
        this.initializeFormFields();

        // Update arm selectors if on relevant steps
        if (stepIndex >= 6 && window.updateArmSelectors) {
            window.updateArmSelectors();
        }
    },

    /**
     * Navigate to next step
     */
    nextStep: function() {
        const state = AppStateManager ? AppStateManager.getState() : { currentStep: 0, totalSteps: 10 };

        // Check inclusion criteria on step 2 (soft check)
        if (state.currentStep === 1) {
            const inclusionMet = (document.getElementById('inclusion-met') as HTMLSelectElement)?.value;
            if (inclusionMet === 'false') {
                // Use a simple confirm for preview, replace with modal in full app
                if (!confirm('Study does not meet inclusion criteria according to your selection. Continue extraction anyway?')) {
                    return; // Stop navigation
                }
            }
        }

        if (state.currentStep < state.totalSteps - 1) {
            const newStep = state.currentStep + 1;
            if (AppStateManager) {
                AppStateManager.setState({ currentStep: newStep });
            }
            this.showStep(newStep);
        }
    },

    /**
     * Navigate to previous step
     */
    previousStep: function() {
        const state = AppStateManager ? AppStateManager.getState() : { currentStep: 0 };

        if (state.currentStep > 0) {
            const newStep = state.currentStep - 1;
            if (AppStateManager) {
                AppStateManager.setState({ currentStep: newStep });
            }
            this.showStep(newStep);
        }
    },

    /**
     * Validate all steps before submission
     * @returns boolean - Whether all steps are valid
     */
    validateAllSteps: function(): boolean {
        let allValid = true;
        const steps = document.querySelectorAll('.step');

        steps.forEach((step) => {
            step.querySelectorAll('[required], [data-validation]').forEach(input => {
                if (!this.validateFieldUIUpdate(input)) {
                    allValid = false;
                }
            });
        });

        if (!allValid && StatusManager) {
            StatusManager.show('Please correct errors on all steps before submitting.', 'warning');
        }

        return allValid;
    },

    /**
     * Collect all form data into a key-value object
     * @returns Object with form field names as keys and values
     */
    collectFormData: function(): { [key: string]: string } {
        const formData: { [key: string]: string } = {};

        document.querySelectorAll('#extraction-form input, #extraction-form textarea, #extraction-form select')
            .forEach(input => {
                const el = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
                if (el.value) {
                    formData[el.name || el.id] = el.value;
                }
            });

        return formData;
    }
};

export default FormManager;
