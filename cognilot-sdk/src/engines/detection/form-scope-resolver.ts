import { CognilotNode, PlatformAdapter } from '../../platforms/interface';

export interface RadialContext {
  formContainer: CognilotNode;
  fieldRefs: any[];
  sectionRefs: any[];
  hasIframeField: boolean;
  score: number;
  actionScore: number;
  radius: number;
}

/**
 * FormScopeResolver
 * Logic for finding significant form boundaries and containers.
 * Ported from the original Cognilot JS SDK.
 */
export class FormScopeResolver {
  private adapter: PlatformAdapter;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  /**
   * Find the nearest meaningful form container from a given element.
   */
  resolveFormScope(element: CognilotNode): CognilotNode | null {
    if (!element) return null;

    // 1. Explicit <form> tag
    const form = element.closest('form');
    if (form) return form;

    // 2. ARIA form role
    const ariaForm = element.closest('[role="form"]');
    if (ariaForm) return ariaForm;

    // 3. Common framework containers
    const frameworkContainer = element.closest(
      '.form-container, .form-wrapper, .form-section, .wpcf7, .gform_wrapper, .office-form, .form-body'
    );
    if (frameworkContainer) return frameworkContainer;

    // 4. Repeating Pattern Detection
    const patternContainer = this.resolveScopeByRepeatingPattern(element);
    if (patternContainer) return patternContainer;

    // 5. Fallback: Container with 2+ inputs
    let candidate = element.getParent();
    const rootNode = this.adapter.getRootNode();
    const bodyRaw = rootNode ? rootNode.getRawNode() : null;

    while (candidate && candidate.getRawNode() !== bodyRaw) {
      const inputCount = candidate.querySelectorAll(
        'input:not([type="hidden"]), textarea, select, [role="textbox"]'
      ).length;
      if (inputCount >= 2) return candidate;
      candidate = candidate.getParent();
    }

    return null;
  }

  /**
   * Crab-style radial expansion from a seed element.
   * This is used to find the "best" form container by evaluating multiple levels of ancestors.
   */
  resolveFormScopeByRadialExpansion(
    seedElement: CognilotNode,
    fieldCollector: any
  ): RadialContext | null {
    if (!seedElement) return null;

    const ancestors: CognilotNode[] = [];
    let current: CognilotNode | null = seedElement;
    let depth = 0;
    const bodyNode = this.adapter.getRootNode();
    const bodyRaw = bodyNode ? bodyNode.getRawNode() : null;

    while (current && current.getRawNode() !== bodyRaw && depth < 14) {
      ancestors.push(current);
      current = current.getParent();
      depth++;
    }
    if (bodyNode) ancestors.push(bodyNode);

    let best: RadialContext | null = null;
    for (let i = 0; i < ancestors.length; i++) {
      const container = ancestors[i];

      const fieldBlocks = fieldCollector.collectFieldBlocks(container, seedElement);
      if (fieldBlocks.length === 0) continue;

      const sectionRefs = fieldCollector.collectSectionRefs(container, fieldBlocks);
      const { score, actionScore } = this.scoreFormContainerCandidate(
        container,
        fieldBlocks,
        sectionRefs,
        i
      );

      // EVALUACION DE SIGNIFICANCIA (REGLA ESTRITA MVP)
      // Optimizamos para evitar falsos positivos en SPAs (como Google Translate)
      const isExplicitForm =
        container.tagName.toLowerCase() === 'form' || container.getAttribute('role') === 'form';

      // Para contenedores genéricos (div, c-wiz, etc), requerimos:
      // 1. Al menos 2 campos (para evitar detectar buscadores aislados con un par de botones)
      // 2. Un actionScore alto (que indique la presencia de botones de submit/acción claros)
      const hasMinFieldsAndButton = isExplicitForm
        ? fieldBlocks.length >= 1
        : fieldBlocks.length >= 2 && actionScore >= 20;

      if ((isExplicitForm || hasMinFieldsAndButton) && (!best || score > best.score)) {
        best = {
          formContainer: container,
          fieldRefs: fieldBlocks,
          sectionRefs,
          hasIframeField: fieldBlocks.some((f: any) => !!f.isIframe),
          score,
          actionScore,
          radius: i,
        };
      }
    }

    return best;
  }

