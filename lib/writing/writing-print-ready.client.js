/**
 * Wait for inline writing trace SVGs before printing.
 * @module lib/writing/writing-print-ready.client
 */

/**
 * @param {number} [timeoutMs]
 * @returns {Promise<void>}
 */
export function waitForWritingTraceAssetsReady(timeoutMs = 10000) {
  if (typeof document === "undefined") {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const started = Date.now();

    const poll = () => {
      const pending = document.querySelectorAll('[data-writing-trace-pending="true"]');
      const errors = document.querySelectorAll('[data-writing-trace-error="true"]');

      if (errors.length > 0) {
        const first = /** @type {HTMLElement} */ (errors[0]);
        reject(new Error(first.dataset.writingTraceError || "Writing trace asset failed to load"));
        return;
      }

      if (pending.length === 0) {
        resolve(undefined);
        return;
      }

      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Writing trace assets still loading (${pending.length} pending)`));
        return;
      }

      window.requestAnimationFrame(poll);
    };

    poll();
  });
}

/**
 * @returns {Promise<void>}
 */
export async function printWritingWorksheetWhenReady() {
  await waitForWritingTraceAssetsReady();
  window.print();
}
