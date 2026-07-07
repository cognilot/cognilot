/**
 * UTILS/PREVIEW_PUBLISHER.TS
 * Unified publisher for detection previews to the sidebar/background.
 */

interface PreviewQuestion {
  type?: string;
  text?: string;
  label?: string;
  question?: string;
  placeholder?: string;
  currentValue?: string;
  selector?: string;
  key?: string;
  id?: string;
  ref_id?: string | null;
  section_ref_id?: string | null;
}

interface DetectionData {
  questions?: PreviewQuestion[];
  [key: string]: unknown;
}

let _lastScopedPreviewHash = '';

export function buildScopedDetectionHash(detection: DetectionData): string {
  const questions = Array.isArray(detection?.questions) ? detection.questions : [];
  const signature = questions
    .map((q) => {
      const txt = String(q?.text || q?.label || q?.question || '').slice(0, 120);
      return [q?.key || '', q?.ref_id || '', q?.section_ref_id || '', q?.type || '', txt].join('|');
    })
    .join('||');
  return [window.location.hostname, window.location.pathname, questions.length, signature].join(
    '::'
  );
}

export function publish(
  detection: DetectionData | PreviewQuestion | null,
  source = 'scoped_focus',
  triggerType = 'focus'
): void {
  if (!detection) return;

  const isArray = Array.isArray((detection as DetectionData).questions);
  const questionsList = isArray
    ? (detection as DetectionData).questions!
    : [detection as PreviewQuestion];

  if (questionsList.length === 0) return;

  const nextHash = buildScopedDetectionHash({ questions: questionsList });
  if (nextHash === _lastScopedPreviewHash) return;
  _lastScopedPreviewHash = nextHash;

  const questions = questionsList.map((q) => ({
    type: q?.type || 'text',
    text: q?.text || q?.label || q?.question || '',
    label: q?.label || '',
    placeholder: q?.placeholder || '',
    currentValue: q?.currentValue || '',
    selector: q?.selector || '',
    key: q?.key || q?.id || '',
    ref_id: q?.ref_id || null,
    section_ref_id: q?.section_ref_id || null,
  }));

  try {
    chrome.runtime.sendMessage(
      {
        action: 'scopedDetectionPreview',
        data: {
          source: source,
          triggerType: triggerType,
          url: window.location.href,
          language: document.documentElement.lang || navigator.language || 'en',
          count: questions.length,
          questions: questions,
          ts: Date.now(),
        },
      },
      {},
      () => {
        const runtime = chrome.runtime as any;
        void runtime.lastError;
      }
    );
  } catch (_e) {
    // Sidebar may be closed; silently ignore transport failures.
  }
}

export function dispose(): void {
  _lastScopedPreviewHash = '';
}

export const PreviewPublisher = {
  buildScopedDetectionHash,
  publish,
  dispose,
};
