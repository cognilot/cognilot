/**
 * BACKGROUND.TS - Service Worker for Cognilot Extension
 * Handles context menus, keyboard shortcuts, proxy requests, auth, and tab messaging.
 */
import { registerGlobals as registerConfigGlobals } from './config';

registerConfigGlobals();

// ─── Context Menus ──────────────────────────────────────────

function registerContextMenuItems(): void {
  chrome.commands.getAll((commands) => {
    let manualShortcut = 'Ctrl+Shift+M';

    if (Array.isArray(commands)) {
      for (const cmd of commands) {
        if (cmd.name === 'Cognilot-manual' && cmd.shortcut) manualShortcut = cmd.shortcut;
      }
    }

    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'aiden-manual-inspect',
        title: `Inspeccionar con Cognilot (${manualShortcut})`,
        contexts: ['page'],
      });
    });
  });
}

chrome.runtime.onStartup.addListener(() => {
  registerContextMenuItems();
});

registerContextMenuItems();

// ─── Helpers ────────────────────────────────────────────────

function normalizePlan(plan: unknown): string {
  const normalized = String(plan || 'free').toLowerCase();
  return normalized === 'pro' ? 'pro' : 'free';
}

async function getStoredPlan(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['Cognilot_user'], (result) => {
      const user = result?.Cognilot_user as Record<string, unknown> | undefined;
      resolve(normalizePlan(user?.plan));
    });
  });
}

// ─── Installation ───────────────────────────────────────────

chrome.runtime.onInstalled.addListener((details) => {
  console.log('Aiden Cognilot extension installed');

  if (chrome.storage.session && chrome.storage.session.setAccessLevel) {
    chrome.storage.session
      .setAccessLevel({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' })
      .catch((err: Error) => console.warn('Failed to set session storage access level:', err));
  }

  if (details.reason === 'install') {
    const webAppUrl = import.meta.env.VITE_WEB_APP_URL || 'https://Cognilot-web.vercel.app';

    chrome.tabs.create({
      url: `${webAppUrl}?source=extension&action=onboarding`,
    });
  }

  registerContextMenuItems();

  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: true })
      .catch((error: Error) => console.error('Error setting panel behavior:', error));
  }
});

// ─── External Messages (Web App Auth Sync) ──────────────────

