/**
 * UI/INSPECTOR/FORM_TRIGGER_UI.TS
 * Minimal circular floating button anchored to detected form container(s).
 * Displays in normal page view without requiring inspect overlay mode.
 * Future imagotype placeholder for SolveAll trigger.
 */

interface FormTriggerInstance {
  btn: HTMLButtonElement;
  container: HTMLElement;
  fieldCount: number;
  onSolve: () => void;
}

const _instances = new Map<HTMLElement, FormTriggerInstance>();
let _boundReposition: (() => void) | null = null;

function repositionAll(): void {
  for (const [container, inst] of _instances.entries()) {
    if (!container.isConnected) {
      inst.btn.remove();
      _instances.delete(container);
      continue;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    // Position at top-right corner of the container
    const top = Math.max(8, rect.top + window.scrollY - 14);
    const left = Math.max(8, rect.right + window.scrollX - 32);

    inst.btn.style.top = `${top}px`;
    inst.btn.style.left = `${left}px`;
  }

  if (_instances.size === 0 && _boundReposition) {
    window.removeEventListener('scroll', _boundReposition, true);
    window.removeEventListener('resize', _boundReposition);
    _boundReposition = null;
  }
}

export function showFormTrigger(
  container: HTMLElement,
  fieldCount: number,
  onSolve: () => void
): void {
  if (!container || fieldCount <= 0) return;

  let inst = _instances.get(container);

  if (!inst) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'Cognilot-form-trigger-dot';
    btn.setAttribute('aria-label', 'Cognilot Solve All');

    const innerDot = document.createElement('div');
    innerDot.className = 'Cognilot-form-trigger-dot__inner';
    btn.appendChild(innerDot);

    const tooltip = document.createElement('div');
    tooltip.className = 'Cognilot-form-trigger-tooltip';
    btn.appendChild(tooltip);

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      setSolving(true, container);
      inst?.onSolve();
    });

    document.body.appendChild(btn);

    inst = {
      btn,
      container,
      fieldCount,
      onSolve,
    };
    _instances.set(container, inst);

    if (!_boundReposition) {
      _boundReposition = () => repositionAll();
      window.addEventListener('scroll', _boundReposition, { passive: true, capture: true });
      window.addEventListener('resize', _boundReposition, { passive: true });
    }
  }

  inst.fieldCount = fieldCount;
  inst.onSolve = onSolve;

  const tooltipEl = inst.btn.querySelector('.Cognilot-form-trigger-tooltip');
  if (tooltipEl) {
    tooltipEl.textContent = `> solve_all.sh (${fieldCount} campos)`;
  }

  repositionAll();
}

export function setSolving(isSolving: boolean, targetContainer?: HTMLElement): void {
  for (const [container, inst] of _instances.entries()) {
    if (!targetContainer || targetContainer === container) {
      if (isSolving) {
        inst.btn.classList.add('Cognilot-form-trigger-dot--solving');
        const tooltipEl = inst.btn.querySelector('.Cognilot-form-trigger-tooltip');
        if (tooltipEl) tooltipEl.textContent = `> solving...`;
      } else {
        inst.btn.classList.remove('Cognilot-form-trigger-dot--solving');
        const tooltipEl = inst.btn.querySelector('.Cognilot-form-trigger-tooltip');
        if (tooltipEl) tooltipEl.textContent = `> solve_all.sh (${inst.fieldCount} campos)`;
      }
    }
  }
}

export function removeFormTrigger(container: HTMLElement): void {
  const inst = _instances.get(container);
  if (inst) {
    inst.btn.remove();
    _instances.delete(container);
  }
}

export function removeAll(): void {
  for (const inst of _instances.values()) {
    inst.btn.remove();
  }
  _instances.clear();

  if (_boundReposition) {
    window.removeEventListener('scroll', _boundReposition, true);
    window.removeEventListener('resize', _boundReposition);
    _boundReposition = null;
  }
}

export const FormTriggerUI = {
  showFormTrigger,
  setSolving,
  removeFormTrigger,
  removeAll,
};
