/**
 * Chrome API augmentations not yet covered by chrome-types
 */

declare namespace chrome {
  namespace sidePanel {
    interface PanelOptions {
      path?: string;
      enabled?: boolean;
      tabId?: number;
    }

    interface PanelBehavior {
      openPanelOnActionClick?: boolean;
    }

    function setOptions(options: PanelOptions): Promise<void>;
    function setPanelBehavior(behavior: PanelBehavior): Promise<void>;
    function open(options?: { windowId?: number; tabId?: number }): Promise<void>;

    const onShown: chrome.events.Event<(info: { tabId?: number; windowId?: number }) => void>;
    const onHidden: chrome.events.Event<(info: { tabId?: number; windowId?: number }) => void>;
  }

  namespace storage {
    namespace session {
      function setAccessLevel(options: { accessLevel: string }): Promise<void>;
    }
  }
}
