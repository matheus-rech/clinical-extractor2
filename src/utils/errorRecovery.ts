/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * ErrorRecovery - Crash recovery system for restoring application state
 * 
 * Features:
 * - Checks for crash recovery data on startup
 * - Prompts user to restore previous session
 * - Restores PDF, extractions, and form data
 * - Cleans up recovery data after successful restore
 */

import AppStateManager from '../state/AppStateManager';
import ExtractionTracker from '../data/ExtractionTracker';
import StatusManager from './status';
import { hasCrashRecoveryData, getCrashRecoveryData, clearCrashRecoveryData } from './errorBoundary';

/**
 * Interface for recovery modal result
 */
interface RecoveryModalResult {
  accepted: boolean;
}

/**
 * Creates and displays a recovery prompt modal
 * @returns Promise that resolves with user's choice
 */
function createRecoveryModal(): Promise<RecoveryModalResult> {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.id = 'recovery-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.85);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      font-family: system-ui, -apple-system, sans-serif;
      animation: fadeIn 0.3s ease-in;
    `;

    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #4CAF50;
      border-radius: 12px;
      padding: 32px;
      max-width: 500px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
      color: #ffffff;
      animation: slideIn 0.3s ease-out;
    `;

    const crashData = getCrashRecoveryData();
    const crashTime = crashData ? new Date(crashData.timestamp).toLocaleString() : 'Unknown';

    modalContent.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="font-size: 48px; margin-bottom: 16px;">🔄</div>
        <h2 style="color: #4CAF50; margin: 0 0 8px 0; font-size: 24px;">
          Session Recovery Available
        </h2>
        <p style="color: #888; font-size: 14px; margin: 0;">
          Last crash: ${crashTime}
        </p>
      </div>

      <div style="background: rgba(255, 255, 255, 0.05); padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6;">
          It looks like the app crashed during your last session. Would you like to restore your work?
        </p>
        <div style="font-size: 13px; color: #aaa; line-height: 1.5;">
          <strong>Recoverable data:</strong>
          <ul style="margin: 8px 0; padding-left: 20px;">
            <li>PDF document and current page</li>
            <li>All extractions and annotations</li>
            <li>Form data and progress</li>
          </ul>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-top: 24px;">
        <button id="recovery-accept" style="
          flex: 1;
          padding: 14px 24px;
          background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          transition: transform 0.2s, box-shadow 0.2s;
        " onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(76, 175, 80, 0.4)';" onmouseout="this.style.transform=''; this.style.boxShadow='';">
          ✓ Restore Session
        </button>
        <button id="recovery-decline" style="
          padding: 14px 24px;
          background: rgba(255, 255, 255, 0.1);
          color: #ccc;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          cursor: pointer;
          font-size: 15px;
          transition: background 0.2s;
        " onmouseover="this.style.background='rgba(255, 255, 255, 0.15)';" onmouseout="this.style.background='rgba(255, 255, 255, 0.1)';">
          Start Fresh
        </button>
      </div>
    `;

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideIn {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(style);

    document.getElementById('recovery-accept')?.addEventListener('click', () => {
      modal.remove();
      style.remove();
      resolve({ accepted: true });
    });

    document.getElementById('recovery-decline')?.addEventListener('click', () => {
      modal.remove();
      style.remove();
      resolve({ accepted: false });
    });
  });
}

/**
 * Restores form data from crash recovery
 * @param formData - Object containing form field values
 */
function restoreFormData(formData: any): void {
  if (!formData) return;

  let restoredCount = 0;

  Object.entries(formData).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId) as HTMLInputElement | HTMLTextAreaElement;
    if (element && value) {
      element.value = value as string;
      restoredCount++;
    }
  });

  console.log(`✅ Restored ${restoredCount} form fields`);
}

/**
 * Restores extractions from crash recovery
 * @param extractions - Array of extraction objects
 */
function restoreExtractions(extractions: any[]): void {
  if (!extractions || extractions.length === 0) return;

  ExtractionTracker.extractions = [];
  ExtractionTracker.fieldMap.clear();

  extractions.forEach(extraction => {
    ExtractionTracker.extractions.push(extraction);
    ExtractionTracker.fieldMap.set(extraction.fieldName, extraction);
    ExtractionTracker.updateTraceLog(extraction);
  });

  ExtractionTracker.updateStats();

  AppStateManager.setState({ extractions });

  console.log(`✅ Restored ${extractions.length} extractions`);
}

/**
 * Restores application state from crash recovery
 * @param appState - Application state object
 */
function restoreAppState(appState: any): void {
  if (!appState) return;

  AppStateManager.setState({
    currentPage: appState.currentPage || 1,
    scale: appState.scale || 1.0,
    currentStep: appState.currentStep || 0,
    documentName: appState.documentName || ''
  });

  console.log('✅ Restored application state');
}

/**
 * Performs the complete recovery process
 * @param crashData - Crash recovery data
 */
async function performRecovery(crashData: any): Promise<void> {
  try {
    StatusManager.show('Restoring your session...', 'info', 3000);

    restoreAppState(crashData.appState);
    restoreExtractions(crashData.appState.extractions);
    restoreFormData(crashData.appState.formData);

    StatusManager.show(
      `✅ Session restored successfully! Recovered ${crashData.appState.extractions?.length || 0} extractions.`,
      'success',
      5000
    );

    clearCrashRecoveryData();

    console.log('✅ Recovery completed successfully');
  } catch (error) {
    console.error('❌ Error during recovery:', error);
    StatusManager.show(
      'Failed to restore session completely. Some data may be missing.',
      'warning',
      5000
    );
  }
}

/**
 * Checks for crash recovery data and prompts user to restore
 * Should be called on application startup
 */
export async function checkAndOfferRecovery(): Promise<void> {
  if (!hasCrashRecoveryData()) {
    console.log('ℹ️ No crash recovery data found');
    return;
  }

  console.log('🔄 Crash recovery data detected');

  const crashData = getCrashRecoveryData();
  if (!crashData) {
    console.warn('⚠️ Could not load crash recovery data');
    return;
  }

  const result = await createRecoveryModal();

  if (result.accepted) {
    console.log('✅ User accepted recovery');
    await performRecovery(crashData);
  } else {
    console.log('ℹ️ User declined recovery');
    clearCrashRecoveryData();
    StatusManager.show('Starting fresh session', 'info', 2000);
  }
}

/**
 * Manually trigger recovery (for testing)
 */
export async function triggerManualRecovery(): Promise<void> {
  if (!hasCrashRecoveryData()) {
    StatusManager.show('No recovery data available', 'warning', 3000);
    return;
  }

  const crashData = getCrashRecoveryData();
  if (crashData) {
    await performRecovery(crashData);
  }
}

export default {
  checkAndOfferRecovery,
  triggerManualRecovery
};