  /**
   * Build a stable context (blocks and sections) for a manually provided container.
   * This reuses exactly the same "seed" logic as radial expansion but within fixed boundaries.
   */
  buildManualScopeContext(container: CognilotNode, fieldCollector: any): RadialContext | null {
    if (!container) return null;

    // 1. Find the first meaningful seed within this boundary
    const allSeedsSelector =
      'input:not([type="hidden"]), textarea, select, [contenteditable="true"], [role="textbox"]';
    const seeds = container.querySelectorAll(allSeedsSelector).filter((el) => el.isVisible);
    const firstSeed = seeds[0];

    if (!firstSeed) return null;

    // 2. Reuse the core block/section collection logic with the boundary fixed to 'container'
    const fieldBlocks = fieldCollector.collectFieldBlocks(container, firstSeed);
    if (fieldBlocks.length === 0) return null;

    const sectionRefs = fieldCollector.collectSectionRefs(container, fieldBlocks);
    const { score, actionScore } = this.scoreFormContainerCandidate(
      container,
      fieldBlocks,
      sectionRefs,
      0
    );

    const isExplicitForm =
      container.tagName.toLowerCase() === 'form' || container.getAttribute('role') === 'form';
    // Aplicamos la misma regla de significancia del modo radial
    const hasMinFieldsAndButton = isExplicitForm
      ? fieldBlocks.length >= 1
      : fieldBlocks.length >= 2 && actionScore >= 20;

    if (!isExplicitForm && !hasMinFieldsAndButton) {
      return null;
    }

    return {
      formContainer: container,
      fieldRefs: fieldBlocks,
      sectionRefs,
      hasIframeField: fieldBlocks.some((f: any) => !!f.isIframe),
      score,
      actionScore,
      radius: 0, // Manual context is always radius 0
    };
  }

  scoreFormContainerCandidate(
    container: CognilotNode,
    fieldBlocks: any[],
    sectionRefs: any[],
    radius: number
  ): { score: number; actionScore: number } {
    const fieldScore = Math.min(fieldBlocks.length, 12) * 9;
    const sectionScore = Math.min(sectionRefs.length, 4) * 8;

    // ANALISIS ESTRUCTURAL DE ACCION (Agnóstico al idioma)
    const actionScore = this.evaluateActionScore(container, fieldBlocks);

    const roleBoost =
      container.tagName.toLowerCase() === 'form' || container.getAttribute('role') === 'form'
        ? 35
        : 0;

    // Eliminado: Heurísticas visuales removidas por ser redundantes y generar falsos positivos en contenedores UI modernos (como el chat).
    let visualBoost = 0;

    // Discourage selection of body or very far ancestors
    let radiusPenalty = radius * 12;
    if (radius > 6) radiusPenalty += (radius - 6) * 10;

    const rootNode = this.adapter.getRootNode();
    if (container.getRawNode() === (rootNode ? rootNode.getRawNode() : null)) radiusPenalty += 100;

    return {
      score: fieldScore + sectionScore + actionScore + roleBoost + visualBoost - radiusPenalty,
      actionScore,
    };
  }

