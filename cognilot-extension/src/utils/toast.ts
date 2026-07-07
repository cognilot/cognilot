/**
 * UTILS/TOAST.TS
 * Centralized notification system for Cognilot.
 * Uses a modern, premium design with bottom-left placement.
 */

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastInterface {
  show(message: string, type?: ToastType, duration?: number): void;
}

let _container: HTMLDivElement | null = null;

function getContainer(): HTMLDivElement {
  if (!_container) {
    _container = document.createElement('div');
    _container.id = 'Cognilot-toast-container';
    Object.assign(_container.style, {
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column-reverse',
      gap: '10px',
      pointerEvents: 'none',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    });
    document.body.appendChild(_container);
  }
  return _container;
}

export const Toast: ToastInterface = {
  show(message: string, type: ToastType = 'success', duration = 4000): void {
    const container = getContainer();
    const toast = document.createElement('div');

    const colors: Record<ToastType, string> = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6',
      warning: '#f59e0b',
    };
    const activeColor = colors[type] || colors.info;

    Object.assign(toast.style, {
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '14px',
      borderLeft: `4px solid ${activeColor}`,
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
      fontSize: '13px',
      fontWeight: '500',
      lineHeight: '1.5',
      transform: 'translateX(-40px)',
      transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
      opacity: '0',
      maxWidth: '300px',
      pointerEvents: 'auto',
      display: 'flex',
      alignItems: 'center',
    });

    toast.textContent = message;
    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    const dismiss = (): void => {
      toast.style.transform = 'translateX(-20px)';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 500);
    };

    const timeoutId = setTimeout(dismiss, duration);

    toast.onclick = (): void => {
      clearTimeout(timeoutId);
      dismiss();
    };
  },
};
