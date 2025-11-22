/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ErrorBoundary - Global error handling and crash recovery system
 * 
 * Features:
 * - Captures all unhandled errors via window.onerror
 * - Logs full stack traces to console
 * - Displays user-friendly error messages
 * - Saves application state to LocalStorage before crash
 * - Enables crash recovery on next session
 */

import AppStateManager from '../state/AppStateManager';
import StatusManager from './status';

/**
 * Interface for crash recovery data stored in LocalStorage
 */
interface CrashRecoveryData {
  timestamp: string;
  errorMessage: string;
  errorStack?: string;
  appState: {
    documentName: string;
    currentPage: number;
    totalPages: number;
    scale: number;
    extractions: any[];
    currentStep: number;
    formData?: any;
  };
  pdfData?: {
    name: string;
    lastModified: number;
    size: number;
  };
}

/**
 * Storage key for crash recovery data
 */
const CRASH_RECOVERY_KEY = 'clinical_extractor_crash_recovery';

/**
 * Flag to prevent recursive error handling
 */
let isHandlingError = false;

/**
 * Saves current application state to LocalStorage for crash recovery
 * @param errorMessage - The error message that triggered the save
 * @param errorStack - Optional stack trace
 */
function saveCrashState(errorMessage: string, errorStack?: string): void {
  if (isHandlingError) {
    return;
  }

  isHandlingError = true;

  try {
    const state = AppStateManager.getState();

    const formData: any = {};
    const formElements = document.querySelectorAll('input, textarea, select');
    formElements.forEach((element: any) => {
      if (element.id) {
        formData[element.id] = element.value;
      }
    });

    const crashData: CrashRecoveryData = {
      timestamp: new Date().toISOString(),
      errorMessage,
      errorStack,
      appState: {
        documentName: state.documentName,
        currentPage: state.currentPage,
        totalPages: state.totalPages,
        scale: state.scale,
        extractions: state.extractions,
        currentStep: state.currentStep,
        formData
      }
    };

    localStorage.setItem(CRASH_RECOVERY_KEY, JSON.stringify(crashData));

    console.log('✅ Crash state saved successfully');
  } catch (saveError) {
    console.error('❌ Failed to save crash state:', saveError);
  } finally {
    isHandlingError = false;
  }
}

/**
 * Global error handler
 * Captures all unhandled errors and saves state before crash
 */
function handleGlobalError(
  message: string | Event,
  source?: string,
  lineno?: number,
  colno?: number,
  error?: Error
): boolean {
  if (isHandlingError) {
    return false;
  }

  isHandlingError = true;

  try {
    const errorMessage = typeof message === 'string' ? message : message.toString();
    const errorStack = error?.stack || 'No stack trace available';

    console.error('='.repeat(80));
    console.error('🚨 UNHANDLED ERROR DETECTED');
    console.error('='.repeat(80));
    console.error('Message:', errorMessage);
    if (source) console.error('Source:', source);
    if (lineno) console.error('Line:', lineno);
    if (colno) console.error('Column:', colno);
    console.error('Stack Trace:');
    console.error(errorStack);
    console.error('='.repeat(80));

    saveCrashState(errorMessage, errorStack);

    StatusManager.show(
      'Application error detected. Your work has been saved for recovery.',
      'error',
      10000
    );

    createErrorModal(errorMessage, errorStack);

  } catch (handlerError) {
    console.error('❌ Error in error handler:', handlerError);
  } finally {
    isHandlingError = false;
  }

  return false;
}

/**
 * Creates a modal overlay to display critical errors
 * @param errorMessage - The error message to display
 * @param errorStack - The stack trace
 */
