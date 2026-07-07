import { PlatformAdapter, CognilotNode } from './interface';
import { WebNode } from './web-node';

/**
 * WebPlatform
 * Adapter for the Browser environment.
 */
export class WebPlatform implements PlatformAdapter {
  readonly identifier = 'web';

  wrap(element: HTMLElement): CognilotNode | null {
    return element ? new WebNode(element) : null;
  }

  getRootNode(): CognilotNode | null {
    return new WebNode(document.body);
  }

  getComputedStyle(node: CognilotNode): Record<string, string> {
    const el = node.getRawNode<HTMLElement>();
    const style = window.getComputedStyle(el);
    const result: Record<string, string> = {};
    for (let i = 0; i < style.length; i++) {
      const prop = style[i];
      const name = style.item(i);
      result[name] = style.getPropertyValue(name);
    }
    return result;
  }

  evaluateXPath(xpath: string, context: CognilotNode): CognilotNode[] {
    const el = context.getRawNode<Node>();
    const results: CognilotNode[] = [];
    const query = document.evaluate(xpath, el, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (let i = 0; i < query.snapshotLength; i++) {
      const node = query.snapshotItem(i);
      if (node instanceof HTMLElement) {
        results.push(new WebNode(node));
      }
    }
    return results;
  }

  getGlobalContext() {
    return {
      location: {
        hostname: window.location.hostname,
        pathname: window.location.pathname,
        href: window.location.href,
      },
      title: document.title,
      document: document,
    };
  }
}
