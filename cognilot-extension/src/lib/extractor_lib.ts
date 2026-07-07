/**
 * LIB/EXTRACTOR_LIB.TS
 * Responsible for scraping/extracting DOM element content in two modes:
 * - 'text': Converts the element to Markdown using TurndownService
 * - 'visual': Requests a screenshot crop from the background script via captureVisibleTab
 */

interface MarkdownResult {
  mode: 'text';
  markdown: string;
  page_context: {
    url: string;
    domain: string;
    title: string;
    language: string;
  };
}

interface VisualResult {
  mode: 'visual';
  imageDataUrl: string;
  page_context: {
    url: string;
    domain: string;
    title: string;
    language: string;
  };
}

function buildPageContext(): {
  url: string;
  domain: string;
  title: string;
  language: string;
} {
  return {
    url: window.location.href,
    domain: window.location.hostname,
    title: document.title,
    language: document.documentElement.lang || navigator.language || 'en',
  };
}

/**
 * Extract markdown content from a DOM element.
 */
export function extractMarkdown(el: HTMLElement): MarkdownResult {
  let container: HTMLElement = el;
  const resolver = (window.Cognilot as Record<string, unknown>)?.Detection as
    | Record<string, { resolveFromElement?(el: HTMLElement): HTMLElement | null }>
    | undefined;
  const containerResolver = resolver?.ContainerResolver;
  if (containerResolver && typeof containerResolver.resolveFromElement === 'function') {
    const resolved = containerResolver.resolveFromElement(el);
    if (resolved) container = resolved;
  } else {
    container =
      el.closest(
        '[data-automation-id="questionItem"], .question, .form-group, form, [role="form"], .form-container, .form-wrapper, .form-section, section, main, article'
      ) || el;
  }

  let markdown = '';
  try {
    if (window.TurndownService) {
      const turndownService = new window.TurndownService();
      markdown = turndownService.turndown(container);
    } else {
      markdown = container.innerText || el.innerText || '';
      console.warn('Cognilot: Turndown service is not loaded, using innerText fallback.');
    }
  } catch (err) {
    console.error('Inspector Content Extractor Error (Turndown):', err);
    markdown = container.innerText || '';
  }

  return {
    mode: 'text',
    markdown: markdown,
    page_context: buildPageContext(),
  };
}

/**
 * Extract a visual screenshot of a DOM element by asking background to
 * captureVisibleTab, then cropping the resulting image to the element's bounding rect.
 */
export function extractVisual(el: HTMLElement): Promise<VisualResult> {
  return new Promise((resolve, reject) => {
    const rect = el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    chrome.runtime.sendMessage(
      { action: 'captureVisibleTab' },
      {},
      (response: { dataUrl?: string } | undefined) => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
          console.error('Inspector Content Extractor: captureVisibleTab failed', runtime.lastError);
          return reject(runtime.lastError);
        }

        if (!response || !response.dataUrl) {
          return reject(new Error('No screenshot data received'));
        }

        const img = new Image();
        img.onload = (): void => {
          const canvas = document.createElement('canvas');
          const cropX = rect.left * dpr;
          const cropY = rect.top * dpr;
          const cropW = rect.width * dpr;
          const cropH = rect.height * dpr;

          canvas.width = cropW;
          canvas.height = cropH;

          const ctx = canvas.getContext('2d');
          ctx!.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          const croppedDataUrl = canvas.toDataURL('image/png');

          resolve({
            mode: 'visual',
            imageDataUrl: croppedDataUrl,
            page_context: buildPageContext(),
          });
        };
        img.onerror = (): void => reject(new Error('Failed to load screenshot for cropping'));
        img.src = response.dataUrl;
      }
    );
  });
}

export const ExtractorLib = {
  extractMarkdown,
  extractVisual,
};
