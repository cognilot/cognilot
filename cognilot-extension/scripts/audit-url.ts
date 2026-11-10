import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface AuditField {
  tag: string;
  type: string;
  id: string;
  name: string;
  selector: string;
  label: string | null;
  detected: boolean;
  discardReason?: string;
}

interface AuditReport {
  url: string;
  title: string;
  timestamp: string;
  formsDetectedCount: number;
  forms: Array<{
    selector: string;
    strategy: string;
    isLikelyForm: boolean;
    fieldsCount: number;
  }>;
  totalDomInputs: number;
  detectedFieldsCount: number;
  fields: AuditField[];
}

async function runAudit() {
  const args = process.argv.slice(2);
  let targetUrl = '';
  let headless = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--url=')) {
      targetUrl = args[i].replace('--url=', '');
    } else if (args[i] === '--url' && args[i + 1]) {
      targetUrl = args[++i];
    } else if (args[i] === '--headless') {
      headless = true;
    }
  }

  if (!targetUrl) {
    console.error('❌ Error: Falta el parámetro --url');
    console.log('Uso: pnpm audit --url="https://ejemplo.com/formulario" [--headless]');
    process.exit(1);
  }

  const extensionPath = path.resolve(__dirname, '../dist');
  if (!fs.existsSync(path.join(extensionPath, 'manifest.json'))) {
    console.error(
      `❌ Error: No se encontró la extensión compilada en ${extensionPath}. Ejecuta pnpm build primero.`
    );
    process.exit(1);
  }

  console.log(`\n🔍 [Cognilot Auditor] Iniciando auditoría para: ${targetUrl}`);
  console.log(`📦 Extensión cargada desde: ${extensionPath}`);

  const userDataDir = path.resolve(__dirname, '../.playwright-audit-profile');

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = context.pages()[0] || (await context.newPage());
  page.on('console', (msg) => {
    console.log(`[PAGE CONSOLE ${msg.type()}]:`, msg.text());
  });
  page.on('pageerror', (err) => {
    console.error('[PAGE ERROR]:', err);
  });

  try {
    console.log('🌐 Navegando a la página objetivo...');
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for hydration and dynamic SPA scripts
    console.log('⏳ Esperando hidratación y estabilización de DOM (4s)...');
    await page.waitForTimeout(4000);

    // Scroll to reveal lazy-loaded forms / sections
    console.log('📜 Desplazando página para revelar secciones dinámicas...');
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(2000);

    const sdkBundlePath = path.resolve(__dirname, '../../cognilot-sdk/dist/index.umd.cjs');
    if (fs.existsSync(sdkBundlePath)) {
      console.log('💉 Inyectando @cognilot/sdk directamente para evaluación precisa...');
      const sdkCode = fs.readFileSync(sdkBundlePath, 'utf-8');
      await page.evaluate(`(function() {
        var module = undefined;
        var exports = undefined;
        var define = undefined;
        ${sdkCode}
      })()`);
    }

    const title = await page.title();

    // Evaluate in page DOM
    const auditData = await page.evaluate(() => {
      const allSeedsSelector =
        'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="image"]):not([type="reset"]), ' +
        'textarea, select, [contenteditable="true"], [role="textbox"], [role="combobox"], [role="listbox"], ' +
        'button[aria-haspopup="listbox"], button[role="combobox"], button[data-slot="control"], ' +
        '[data-reka-select-trigger], [data-radix-select-trigger], .v-select button';

      const domElements = Array.from(document.querySelectorAll(allSeedsSelector)) as HTMLElement[];

      let detectionResult: any = null;
      let sdk = (window as any).Cognilot?.SDK;
      if (!sdk && (window as any).CognilotSDK) {
        const CSDK = (window as any).CognilotSDK;
        if (typeof CSDK.CognilotSDK === 'function') {
          sdk = new CSDK.CognilotSDK({ platform: new CSDK.WebPlatform() });
        }
      }
      console.log('[DEBUG AUDIT] sdk resolved:', !!sdk, 'detection:', !!sdk?.detection);

      if (sdk && sdk.detection && typeof sdk.detection.detect === 'function') {
        try {
          detectionResult = sdk.detection.detect(null, false);
          console.log('[DEBUG AUDIT] sdk.detection.detect returned:', {
            form_selector: detectionResult.form_selector,
            strategy: detectionResult.metadata?.strategy,
            is_likely_form: detectionResult.is_likely_form,
            questionsCount: detectionResult.questions?.length,
          });
          detectionResult.questions?.forEach((q: any, i: number) => {
            console.log(`   [q${i + 1}] (${q.type}) "${q.text}" -> id="${q.id}" name="${q.name}"`);
          });
        } catch (e) {
          console.error('DetectionEngine direct call error:', e);
        }
      } else {
        console.warn('[DEBUG AUDIT] sdk.detection not found on window.Cognilot.SDK');
      }

      const detectedQuestions: any[] = detectionResult?.questions || [];
      const detectedNodeSet = new Set<HTMLElement>();

      detectedQuestions.forEach((q) => {
        if (q.node?.element) detectedNodeSet.add(q.node.element);
      });

      const fieldAuditList = domElements.map((el) => {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const hasDimensions = rect.width > 0 && rect.height > 0;
        const isVisibleCSS =
          style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';

        let discardReason: string | undefined = undefined;

        if (!isVisibleCSS) {
          discardReason = `css_hidden (${style.display === 'none' ? 'display:none' : style.visibility === 'hidden' ? 'visibility:hidden' : 'opacity:0'})`;
        } else if (!hasDimensions) {
          discardReason = `zero_dimensions (${Math.round(rect.width)}x${Math.round(rect.height)}px)`;
        } else if (rect.right < -50 || rect.left < -50) {
          discardReason = 'offscreen_negative_coords';
        }

        const tag = el.tagName.toLowerCase();
        const type =
          (el as any).type ||
          (el.getAttribute('contenteditable') === 'true' ? 'contenteditable' : tag);
        const id = el.id || '';
        const name = (el as any).name || el.getAttribute('name') || '';

        // Native computed accessible name
        const computedName = (el as any).computedName || null;

        // Label via label[for]
        let labelText: string | null = computedName;
        if (!labelText && id) {
          const lEl = document.querySelector(`label[for="${id}"]`);
          if (lEl) labelText = (lEl.textContent || '').trim();
        }
        if (!labelText) {
          const parentLabel = el.closest('label');
          if (parentLabel) labelText = (parentLabel.textContent || '').trim();
        }
        if (!labelText) {
          labelText = el.getAttribute('aria-label') || el.getAttribute('placeholder') || null;
        }

        const matchingQuestion = detectedQuestions.find(
          (q) => q.node?.element === el || (id && q.id === id) || (name && q.name === name)
        );
        const isDetected = !!matchingQuestion;

        if (isDetected && matchingQuestion?.text) {
          labelText = matchingQuestion.text;
        }

        if (!isDetected && !discardReason) {
          if (!labelText) {
            discardReason = 'missing_label';
          } else {
            discardReason = 'outside_identified_form_boundary';
          }
        }

        let selector = tag;
        if (id) selector += `#${id}`;
        else if (name) selector += `[name="${name}"]`;
        else if (el.className)
          selector += `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}`;

        return {
          tag,
          type,
          id,
          name,
          selector,
          label: labelText,
          detected: isDetected,
          discardReason: isDetected ? undefined : discardReason,
        };
      });

      return {
        detectionResult: detectionResult
          ? {
              strategy: detectionResult.metadata?.strategy || 'none',
              formSelector: detectionResult.form_selector || 'none',
              isLikelyForm: detectionResult.is_likely_form || false,
              questionsCount: detectedQuestions.length,
              questions: detectedQuestions.map((q) => ({
                text: q.text,
                id: q.id,
                name: q.name,
                type: q.type,
                selector: q.selector,
              })),
            }
          : null,
        fields: fieldAuditList,
      };
    });

    const report: AuditReport = {
      url: targetUrl,
      title,
      timestamp: new Date().toISOString(),
      formsDetectedCount: auditData.detectionResult ? 1 : 0,
      forms: auditData.detectionResult
        ? [
            {
              selector: auditData.detectionResult.formSelector,
              strategy: auditData.detectionResult.strategy,
              isLikelyForm: auditData.detectionResult.isLikelyForm,
              fieldsCount: auditData.detectionResult.questionsCount,
            },
          ]
        : [],
      totalDomInputs: auditData.fields.length,
      detectedFieldsCount: auditData.fields.filter((f) => f.detected).length,
      fields: auditData.fields,
    };

    console.log('\n======================================================');
    console.log(`📋 REPORTE DE AUDITORÍA: ${title}`);
    console.log(`🔗 URL: ${targetUrl}`);
    console.log('======================================================');
    console.log(`🎯 Formularios detectados: ${report.formsDetectedCount}`);
    if (auditData.detectionResult) {
      console.log(`   - Contenedor: ${auditData.detectionResult.formSelector}`);
      console.log(`   - Estrategia: ${auditData.detectionResult.strategy}`);
      console.log(`   - Campos en formulario: ${auditData.detectionResult.questionsCount}`);
    } else {
      console.log('   ⚠️ No se detectó un contenedor de formulario formal.');
    }

    console.log(`\n📊 Entradas en DOM: ${report.totalDomInputs}`);
    console.log(`✅ Campos reconocidos: ${report.detectedFieldsCount}`);
    console.log(
      `❌ Campos ignorados / descartados: ${report.totalDomInputs - report.detectedFieldsCount}`
    );

    console.log('\n--- DETALLE DE CAMPOS ---');
    report.fields.forEach((f, idx) => {
      const statusIcon = f.detected ? '✅' : '⚪';
      const label = f.label ? `"${f.label}"` : '<Sin etiqueta>';
      const reason = f.discardReason ? ` [Descarte: ${f.discardReason}]` : '';
      console.log(`${statusIcon} ${idx + 1}. [${f.type}] ${label} -> ${f.selector}${reason}`);
    });

    const urlObj = new URL(targetUrl);
    const safeDomain = urlObj.hostname.replace(/[^a-z0-9]/gi, '_');
    const outPath = path.resolve(__dirname, `../audit-report-${safeDomain}.json`);
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\n💾 Reporte guardado en: ${outPath}\n`);
  } catch (err) {
    console.error('❌ Error durante la auditoría:', err);
  } finally {
    await context.close();
  }
}

runAudit();
