/**
 * SERVICES/ACTION_SERVICE.TS
 * Service for orchestrating actions (Solve All) and batch execution.
 */

import { Logger } from '../utils/logger';
import { readClipboardDirect } from '../utils/clipboard';

/**
 * Executes a batch of unsolved questions.
 */
export async function executeBatch(
  unsolvedQuestions: SDKQuestionDTO[]
): Promise<SDKBatchResult | { error: string }> {
  const actionEngine = window.Cognilot?.SDK?.action;

  if (!actionEngine) {
    Logger.error('SDK ActionEngine not initialized');
    return { error: 'SDK ActionEngine not loaded' };
  }

  Logger.info(
    `Delegating execution of ${unsolvedQuestions.length} questions to SDK ActionEngine...`
  );

  // Notify progress before batch execution
  chrome.runtime.sendMessage(
    {
      action: 'solveAllProgress',
      status: 'batch_start',
      total: unsolvedQuestions.length,
    },
    {},
    () => {
      const runtime = chrome.runtime as any;
      void runtime.lastError;
    }
  );

  return await actionEngine.executeBatch(unsolvedQuestions);
}

/**
 * Main "Solve All" orchestration.
 */
export async function solveAll(
  precomputedQuestions: SDKQuestionDTO[] | null = null,
  useClipboard: boolean = false,
  preloadedClipboard: any = null
): Promise<SDKBatchResult | { error: string }> {
  const sdk = window.Cognilot?.SDK;
  const actionEngine = sdk?.action;

  const checkClipboard =
    useClipboard ||
    (window.Cognilot?.Inspector?.UI?.ToolbarUI?.getUseClipboardContext?.() ?? false);

  console.log('[ActionService] solveAll triggered', {
    hasPrecomputed: !!precomputedQuestions,
    hasActionEngine: !!actionEngine,
    checkClipboard,
  });

  if (!actionEngine) {
    Logger.error('Action Service: SDK ActionEngine not loaded');
    return { error: 'SDK not loaded' };
  }

  let options: { clipboard?: any } | undefined;
  if (preloadedClipboard) {
    options = { clipboard: preloadedClipboard };
    console.log('[ActionService] Preloaded clipboard context attached:', preloadedClipboard.type);
  } else if (checkClipboard) {
    try {
      const clipboardData = await readClipboardDirect();
      if (clipboardData && clipboardData.type !== 'empty') {
        options = { clipboard: clipboardData };
        console.log('[ActionService] Clipboard context attached:', clipboardData.type);
      }
    } catch (e) {
      console.warn('[ActionService] Failed to read clipboard context:', e);
    }
  }

  Logger.processing('Starting Solve All Orchestration...');

  const progressHandler = (progress: any): void => {
    console.log('[ActionService] Batch progress:', progress);
    chrome.runtime.sendMessage({ action: 'solveAllProgress', ...progress }, {}, () => {
      const runtime = chrome.runtime as any;
      void runtime.lastError;
    });
  };

  if (precomputedQuestions) {
    console.log('[ActionService] Solving with precomputed questions', precomputedQuestions.length);
    return await actionEngine.executeBatch(precomputedQuestions, progressHandler, options);
  } else {
    // Use existing detection result from auto-scan if available
    const lastResult: any = (sdk as any).detection?.lastResult;
    const hasCachedFields = lastResult && lastResult.questions && lastResult.questions.length > 0;

    if (hasCachedFields) {
      console.log(
        '[ActionService] Re-using previous detection results for solveAll:',
        lastResult.questions.length
      );
      return await actionEngine.executeBatch(lastResult.questions, progressHandler, options);
    }

    // Fallback: solve entire page/best form
    const bodyNode = sdk.wrap(document.body);
    console.log('[ActionService] No detection result found. Performing fallback scan...', {
      bodyNode: !!bodyNode,
    });
    const detection = await sdk.detection.detect(bodyNode);
    return await actionEngine.executeBatch(detection.questions, progressHandler, options);
  }
}

export const ActionService = {
  executeBatch,
  solveAll,
};