chrome.runtime.onMessageExternal.addListener(
  (
    request: Record<string, unknown>,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (request.type === 'AUTH_SUCCESS' || request.action === 'syncAuth') {
      const accessToken =
        (request.token as string) ||
        (request.accessToken as string) ||
        (request.access_token as string);

      if (!accessToken) {
        console.warn('Background: received AUTH_SUCCESS without a valid token. Ignoring.');
        if (typeof sendResponse === 'function') sendResponse({ success: false });
        return true;
      }

      const refreshToken = (request.refreshToken as string) || (request.refresh_token as string);
      const user = (request.user as Record<string, unknown>) || null;

      chrome.storage.local.set(
        {
          Cognilot_auth_token: accessToken,
          Cognilot_refresh_token: refreshToken,
          Cognilot_user: user,
        },
        () => {
          if (user) seedInitialProfile(user);

          // Fetch resolved aliases from backend and populate local alias cache
          chrome.storage.local.get(['Cognilot_alias_cache'], async (result) => {
            const isUnp = !chrome.runtime.getManifest().update_url;
            const backUrl = isUnp
              ? 'http://localhost:8000'
              : 'https://vague-felita-Cognilot-7f5d4232.koyeb.app';

            try {
              const res = await fetch(`${backUrl}/api/aliases/resolve`, {
                headers: { Authorization: `Bearer ${accessToken}` },
              });
              if (res.ok) {
                const data = await res.json();
                const aliasCache: Record<string, { memoryKey: string }> = {};
                for (const a of data.aliases || []) {
                  const key = (a.label || '')
                    .trim()
                    .toLowerCase()
                    .replace(/\s+/g, ' ')
                    .substring(0, 80);
                  if (key && a.memoryKey) {
                    aliasCache[key] = { memoryKey: a.memoryKey };
                  }
                }
                chrome.storage.local.set({ Cognilot_alias_cache: aliasCache });
                console.log(
                  `Background: synced ${Object.keys(aliasCache).length} aliases from backend.`
                );
              } else {
                console.warn('Background: failed to fetch aliases:', res.statusText);
              }
            } catch (err) {
              console.error('Background: alias sync error:', err);
            }
          });

          if (typeof sendResponse === 'function') sendResponse({ success: true });
        }
      );
      return true;
    }

    if (request.action === 'clearAuth') {
      chrome.storage.local.remove(
        ['Cognilot_auth_token', 'Cognilot_refresh_token', 'Cognilot_user'],
        () => {
          sendResponse({ success: true });
        }
      );
      return true;
    }

    if (request.action === 'getAuth') {
      chrome.storage.local.get(
        ['Cognilot_auth_token', 'Cognilot_refresh_token', 'Cognilot_user'],
        (result) => {
          sendResponse(result);
        }
      );
      return true;
    }

    if (request.action === 'getProfile') {
      chrome.storage.local.get(['Cognilot_profile_cache'], (result) => {
        sendResponse({
          success: true,
          profile: result.Cognilot_profile_cache || {},
        });
      });
      return true;
    }

    if (request.action === 'saveProfile') {
      chrome.storage.local.set({ Cognilot_profile_cache: request.profile }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.action === 'getPreferences') {
      chrome.storage.local.get(['Cognilot_preference_cache'], (result) => {
        sendResponse({
          preferences: result.Cognilot_preference_cache || {},
        });
      });
      return true;
    }

    if (request.action === 'savePreferences') {
      chrome.storage.local.set({ Cognilot_preference_cache: request.preferences }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    if (request.action === 'syncSettings') {
      const settings = (request.settings as Record<string, any>) || {};
      chrome.storage.local.get(['Cognilot_preference_cache'], (result) => {
        const current = result.Cognilot_preference_cache || {};
        const merged = {
          ...current,
          copilotSuggestions: {
            ...(current.copilotSuggestions || {}),
            ...(settings.copilotSuggestions || {}),
          },
        };
        chrome.storage.local.set({ Cognilot_preference_cache: merged }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    if (request.action === 'syncByok') {
      const byok = (request.byok as Record<string, any>) || {};
      chrome.storage.local.get(['Cognilot_preference_cache'], (result) => {
        const current = result.Cognilot_preference_cache || {};
        current.byok = {
          enabled: !!byok.apiKey,
          provider: byok.provider || 'openai',
          apiKey: byok.apiKey || '',
          model: byok.model || '',
        };
        chrome.storage.local.set({ Cognilot_preference_cache: current }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    return false;
  }
);

// ─── Keyboard Shortcuts ─────────────────────────────────────

chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.id) return;

    if (command === 'Cognilot-all') {
      const plan = await getStoredPlan();
      if (plan !== 'pro') {
        await chrome.scripting
          .executeScript({
            target: { tabId: tab.id },
            func: () => {
              alert('Automation is available on Cognilot Pro.');
            },
          })
          .catch(() => {
            // silently ignore
          });
        return;
      }

      console.log('⌨️ Keyboard shortcut intercepted: AutoSolving!');

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const api = (window as unknown as { CognilotAPI?: { solveAll(): unknown } }).CognilotAPI;
          if (api?.solveAll) {
            return api.solveAll();
          } else {
            alert('Error: Cognilot not available. Try reloading the page (F5).');
            return null;
          }
        },
      });
    } else if (command === 'Cognilot-manual') {
      console.log('⌨️ Keyboard shortcut intercepted: Manual Mode!');

      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const api = (window as unknown as Record<string, { enableInspector?(): void }>)
            .CognilotAPI;
          if (api?.enableInspector) {
            api.enableInspector();
          } else {
            console.error('Manual inspector function not available');
          }
        },
      });
    }
  });
});

// ─── Context Menu Click ─────────────────────────────────────

