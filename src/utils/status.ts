/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * StatusManager - Manages status messages and loading indicators
 * Handles displaying user feedback throughout the application
 */

type StatusType = 'success' | 'warning' | 'error' | 'info';

interface StatusElements {
    statusDiv: HTMLElement | null;
    messageSpan: HTMLElement | null;
    spinnerDiv: HTMLElement | null;
}

interface StatusManagerType extends StatusElements {
    timeoutId: number | null;
    show: (message: string, type?: StatusType, duration?: number) => void;
    showLoading: (show: boolean) => void;
}

const StatusManager: StatusManagerType = {
    statusDiv: document.getElementById('extraction-status'),
    messageSpan: document.getElementById('status-message'),
    spinnerDiv: document.getElementById('loading-spinner'),
    timeoutId: null,

    /**
     * Shows a status message with optional type and duration
     * @param message - The message to display
     * @param type - Type of message (success, warning, error, info)
     * @param duration - How long to show the message in milliseconds
     */
    show: function(message: string, type: StatusType = 'info', duration: number = 3000): void {
        if (!this.statusDiv || !this.messageSpan) return;

        // Clear existing timeout if any
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }

        this.messageSpan.textContent = message;
        this.statusDiv.className = 'extraction-status show';

        const colors: Record<StatusType, string> = {
            success: '#4CAF50',
            warning: '#FF9800',
            error: '#f44336',
            info: '#2196F3'
        };

        this.statusDiv.style.background = colors[type] || colors.info;
        this.statusDiv.style.color = 'white';

        this.timeoutId = window.setTimeout(() => {
            this.statusDiv?.classList.remove('show');
            this.timeoutId = null;
        }, duration);
    },

    /**
     * Shows or hides the loading spinner
     * @param show - Whether to show (true) or hide (false) the spinner
     */
    showLoading: function(show: boolean): void {
        this.spinnerDiv?.classList.toggle('active', show);
    }
};

export default StatusManager;