function createErrorModal(errorMessage: string, errorStack: string): void {
  if (document.getElementById('error-boundary-modal')) {
    return;
  }

  const modal = document.createElement('div');
  modal.id = 'error-boundary-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    font-family: system-ui, -apple-system, sans-serif;
  `;

  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: #1a1a1a;
    border: 2px solid #ff4444;
    border-radius: 8px;
    padding: 24px;
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    color: #ffffff;
  `;

  modalContent.innerHTML = `
    <h2 style="color: #ff4444; margin-top: 0;">⚠️ Application Error</h2>
    <p style="margin: 16px 0;">
      An unexpected error occurred, but don't worry - your work has been saved automatically.
    </p>
    <div style="background: #2a2a2a; padding: 12px; border-radius: 4px; margin: 16px 0;">
      <strong>Error:</strong>
      <pre style="margin: 8px 0; white-space: pre-wrap; word-break: break-word; font-size: 12px;">${escapeHtml(errorMessage)}</pre>
    </div>
    <details style="margin: 16px 0;">
      <summary style="cursor: pointer; color: #888;">Show technical details</summary>
      <pre style="margin: 8px 0; white-space: pre-wrap; word-break: break-word; font-size: 11px; color: #888;">${escapeHtml(errorStack)}</pre>
    </details>
    <div style="display: flex; gap: 12px; margin-top: 24px;">
      <button id="error-modal-reload" style="
        flex: 1;
        padding: 12px 24px;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 600;
      ">
        Reload & Recover
      </button>
      <button id="error-modal-close" style="
        padding: 12px 24px;
        background: #666;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">
        Continue Anyway
      </button>
    </div>
  `;

  modal.appendChild(modalContent);
  document.body.appendChild(modal);

  document.getElementById('error-modal-reload')?.addEventListener('click', () => {
    window.location.reload();
  });

  document.getElementById('error-modal-close')?.addEventListener('click', () => {
    modal.remove();
  });
}

/**
 * Escapes HTML to prevent XSS in error messages
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Handles unhandled promise rejections
 */
function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  console.error('🚨 UNHANDLED PROMISE REJECTION');
  console.error('Reason:', event.reason);

  const errorMessage = event.reason?.message || event.reason?.toString() || 'Unknown promise rejection';
  const errorStack = event.reason?.stack || 'No stack trace available';

  saveCrashState(errorMessage, errorStack);

  StatusManager.show(
    'An error occurred in the background. Your work has been saved.',
    'error',
    5000
  );
}

/**
 * Initializes the error boundary system
 * Sets up global error handlers
 */
export function initializeErrorBoundary(): void {
  console.log('🛡️ Initializing Error Boundary...');

  window.onerror = handleGlobalError;

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  console.log('✅ Error Boundary initialized');
}

/**
 * Checks if crash recovery data exists
 * @returns True if recovery data is available
 */
export function hasCrashRecoveryData(): boolean {
  try {
    const data = localStorage.getItem(CRASH_RECOVERY_KEY);
    return data !== null;
  } catch (error) {
    console.error('Error checking crash recovery data:', error);
    return false;
  }
}

/**
 * Gets crash recovery data from LocalStorage
 * @returns Crash recovery data or null if not available
 */
export function getCrashRecoveryData(): CrashRecoveryData | null {
  try {
    const data = localStorage.getItem(CRASH_RECOVERY_KEY);
    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading crash recovery data:', error);
    return null;
  }
}

/**
 * Clears crash recovery data from LocalStorage
 */
export function clearCrashRecoveryData(): void {
  try {
    localStorage.removeItem(CRASH_RECOVERY_KEY);
    console.log('✅ Crash recovery data cleared');
  } catch (error) {
    console.error('Error clearing crash recovery data:', error);
  }
}

/**
 * Manually trigger crash state save (for testing)
 */
export function triggerCrashStateSave(): void {
  saveCrashState('Manual crash state save (testing)', 'Test stack trace');
  console.log('✅ Manual crash state saved');
}

export default {
  initializeErrorBoundary,
  hasCrashRecoveryData,
  getCrashRecoveryData,
  clearCrashRecoveryData,
  triggerCrashStateSave
};