chrome.contextMenus.onClicked.addListener(
  async (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (!tab?.id) return;

    try {
      switch (info.menuItemId) {
        case 'aiden-manual-inspect':
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const api = (window as unknown as Record<string, { enableInspector?(): void }>)
                .CognilotAPI;
              if (api?.enableInspector) {
                api.enableInspector();
              } else if ((window as unknown as Record<string, () => void>).aidenEnableInspector) {
                (window as unknown as Record<string, () => void>).aidenEnableInspector();
              } else {
                console.error('Manual inspector function not available');
              }
            },
          });
          break;

        case 'aiden-detect-forms':
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const api = (
                window as unknown as Record<string, { detect?(): Record<string, unknown> }>
              ).CognilotAPI;
              let deteccion: Record<string, unknown>;

              if (api?.detect) {
                deteccion = api.detect();
              } else {
                const hasQuestions =
                  document.querySelectorAll(
                    '[data-automation-id="questionItem"], [data-testid*="Question"], [jscontroller="sWGJ4b"], .question'
                  ).length > 0;

                deteccion = {
                  esFormulario: hasQuestions,
                  cantidadPreguntas: hasQuestions ? 1 : 0,
                  plataformas: hasQuestions ? ['Unknown'] : [],
                  confianza: 'Low',
                };
              }

              if (deteccion.esFormulario) {
                alert(
                  `🎯 Detección de Formularios\n\n✅ ${deteccion.cantidadPreguntas} pregunta(s) encontrada(s)\n📋 Plataforma(s): ${(deteccion.plataformas as string[]).join(', ')}\n🎯 Confianza: ${deteccion.confianza}`
                );
              } else {
                alert(
                  '🔍 Detección de Formularios\n\n❌ No se detectaron formularios en esta página'
                );
              }
            },
          });
          break;
      }
    } catch (error) {
      console.error('Error en menú contextual:', error);
      chrome.scripting
        .executeScript({
          target: { tabId: tab.id },
          func: ((msg: string) => {
            alert(
              `❌ Error: ${msg}\n\nIntenta recargar la página y usar la extensión desde el popup.`
            );
          }) as any,
          args: [(error as Error).message],
        })
        .catch(() => {
          // silently ignore
        });
    }
  }
);

// ─── Internal Messages ──────────────────────────────────────

