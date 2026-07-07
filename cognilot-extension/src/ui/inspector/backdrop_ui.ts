/**
 * UI/INSPECTOR/BACKDROP_UI.TS
 * Dark background and Spotlight effect (SVG Mask) for the Inspector.
 */

let _spotlightBackdrop: HTMLDivElement | null = null;
let _boundUpdateSpotlight: (() => void) | null = null;

// Reference to selected container — set by main_ui
let _selectedContainerRef: () => HTMLElement | null = () => null;

export function setSelectedContainerRef(ref: () => HTMLElement | null): void {
  _selectedContainerRef = ref;
}

export function createSpotlightBackdrop(): void {
  if (!_spotlightBackdrop) {
    _spotlightBackdrop = document.createElement('div');
    _spotlightBackdrop.id = 'Cognilot-spotlight-backdrop';
    Object.assign(_spotlightBackdrop.style, {
      position: 'fixed',
      left: '0',
      top: '0',
      right: '0',
      bottom: '0',
      zIndex: '2147483640',
      pointerEvents: 'none',
      transition: 'opacity 0.3s ease',
      opacity: '0',
    });

    _spotlightBackdrop.innerHTML = `<svg width="100%" height="100%">
      <defs>
        <linearGradient id="CognilotGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#06b6d4;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
        </linearGradient>
        <mask id="Cognilot-spotlight-mask">
          <rect width="100%" height="100%" fill="white"/>
          <rect id="Cognilot-spotlight-hole" x="0" y="0" width="0" height="0" rx="12" fill="black"/>
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#CognilotGrad)" mask="url(#Cognilot-spotlight-mask)" opacity="0.3"/>
    </svg>`;

    document.body.appendChild(_spotlightBackdrop);
    _boundUpdateSpotlight = updateSpotlight;
    window.addEventListener('scroll', _boundUpdateSpotlight, true);
    window.addEventListener('resize', _boundUpdateSpotlight, true);
  }
}

export function updateSpotlight(): void {
  const selectedContainer = _selectedContainerRef();
  if (!selectedContainer || !_spotlightBackdrop) return;

  const hole = _spotlightBackdrop.querySelector('#Cognilot-spotlight-hole');
  if (!hole) return;

  const rect = selectedContainer.getBoundingClientRect();
  const pad = Math.min(10, Math.max(0, rect.left), Math.max(0, rect.top));

  hole.setAttribute('x', String(rect.left - pad));
  hole.setAttribute('y', String(rect.top - pad));
  hole.setAttribute('width', String(rect.width + pad * 2));
  hole.setAttribute('height', String(rect.height + pad * 2));
}

export function removeSpotlightBackdrop(): void {
  if (_spotlightBackdrop) {
    _spotlightBackdrop.style.opacity = '0';
    const node = _spotlightBackdrop;
    setTimeout(() => {
      if (node && node.parentNode) node.remove();
    }, 300);
    _spotlightBackdrop = null;
  }
  if (_boundUpdateSpotlight) {
    window.removeEventListener('scroll', _boundUpdateSpotlight, true);
    window.removeEventListener('resize', _boundUpdateSpotlight, true);
    _boundUpdateSpotlight = null;
  }
}

export function getSpotlightBackdrop(): HTMLDivElement | null {
  return _spotlightBackdrop;
}

export const BackdropUI = {
  setSelectedContainerRef,
  createSpotlightBackdrop,
  updateSpotlight,
  removeSpotlightBackdrop,
  getSpotlightBackdrop,
};
