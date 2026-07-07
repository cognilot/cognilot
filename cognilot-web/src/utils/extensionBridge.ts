// Extension bridge for direct chrome.runtime communication
import type { User } from '../services/auth.service';

export interface ExtensionBridge {
  isExtensionPresent(): boolean;
  syncTokens(accessToken: string, refreshToken: string, user?: User | null): void;
  clearTokens(): void;
  refreshProfileCache(): void;
}

declare global {
  interface Window {
    chrome: {
      runtime: {
        sendMessage: (
          extensionId: string,
          message: any,
          callback?: (response: any) => void
        ) => void;
        lastError?: {
          message?: string;
        };
      };
    };
  }
}

class ChromeExtensionBridge implements ExtensionBridge {
  private get extensionId(): string {
    return process.env.NEXT_PUBLIC_EXTENSION_ID || '';
  }

  isExtensionPresent(): boolean {
    // Check if chrome.runtime is available (usually only in extension context or if externally_connectable is set)
    // However, since we are a web page, we check window.chrome?.runtime?.sendMessage
    return !!(window.chrome && window.chrome.runtime && window.chrome.runtime.sendMessage);
  }

  syncTokens(accessToken: string, refreshToken: string, user: User | null = null): void {
    console.log('Extension bridge: syncTokens called. Token present:', !!accessToken);
    if (!accessToken || !refreshToken) {
      console.log('Extension bridge: skipping sync (tokens are missing)');
      return;
    }

    console.log('Extension bridge: isExtensionPresent:', this.isExtensionPresent());
    console.log('Extension bridge: current extensionId from env:', this.extensionId);

    if (
      !this.isExtensionPresent() ||
      !this.extensionId ||
      this.extensionId === 'YOUR_EXTENSION_ID_HERE'
    ) {
      console.log('Extension bridge: skipping sync (extensionId missing or window.chrome not present)');
      return;
    }

    try {
      console.log(`Extension bridge: sending AUTH_SUCCESS message to extension ID ${this.extensionId}...`);
      // Direct messaging to extension background script
      window.chrome.runtime.sendMessage(
        this.extensionId,
        {
          type: 'AUTH_SUCCESS',
          token: accessToken,
          refreshToken: refreshToken,
          user: user,
        },
        (response: any) => {
          if (window.chrome.runtime.lastError) {
            console.warn('Extension sync error:', window.chrome.runtime.lastError.message);
          } else {
            console.log('Tokens synced with extension:', response);
          }
        }
      );
    } catch (error) {
      console.error('Failed to sync tokens with extension:', error);
    }
  }

  clearTokens(): void {
    if (
      !this.isExtensionPresent() ||
      !this.extensionId ||
      this.extensionId === 'YOUR_EXTENSION_ID_HERE'
    ) {
      return;
    }

    try {
      window.chrome.runtime.sendMessage(
        this.extensionId,
        { action: 'clearAuth' },
        (response: any) => {
          if (!window.chrome.runtime.lastError) {
            console.log('Logout synced with extension:', response);
          }
        }
      );
    } catch (error) {
      console.error('Failed to sync logout with extension:', error);
    }
  }

  refreshProfileCache(): void {
    if (
      !this.isExtensionPresent() ||
      !this.extensionId ||
      this.extensionId === 'YOUR_EXTENSION_ID_HERE'
    ) {
      return;
    }

    try {
      window.chrome.runtime.sendMessage(this.extensionId, { action: 'getProfile' }, () => {
        console.log('Profile cache refresh request sent to extension');
      });
    } catch (error) {
      console.error('Failed to request profile cache refresh:', error);
    }
  }
}

export const extensionBridge = new ChromeExtensionBridge();