chrome.runtime.onMessage.addListener(
  (
    request: Record<string, unknown>,
    sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void
  ) => {
    if (request.action === 'formDetected') {
      console.log('Formulario detectado en tab:', sender.tab?.id, request.data);
      sendResponse({ received: true });
    } else if (request.action === 'openSidebar') {
      if (chrome.sidePanel) {
        (chrome.sidePanel.open as any)({ tabId: sender.tab?.id }, () => {
          const runtime = chrome.runtime as any;
          if (runtime.lastError) {
            console.log('Sidebar already open or unavailable');
          }
          sendResponse({ success: true });
        });
      } else {
        sendResponse({
          success: false,
          error: 'sidePanel API not available',
        });
      }
      return true;
    } else if (request.action === 'inspectorSolveRequest') {
      if (chrome.sidePanel) {
        chrome.sidePanel.open({ tabId: sender.tab?.id }).catch(() => {
          // silently ignore
        });
      }
      if (sender.tab?.id) {
        chrome.tabs.sendMessage(sender.tab.id, request, {}, (response) => {
          sendResponse(response);
        });
        return true;
      }
      sendResponse({ success: false });
      return true;
    } else if (request.action === 'captureVisibleTab') {
      chrome.tabs.captureVisibleTab(null as unknown as number, { format: 'png' }, (dataUrl) => {
        const runtime = chrome.runtime as any;
        if (runtime.lastError) {
          console.error('❌ [Background] captureVisibleTab error:', runtime.lastError.message);
          sendResponse({
            error: runtime.lastError.message,
          });
        } else {
          sendResponse({ dataUrl: dataUrl });
        }
      });
      return true;
    } else if (request.action === 'openChatGPT') {
      handleOpenChatGPT(request);
      sendResponse({ success: true });
    } else if (request.action === 'updateBadge' && sender.tab) {
      const tabId = sender.tab.id!;
      if ((request.count as number) > 0) {
        chrome.action.setBadgeText({
          text: (request.count as number).toString(),
          tabId,
        });
        chrome.action.setBadgeBackgroundColor({
          color: '#2ecc71',
          tabId,
        });
      } else if (request.isKnownSite) {
        chrome.action.setBadgeText({ text: '★', tabId });
        chrome.action.setBadgeBackgroundColor({
          color: '#3498db',
          tabId,
        });
      } else {
        chrome.action.setBadgeText({ text: '', tabId });
      }
      sendResponse({ received: true });
    } else if (request.action === 'proxyRequest') {
      console.log('🌐 [Background] Proxying request to:', request.url);

      handleProxyRequest(
        request.url as string,
        (request.options || {}) as RequestInit & { headers?: Record<string, string> }
      )
        .then((data) => {
          console.log('✅ [Background] Sending back data to content script');
          sendResponse(data);
        })
        .catch((error: Error) => {
          console.error('❌ [Background] Proxy error:', error.message);
          sendResponse({
            ok: false,
            status: 0,
            statusText: 'Network Error: ' + error.message,
            text: JSON.stringify({ error: error.message }),
          });
        });
      return true;
    } else if (request.action === 'pageScanComplete') {
      // Just acknowledge the scan to prevent message port closed errors
      sendResponse({ received: true });
      return true;
    } else if (request.action === 'syncAuth') {
      const accessToken = request.accessToken || request.access_token;
      const refreshToken = request.refreshToken || request.refresh_token;

      chrome.storage.local.set(
        {
          Cognilot_auth_token: accessToken,
          Cognilot_refresh_token: refreshToken,
          Cognilot_user: request.user,
        },
        () => {
          seedInitialProfile(request.user as Record<string, unknown>);
          sendResponse({ success: true });
        }
      );
      return true;
    } else if (request.action === 'clearAuth') {
      chrome.storage.local.remove(
        ['Cognilot_auth_token', 'Cognilot_refresh_token', 'Cognilot_user'],
        () => {
          sendResponse({ success: true });
        }
      );
      return true;
    } else if (request.action === 'getProfile') {
      chrome.storage.local.get(['Cognilot_profile_cache'], (result) => {
        sendResponse({
          success: true,
          profile: result.Cognilot_profile_cache || {},
        });
      });
      return true;
    } else if (request.action === 'saveProfile') {
      chrome.storage.local.set({ Cognilot_profile_cache: request.profile }, () => {
        sendResponse({ success: true });
      });
      return true;
    } else if (request.action === 'getPreferences') {
      chrome.storage.local.get(['Cognilot_preference_cache'], (result) => {
        sendResponse({
          preferences: result.Cognilot_preference_cache || {},
        });
      });
      return true;
    } else if (request.action === 'savePreferences') {
      chrome.storage.local.set({ Cognilot_preference_cache: request.preferences }, () => {
        sendResponse({ success: true });
      });
      return true;
    }

    return false;
  }
);

// ─── ChatGPT Integration ───────────────────────────────────

async function handleOpenChatGPT(request: Record<string, unknown>): Promise<void> {
  await chrome.storage.local.set({
    Cognilot_chatgpt_payload: request,
  });

  const tab = await chrome.tabs.create({
    url: 'https://chatgpt.com/',
  });

  chrome.tabs.onUpdated.addListener(function listener(tabId: number, changeInfo: any) {
    if (tabId === tab.id && changeInfo.status === 'complete') {
      chrome.tabs.onUpdated.removeListener(listener);

      chrome.scripting
        .executeScript({
          target: { tabId: tab.id! },
          func: injectIntoChatGPT as any,
          args: [request.mode as string],
        })
        .catch((err: Error) =>
          console.error('❌ [Background] Failed to inject into ChatGPT:', err)
        );
    }
  });
}

