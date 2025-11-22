/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Event listener tracking type defined inline

/**
 * Cleanup function type
 */
type CleanupFunction = () => void;

/**
 * Memory management utilities for tracking and cleaning up event listeners, timeouts, and module resources
 * Prevents memory leaks by maintaining references to all registered listeners, timeouts, and cleanup functions
 * 
 * Architecture:
 * - Uses a central cleanup registry pattern for loose coupling between modules
 * - Modules can register cleanup functions without creating circular dependencies
 * - Type-safe alternative to using global window variables
 */
const MemoryManager = {
  listeners: [] as Array<{
    el: HTMLElement | Window | Document;
    type: string;
    handler: EventListenerOrEventListenerObject;
  }>,
  timeouts: [] as number[],
  cleanupCallbacks: new Map<string, CleanupFunction>(),

  /**
   * Register an event listener and track it for cleanup
   * @param el - The element to attach the listener to
   * @param type - The event type (e.g., 'click', 'change')
   * @param handler - The event handler function
   */
  registerEventListener: function (
    el: HTMLElement | Window | Document,
    type: string,
    handler: EventListenerOrEventListenerObject
  ): void {
    el.addEventListener(type, handler);
    this.listeners.push({ el, type, handler });
  },

  /**
   * Register a timeout ID for cleanup
   * @param id - The timeout ID returned by setTimeout
   */
  registerTimeout: function (id: number): void {
    this.timeouts.push(id);
  },

  /**
   * Register a cleanup function to be called during cleanup
   * This allows modules to register their own cleanup logic without creating circular dependencies
   * 
   * @param name - Unique name for the cleanup function (e.g., 'PDFRenderer', 'AnnotationService')
   * @param cleanupFn - The cleanup function to execute
   * 
   * @example
   * ```typescript
   * // In PDFRenderer module initialization
   * MemoryManager.registerCleanup('PDFRenderer', () => {
   *   PDFRenderer.cleanup();
   * });
   * ```
   */
  registerCleanup: function (name: string, cleanupFn: CleanupFunction): void {
    this.cleanupCallbacks.set(name, cleanupFn);
  },

  /**
   * Unregister a cleanup function
   * @param name - Name of the cleanup function to remove
   */
  unregisterCleanup: function (name: string): void {
    this.cleanupCallbacks.delete(name);
  },

  /**
   * Clean up all registered event listeners, timeouts, and module resources
   * Should be called before page unload or when resetting the application
   */
  cleanup: function (): void {
    // Remove all event listeners
    this.listeners.forEach(({ el, type, handler }) => {
      el.removeEventListener(type, handler);
    });

    // Clear all timeouts
    this.timeouts.forEach((id) => clearTimeout(id));

    // Execute all registered cleanup callbacks
    this.cleanupCallbacks.forEach((cleanupFn, name) => {
      try {
        cleanupFn();
        console.log(`${name} cleanup completed`);
      } catch (err) {
        console.error(`${name} cleanup failed:`, err);
      }
    });

    // Reset the arrays and map
    this.listeners = [];
    this.timeouts = [];
    this.cleanupCallbacks.clear();

    console.log('MemoryManager cleanup performed');
  },
};

// Automatically cleanup before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => MemoryManager.cleanup());
}

export default MemoryManager;
