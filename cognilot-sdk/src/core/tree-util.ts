import { CognilotNode } from '../platforms/interface';

/**
 * TreeUtil
 * Platform-agnostic utilities for traversing and querying the node tree.
 */
export const TreeUtil = {
  /**
   * Finds the first ancestor that matches a predicate.
   */
  findAncestor(node: CognilotNode, predicate: (n: CognilotNode) => boolean): CognilotNode | null {
    let current: CognilotNode | null = node.getParent();
    while (current) {
      if (predicate(current)) return current;
      current = current.getParent();
    }
    return null;
  },

  /**
   * Checks if a node contains another node.
   */
  contains(container: CognilotNode, target: CognilotNode): boolean {
    const rawTarget = target.getRawNode();
    const walk = (n: CognilotNode): boolean => {
      if (n.getRawNode() === rawTarget) return true;
      return n.getChildren().some(walk);
    };
    return walk(container);
  },

  /**
   * Gets all interactive descendants.
   */
  getInteractiveDescendants(node: CognilotNode): CognilotNode[] {
    const results: CognilotNode[] = [];
    const walk = (n: CognilotNode) => {
      if (n.isInteractive) results.push(n);
      n.getChildren().forEach(walk);
    };
    walk(node);
    return results;
  },
};
