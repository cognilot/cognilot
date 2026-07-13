import { CognilotSDK } from '../index';

/**
 * ApiClient
 * Handles communication with the Cognilot backend via proxy requests.
 */
export class ApiClient {
  private sdk: CognilotSDK;
  public apiBaseUrl: string;

  constructor(sdk: CognilotSDK, apiBaseUrl?: string) {
    this.sdk = sdk;
    this.apiBaseUrl = apiBaseUrl || '';
  }

  /**
   * Performs a proxy request through the messaging adapter.
   */
  async request(url: string, payload: any, moduleName: string = 'SDK', options: any = {}) {
    const messaging = this.sdk.adapters?.messaging;
    if (!messaging) {
      throw new Error('Messaging adapter not available for ApiClient');
    }

    const response = await messaging.sendMessage({
      action: 'proxyRequest',
      url: url,
      options: {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: typeof payload === 'string' ? payload : JSON.stringify(payload),
        ...options,
      },
      source: moduleName,
    });

    // Fix: Parse response text if it's a string (legacy bridge behavior)
    if (response && typeof response.text === 'string') {
      try {
        const data = JSON.parse(response.text);
        return { ...response, ...data }; // Merge parsed data (results, results_meta, etc)
      } catch (e) {
        console.warn(`[ApiClient] Failed to parse response text as JSON:`, e);
      }
    }

    return response;
  }

  buildUrl(path: string): string {
    const baseUrl = this.apiBaseUrl;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
  }
}