  evaluateActionScore(container: CognilotNode, fieldBlocks: any[]): number {
    if (fieldBlocks.length === 0) return 0;

    const isExplicitForm =
      container.tagName.toLowerCase() === 'form' || container.getAttribute('role') === 'form';
    const allButtonsCounter = container.querySelectorAll(
      'button, input[type="button"], input[type="submit"], [role="button"]'
    );

    // Penalización drástica para pseudo-formularios en SPAs complejas (ej. Google Translate con 96 botones)
    if (
      !isExplicitForm &&
      allButtonsCounter.length > 10 &&
      allButtonsCounter.length / fieldBlocks.length > 2.5
    ) {
      return 0; // Ratio anormal de botones vs campos, claramente no es un formulario estándar
    }

    const buttons = allButtonsCounter.filter((btn) => {
      if (!btn.isVisible) return false;

      const cls = (btn.className || '').toLowerCase();
      if (cls.includes('social') || cls.includes('share') || cls.includes('nav-')) return false;

      return true;
    });

    if (buttons.length === 0) return 0;

    let score = 5; // Base por tener al menos un botón

    const firstEntry = fieldBlocks[0];
    const firstField: CognilotNode = firstEntry
      ? firstEntry.block || firstEntry.element || firstEntry
      : null;

    const lastEntry = fieldBlocks[fieldBlocks.length - 1];
    const lastField: CognilotNode = lastEntry
      ? lastEntry.block || lastEntry.element || lastEntry
      : null;

    if (!firstField || !lastField) return score;

    // Nueva Restricción (Composer/Widget heuristic):
    // Si no es formalmente un formulario, no debe tener botones ANTES y DESPUÉS de los campos.
    // Esto previene detectar interfaces de chat (ej: ChatGPT) que tienen anexos y botón de enviar rodeando el input.
    if (!isExplicitForm) {
      const hasLeadingButton = buttons.some((btn) => btn.isBefore(firstField));
      const hasClosingButton = buttons.some((btn) => lastField.isBefore(btn));

      if (hasLeadingButton && hasClosingButton) {
        return 0; // Invalida el puntaje de acción
      }
    }

    const hasSubmitType = buttons.some((b) => b.getAttribute('type') === 'submit');
    if (hasSubmitType) score += 15;

    // Lógica de "Cierre": ¿Hay algún botón que aparezca DESPUÉS del último input?
    const closingButton = buttons.find((btn) => lastField.isBefore(btn));
    if (closingButton) {
      score += 15;
    }

    // TAB index flow
    const hasFlow = buttons.some((btn) => {
      const tab = parseInt(btn.getAttribute('tabindex') || '0');
      const lastTab = parseInt(lastField.getAttribute('tabindex') || '0');
      return tab > lastTab && lastTab !== 0;
    });
    if (hasFlow) score += 5;

    return Math.min(score, 40);
  }

  resolveScopeByRepeatingPattern(element: CognilotNode): CognilotNode | null {
    if (!element) return null;
    let wrapper = element.getParent();
    let lastGoodWrapper: CognilotNode | null = null;
    const bodyNode = this.adapter.getRootNode();
    const bodyRaw = bodyNode ? bodyNode.getRawNode() : null;

    while (wrapper && wrapper.getRawNode() !== bodyRaw) {
      const inputsInWrapper = wrapper.querySelectorAll(
        'input:not([type="hidden"]), textarea, select, [role="textbox"]'
      ).length;
      if (inputsInWrapper >= 1 && inputsInWrapper <= 2) lastGoodWrapper = wrapper;
      if (inputsInWrapper > 2) break;
      wrapper = wrapper.getParent();
    }
    const parent = lastGoodWrapper ? lastGoodWrapper.getParent() : null;
    if (!parent) return null;

    const wrapperSignature = this.buildStructuralSignature(lastGoodWrapper as CognilotNode);
    const children = parent.getChildren();
    let matchingCount = 0;
    for (const child of children) {
      if (this.buildStructuralSignature(child) === wrapperSignature) matchingCount++;
    }
    return matchingCount >= 2 ? parent : null;
  }

  /**
   * Build a sanitized structural signature for an element based on tag and non-transient classes.
   */
  buildStructuralSignature(element: CognilotNode): string {
    const tag = element.tagName.toLowerCase();
    const classStr = element.className || '';
    const classes = classStr
      .split(/\s+/)
      .filter(
        (cls) =>
          cls &&
          !/^(Cognilot-|aiden-|active|focus|hover|selected|loading|visible|hidden|show|hide|animate|open|closed|disabled|enabled|checked|error|invalid|valid|dirty|touched|collapse|expanded|fade)/.test(
            cls
          ) &&
          !cls.startsWith('ng-') &&
          !/^[a-z0-9]{20,}$/i.test(cls)
      )
      .sort()
      .join('.');
    return `${tag}${classes ? '.' + classes : ''}`;
  }
}
