/**
 * Utility for reading clipboard directly in the active execution context.
 * Bypasses background offscreen document to avoid security focus restrictions.
 * Includes a robust document.execCommand('paste') fallback for content scripts.
 */

export async function readClipboardDirect(): Promise<{
  type: 'image' | 'text' | 'empty';
  content?: string;
}> {
  // 1. Try modern Clipboard API first (supported directly in Extension Pages like popup/sidebar when focused)
  try {
    if (navigator.clipboard && navigator.clipboard.read) {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        // Image check
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const base64 = await processAndResizeImage(blob);
          return { type: 'image', content: base64 };
        }
        // Text check
        if (item.types.includes('text/plain')) {
          const blob = await item.getType('text/plain');
          const text = await blob.text();
          if (text && text.trim().length > 0) {
            return { type: 'text', content: text };
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Clipboard] navigator.clipboard.read failed, falling back to execCommand:', e);
  }

  // 2. Fallback: execCommand('paste') using a temporary contenteditable div.
  // This is required in content scripts because Chrome restricts navigator.clipboard.read
  // to the page's origin permissions, whereas execCommand('paste') is allowed if the
  // extension has the "clipboardRead" permission.
  return new Promise((resolve) => {
    const activeEl = document.activeElement as HTMLElement | null;

    const tempDiv = document.createElement('div');
    tempDiv.contentEditable = 'true';
    Object.assign(tempDiv.style, {
      position: 'fixed',
      left: '-9999px',
      top: '-9999px',
      width: '1px',
      height: '1px',
      opacity: '0',
      overflow: 'hidden',
    });

    document.body.appendChild(tempDiv);

    let resolved = false;
    const finish = (result: { type: 'image' | 'text' | 'empty'; content?: string }) => {
      if (resolved) return;
      resolved = true;
      tempDiv.remove();
      if (activeEl && typeof activeEl.focus === 'function') {
        activeEl.focus();
      }
      resolve(result);
    };

    tempDiv.addEventListener('paste', (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const items = e.clipboardData?.items;
      if (items) {
        let hasImage = false;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            hasImage = true;
            const blob = item.getAsFile();
            if (blob) {
              processAndResizeImage(blob)
                .then((base64) => {
                  finish({ type: 'image', content: base64 });
                })
                .catch((err) => {
                  console.error('[Clipboard] Image process error:', err);
                  finish({ type: 'empty' });
                });
            } else {
              finish({ type: 'empty' });
            }
            break;
          }
        }

        if (!hasImage) {
          const text = e.clipboardData?.getData('text/plain');
          if (text && text.trim().length > 0) {
            finish({ type: 'text', content: text });
          } else {
            finish({ type: 'empty' });
          }
        }
      } else {
        finish({ type: 'empty' });
      }
    });

    tempDiv.focus();

    try {
      const success = document.execCommand('paste');
      if (!success) {
        console.warn('[Clipboard] execCommand("paste") returned false');
        finish({ type: 'empty' });
      }
    } catch (err) {
      console.warn('[Clipboard] execCommand("paste") failed:', err);
      finish({ type: 'empty' });
    }

    // Safety timeout in case execCommand paste didn't trigger
    setTimeout(() => {
      finish({ type: 'empty' });
    }, 250);
  });
}

function processAndResizeImage(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX_SIZE = 1024;
      let width = img.width;
      let height = img.height;

      if (width > MAX_SIZE || height > MAX_SIZE) {
        if (width > height) {
          height = Math.round((height * MAX_SIZE) / width);
          width = MAX_SIZE;
        } else {
          width = Math.round((width * MAX_SIZE) / height);
          height = MAX_SIZE;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      resolve(dataUrl);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for resizing'));
    };
    img.src = url;
  });
}
