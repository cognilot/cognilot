import { CognilotSDK } from '../index.js';

export interface PromptTemplateCache {
  template: string;
  version: string;
  fetchedAt: number;
}

export class PromptTemplateManager {
  private sdk: CognilotSDK;
  private apiBaseUrl: string;
  private static readonly CACHE_KEY = 'Cognilot_byok_prompt_template';
  private static readonly TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  private static readonly FALLBACK_TEMPLATE = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate value for a web form field based on the user's profile data and the page context.

## User Profile Data:
{{PROFILE_CONTEXT}}

## Instructions:
- Return ONLY the value to fill in the field. No explanations, no quotes, no markdown.
- Respond in {{LANGUAGE}}.
- If you cannot confidently determine the value, return an empty string.

Fill in this form field:
Field Label: {{FIELD_LABEL}}
Field Type: {{FIELD_TYPE}}
Placeholder: {{FIELD_PLACEHOLDER}}
Current Value: {{FIELD_VALUE}}
Form Context: {{FIELD_CONTEXT}}
Page: {{PAGE_TITLE}} ({{PAGE_URL}})`;

  constructor(sdk: CognilotSDK) {
    this.sdk = sdk;
    // Default apiBaseUrl is empty or read from apiClient
    this.apiBaseUrl = (sdk as any).apiClient?.apiBaseUrl || '';
  }

  /**
   * Fetches the BYOK template, first checking cache, then falling back to remote, then local.
   */
  async getTemplate(): Promise<string> {
    const storage = this.sdk.adapters?.storage;
    const now = Date.now();

    // 1. Try to load from local cache
    if (storage) {
      try {
        const cached = await storage.get(PromptTemplateManager.CACHE_KEY);
        const data = cached?.[PromptTemplateManager.CACHE_KEY] || cached;
        if (data && data.template && now - (data.fetchedAt || 0) < PromptTemplateManager.TTL_MS) {
          console.log('[PromptTemplateManager] Cache Hit. Using cached template.');
          return data.template;
        }
      } catch (err) {
        console.warn('[PromptTemplateManager] Failed to read from cache:', err);
      }
    }

    // 2. Fetch from remote API (public endpoint)
    if (this.apiBaseUrl) {
      try {
        console.log('[PromptTemplateManager] Cache Miss. Fetching template from API...');
        const response = await fetch(`${this.apiBaseUrl}/api/prompts/byok`);
        if (response.ok) {
          const body = await response.json();
          if (body && body.template) {
            const cacheData: PromptTemplateCache = {
              template: body.template,
              version: body.version || '1.0.0',
              fetchedAt: now,
            };
            if (storage) {
              await storage.set(PromptTemplateManager.CACHE_KEY, cacheData);
            }
            return body.template;
          }
        } else {
          console.warn(
            '[PromptTemplateManager] Remote prompt API returned status:',
            response.status
          );
        }
      } catch (err) {
        console.warn('[PromptTemplateManager] Remote prompt fetch failed:', err);
      }
    }

    // 3. Fallback to hardcoded template
    console.log('[PromptTemplateManager] Using fallback prompt template.');
    return PromptTemplateManager.FALLBACK_TEMPLATE;
  }
}
