/**
 * UTILS/COMMON.TS
 * Shared helpers for label normalization, page context, and proxy API requests.
 */

interface QuestionLike {
  selector?: string;
  text?: string;
  label?: string;
  placeholder?: string;
  name?: string;
  id?: string;
  field?: {
    label?: string;
    placeholder?: string;
    name?: string;
    id?: string;
  };
}

interface ProxyResponse {
  ok?: boolean;
  status?: number;
  statusText?: string;
  text?: string;
}

export function normalizeLabel(text: string, toLower = false): string {
  const raw = String(text || '');
  const asteriskIdx = raw.indexOf('*');
  const stripped =
    asteriskIdx > 0 ? raw.substring(0, asteriskIdx) : asteriskIdx === 0 ? raw.substring(1) : raw;
  const normalized = stripped
    .replace(/:/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return toLower ? normalized.toLowerCase() : normalized;
}

export function getCleanLabelFromQuestion(q: Partial<QuestionLike>): string {
  const question = q || {};

  if (question.selector && window.Cognilot?.SDK?.Core?.DOMExtractor) {
    try {
      const el = document.querySelector(question.selector);
      if (el) {
        const extracted = window.Cognilot.SDK.Core.DOMExtractor.extractFieldMetadata?.(
          el as HTMLElement
        );
        const base =
          extracted?.label ||
          (extracted as any)?.placeholder ||
          (extracted as any)?.name ||
          (extracted as any)?.id ||
          '';
        if (base) return normalizeLabel(base as string);
      }
    } catch (_e) {
      // silently ignore
    }
  }

  const field = question.field || {};
  const base =
    field.label ||
    question.text ||
    question.label ||
    field.placeholder ||
    question.placeholder ||
    field.name ||
    question.name ||
    field.id ||
    question.id ||
    'Field';
  return normalizeLabel(base);
}

export function buildPageContext(baseCtx: Record<string, unknown> = {}): Record<string, unknown> {
  if (baseCtx && Object.keys(baseCtx).length > 0) {
    return baseCtx;
  }
  return window.Cognilot.SDK.Core.DOMExtractor.extractPageContext?.(false) ?? {};
}

export function postProxyRequest(
  url: string,
  payload: unknown,
  moduleName?: string
): Promise<unknown> {
  const tag = moduleName || 'Cognilot';
  console.log(`🚀 [${tag}] Sending Request to Backend:`, url);
  console.log('JSON Payload:', JSON.stringify(payload, null, 2));

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: 'proxyRequest',
        url: url,
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      },
      {},
      (response: any) => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
          const errMsg = runtime.lastError.message || '';
          if (errMsg.includes('context invalidated')) {
            return reject(new Error('Extension context invalidated'));
          }
          console.error(`❌ [${tag}] Runtime Error:`, runtime.lastError);
          return reject(runtime.lastError);
        }

        if (!response || !response.ok) {
          const status = response?.status;
          const statusText = response?.statusText || 'Error desconocido';
          console.error(`❌ [${tag}] Backend Error:`, statusText);

          let errorMessage = statusText;
          if (status === 0 || statusText.includes('Failed to fetch')) {
            errorMessage = 'Servidor apagado o inaccesible';
          } else if (status) {
            errorMessage = `HTTP ${status}: ${statusText}`;
          }
          return reject(new Error(errorMessage));
        }

        try {
          const data =
            typeof response.text === 'string' ? JSON.parse(response.text) : response.text;
          resolve(data);
        } catch (e) {
          console.error(`❌ [${tag}] Parse Error:`, e);
          reject(e);
        }
      }
    );
  });
}
