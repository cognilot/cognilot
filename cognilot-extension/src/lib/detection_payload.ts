/**
 * LIB/DETECTION_PAYLOAD.TS
 * Model/DTO for standardizing SDK detection results.
 */

interface RawQuestionData {
  id?: string;
  name?: string;
  ref_id?: string;
  text?: string;
  label?: string;
  question?: string;
  placeholder?: string;
  type?: string;
  tagName?: string;
  required?: boolean;
  selector?: string;
  node?: SDKNode | null;
  value?: string;
  options?: Array<{ text: string; value: string; index: number }>;
  metadata?: {
    label?: string;
    required?: boolean;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

interface RawDetectionData {
  result?: RawDetectionData;
  questions?: RawQuestionData[];
  page_features?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  is_likely_form?: boolean;
  form_id?: string;
  id?: string;
  form_selector?: string;
  language?: string | null;
  [key: string]: unknown;
}

interface PageFeaturesData {
  platforms?: string[];
  form_count?: number;
}

interface MetadataData {
  engine?: string;
  confidence_score?: number;
  duration?: number;
  version?: string;
}

type DetectionSourceKey = 'manual_selection' | 'scoped_focus' | 'auto_detection';

/**
 * Represents a single field in the form.
 */
export class DetectionQuestion {
  index: number;
  id: string;
  name: string;
  text: string;
  placeholder: string;
  type: string;
  required: boolean;
  selector: string;
  node: SDKNode | null;
  currentValue: string;
  options: Array<{ text: string; value: string; index: number }>;
  metadata: Record<string, unknown>;

  constructor(q: RawQuestionData, index = 1) {
    this.index = index;
    this.id = q.id || q.name || q.ref_id || `field_${index}`;
    this.name = q.name || '';
    this.text = (q.text || q.label || q.metadata?.label || `Field ${index}`).trim();
    this.placeholder = q.placeholder || '';
    this.type = (q.type || q.tagName || 'text').toLowerCase();

    this.required = !!(q.required || q.metadata?.required);
    this.selector = q.selector || '';
    this.node = q.node || null;
    this.currentValue = this.node && typeof this.node.value !== 'undefined' ? this.node.value : '';

    this.options = Array.isArray(q.options) ? q.options : [];
    this.metadata = q.metadata || {};
  }

  /**
   * Clean result for message passing (removes DOM nodes).
   */
  serialize(): Omit<DetectionQuestion, 'node' | 'serialize'> {
    if (this.node && typeof this.node.value !== 'undefined') {
      this.currentValue = this.node.value;
    }
    const { node: _node, ...safeData } = this;
    return safeData as Omit<DetectionQuestion, 'node' | 'serialize'>;
  }
}

/**
 * Represents detected page features.
 */
export class DetectionPageFeatures {
  platforms: string[];
  formCount: number;
  platformName: string;
  hasMultipleForms: boolean;

  constructor(data: PageFeaturesData = {}) {
    this.platforms = Array.isArray(data.platforms) ? data.platforms : [];
    this.formCount = data.form_count || 0;
    this.platformName = this.platforms.length > 0 ? this.platforms.join(', ') : 'Custom Form';
    this.hasMultipleForms = this.formCount > 1;
  }

  serialize(): Record<string, unknown> {
    return { ...this } as any;
  }
}

/**
 * Represents detection process metadata.
 */
export class DetectionMetadata {
  engine: string;
  confidence: number;
  duration: number;
  version: string;

  constructor(data: MetadataData = {}) {
    this.engine = data.engine || 'auto';
    this.confidence = data.confidence_score || 0;
    this.duration = data.duration || 0;
    this.version = data.version || 'unknown';
  }

  serialize(): Record<string, unknown> {
    return { ...this } as any;
  }
}

/**
 * Represents the complete result of a detection run.
 */
export class DetectionPayload {
  source: string;
  questions: DetectionQuestion[];
  pageFeatures: DetectionPageFeatures;
  metadata: DetectionMetadata;
  isForm: boolean;
  isIsolated: boolean;
  count: number;
  formId: string;
  formSelector: string;
  language: string | null;
  timestamp: number;

  constructor(rawData: RawDetectionData | null, source = 'auto_detection') {
    const data = rawData?.result || rawData || {};

    this.source = source;
    const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

    this.questions = rawQuestions.map((q, i) => new DetectionQuestion(q, i + 1));
    this.pageFeatures = new DetectionPageFeatures((data.page_features || {}) as PageFeaturesData);
    this.metadata = new DetectionMetadata((data.metadata || {}) as MetadataData);

    this.isForm = !!data.is_likely_form;
    this.isIsolated = !this.isForm && this.questions.length > 0;
    this.count = this.questions.length;

    this.formId = data.form_id || data.id || 'unknown';
    this.formSelector = data.form_selector || '';
    this.language = data.language || null;
    this.timestamp = Date.now();
  }

  /**
   * Prepares the payload for chrome.runtime.sendMessage.
   */
  serialize(): Record<string, unknown> {
    return {
      source: this.source,
      isForm: this.isForm,
      isIsolated: this.isIsolated,
      count: this.count,
      questions: this.questions.map((q) => q.serialize()),
      pageFeatures: this.pageFeatures.serialize(),
      metadata: this.metadata.serialize(),
      formId: this.formId,
      formSelector: this.formSelector,
      language: this.language,
      timestamp: this.timestamp,
    };
  }

  /**
   * Check if this payload is better than another one based on score/source.
   */
  isBetterThan(other: DetectionPayload | null): boolean {
    if (!other) return true;

    const priority: Record<DetectionSourceKey, number> = {
      manual_selection: 100,
      scoped_focus: 80,
      auto_detection: 50,
    };

    const currentScore = priority[this.source as DetectionSourceKey] || 0;
    const otherScore = other?.source ? priority[other.source as DetectionSourceKey] || 0 : 0;

    return currentScore >= otherScore;
  }
}