function injectIntoChatGPT(mode: string): void {
  const MAX_WAIT = 15000;
  const POLL_INTERVAL = 500;
  let elapsed = 0;

  const poll = setInterval(async () => {
    elapsed += POLL_INTERVAL;

    const textarea = document.querySelector(
      '#prompt-textarea, [contenteditable="true"].ProseMirror, div[contenteditable="true"]'
    ) as HTMLElement | null;

    if (!textarea) {
      if (elapsed >= MAX_WAIT) {
        clearInterval(poll);
        console.error('[Cognilot] Could not find ChatGPT textarea after ' + MAX_WAIT + 'ms');
      }
      return;
    }

    clearInterval(poll);

    const result = await chrome.storage.local.get(['Cognilot_chatgpt_payload']);
    const payload = result.Cognilot_chatgpt_payload as Record<string, unknown> | undefined;
    if (!payload) {
      console.error('[Cognilot] No payload found in storage');
      return;
    }

    chrome.storage.local.remove('Cognilot_chatgpt_payload');

    const pageContext = payload.pageContext as Record<string, string> | undefined;

    if (mode === 'text') {
      const pageTitle = pageContext?.title || '';
      const pageUrl = pageContext?.url || '';
      const header = `Contexto de: ${pageTitle}\n${pageUrl}\n\n`;
      const content = header + ((payload.markdown as string) || '');

      if (
        textarea.classList.contains('ProseMirror') ||
        textarea.getAttribute('contenteditable') === 'true'
      ) {
        textarea.focus();
        textarea.innerHTML = '<p>' + content.replace(/\n/g, '<br>') + '</p>';
      } else {
        (textarea as HTMLInputElement).value = content;
      }

      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      console.log('[Cognilot] ✅ Markdown content injected into ChatGPT');
    } else if (mode === 'visual') {
      const imageDataUrl = payload.imageDataUrl as string | undefined;
      if (!imageDataUrl) {
        console.error('[Cognilot] No image data in payload');
        return;
      }

      try {
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();

        const clipboardItem = new ClipboardItem({
          'image/png': blob,
        });
        await navigator.clipboard.write([clipboardItem]);
        console.log('[Cognilot] 📋 Image copied to clipboard');

        textarea.focus();
        const pasteEvent = new ClipboardEvent('paste', {
          bubbles: true,
          cancelable: true,
          clipboardData: new DataTransfer(),
        });
        textarea.dispatchEvent(pasteEvent);
        document.execCommand('paste');

        console.log('[Cognilot] ✅ Image paste triggered in ChatGPT');

        setTimeout(() => {
          const pageTitle = pageContext?.title || '';
          const pageUrl = pageContext?.url || '';
          const contextMsg = `\n\nContexto: ${pageTitle}\n${pageUrl}`;

          if (textarea.getAttribute('contenteditable') === 'true') {
            const p = document.createElement('p');
            p.textContent = contextMsg;
            textarea.appendChild(p);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 500);
      } catch (err) {
        console.error('[Cognilot] Failed to paste image:', err);
        if (textarea.getAttribute('contenteditable') === 'true') {
          textarea.focus();
          const pageTitle = pageContext?.title || '';
          textarea.innerHTML =
            '<p>📸 La imagen ha sido copiada al portapapeles. Presiona Ctrl+V para pegarla aquí.</p><p>Contexto: ' +
            pageTitle +
            '</p>';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    }
  }, POLL_INTERVAL);
}

// ─── Proxy Requests ─────────────────────────────────────────

interface ProxyResult {
  ok: boolean;
  status: number;
  statusText: string;
  text: string;
}

async function handleProxyRequest(
  url: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<ProxyResult> {
  let BACKEND_URL =
    import.meta.env.VITE_API_BASE_URL || 'https://vague-felita-Cognilot-7f5d4232.koyeb.app';

  // Automatically target local server when developer-loaded (unpacked)
  const isUnpacked = !chrome.runtime.getManifest().update_url;
  if (isUnpacked && BACKEND_URL.includes('koyeb.app')) {
    BACKEND_URL = 'http://localhost:8000';
  }

  const targetUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;

  console.log(`🌐 [Background] Fetching: ${targetUrl}`);

  const headers = (options.headers || {}) as Record<string, string>;
  const tokenResult = await chrome.storage.local.get(['Cognilot_auth_token']);
  const token = tokenResult.Cognilot_auth_token as string | undefined;

  if (token) {
    if (!headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  options.headers = headers;

  console.log('📦 [Background] Payload:', options.body);

  const response = await fetch(targetUrl, options);
  let text = '';
  try {
    text = await response.text();
  } catch (_e) {
    console.warn('[Background] Failed to parse response text');
  }

  const result: ProxyResult = {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
    text: text,
  };

  if (response.status === 401 && token) {
    console.log('🔄 [Background] Got 401, attempting token refresh...');
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      const newTokenResult = await chrome.storage.local.get(['Cognilot_auth_token']);
      if (newTokenResult.Cognilot_auth_token) {
        headers['Authorization'] = `Bearer ${newTokenResult.Cognilot_auth_token as string}`;
        const retryResponse = await fetch(targetUrl, options);
        const retryText = await retryResponse.text();
        return {
          ok: retryResponse.ok,
          status: retryResponse.status,
          statusText: retryResponse.statusText,
          text: retryText,
        };
      }
    }
  }

  return result;
}

// ─── Profile Seeding ────────────────────────────────────────

function seedInitialProfile(user: Record<string, unknown> | undefined | null): void {
  if (!user) return;
  chrome.storage.local.get(['Cognilot_profile_cache'], (result) => {
    const profile = (result.Cognilot_profile_cache || {}) as Record<string, string[]>;
    let changed = false;

    if (user.email && (!profile.email || !profile.email.includes(user.email as string))) {
      profile.email = profile.email || [];
      if (!profile.email.includes(user.email as string)) {
        profile.email.push(user.email as string);
        changed = true;
      }
    }

    if (user.given_name) {
      profile.given_name = profile.given_name || [];
      if (!profile.given_name.includes(user.given_name as string)) {
        profile.given_name.push(user.given_name as string);
        changed = true;
      }
    }

    if (user.family_name) {
      profile.family_name = profile.family_name || [];
      if (!profile.family_name.includes(user.family_name as string)) {
        profile.family_name.push(user.family_name as string);
        changed = true;
      }
    }

    if (changed) {
      chrome.storage.local.set({ Cognilot_profile_cache: profile });
      console.log('🌱 [Background] Initial profile seeded/updated from auth user', profile);
    }
  });
}

// ─── Token Refresh ──────────────────────────────────────────

async function attemptTokenRefresh(): Promise<boolean> {
  try {
    const result = await chrome.storage.local.get(['Cognilot_refresh_token']);
    const refreshToken = result.Cognilot_refresh_token as string | undefined;
    if (!refreshToken) return false;

    const isUnpacked = !chrome.runtime.getManifest().update_url;
    const backendUrl = isUnpacked
      ? 'http://localhost:8000'
      : 'https://vague-felita-Cognilot-7f5d4232.koyeb.app';

    const response = await fetch(`${backendUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      await chrome.storage.local.remove([
        'Cognilot_auth_token',
        'Cognilot_refresh_token',
        'Cognilot_user',
      ]);
      return false;
    }

    const data = (await response.json()) as {
      access_token: string;
      refresh_token: string;
    };
    await chrome.storage.local.set({
      Cognilot_auth_token: data.access_token,
      Cognilot_refresh_token: data.refresh_token,
    });
    console.log('✅ [Background] Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('❌ [Background] Token refresh failed:', (error as Error).message);
    return false;
  }
}

// ─── Storage Change Listener ────────────────────────────────

chrome.storage.onChanged.addListener(
  (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
    if (areaName === 'local') {
      const relevantKeys = [
        'Cognilot_profile_cache',
        'Cognilot_preference_cache',
        'Cognilot_alias_cache',
        'Cognilot_sync_queue',
      ];
      const changedKeys = Object.entries(changes)
        .filter(([key, value]) => relevantKeys.includes(key) && value.newValue !== undefined)
        .map(([key]) => key);

      if (changedKeys.length > 0) {
        chrome.tabs.query({}, (tabs) => {
          tabs.forEach((tab) => {
            if (!tab.id) return;
            chrome.tabs.sendMessage(
              tab.id,
              {
                action: 'cacheUpdated',
                keys: changedKeys,
              },
              {},
              () => {
                const runtime = chrome.runtime as any;
                if (runtime.lastError) {
                  // Ignore errors for tabs without content scripts
                }
              }
            );
          });
        });
      }
    }
  }
);
