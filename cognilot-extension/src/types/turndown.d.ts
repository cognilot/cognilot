/**
 * Type declarations for the vendored TurndownService library.
 * The actual implementation stays in utils/turndown.js (not converted to TS).
 */

declare class TurndownService {
  constructor(options?: {
    headingStyle?: string;
    hr?: string;
    bulletListMarker?: string;
    codeBlockStyle?: string;
    fence?: string;
    emDelimiter?: string;
    strongDelimiter?: string;
    linkStyle?: string;
    linkReferenceStyle?: string;
  });

  turndown(input: string | HTMLElement): string;
  addRule(key: string, rule: TurndownService.Rule): this;
  use(plugins: TurndownService.Plugin | TurndownService.Plugin[]): this;
  remove(filter: string | string[] | TurndownService.Filter): this;
  keep(filter: string | string[] | TurndownService.Filter): this;
}

declare namespace TurndownService {
  type Filter =
    | string
    | string[]
    | ((node: HTMLElement, options: Record<string, unknown>) => boolean);

  interface Rule {
    filter: Filter;
    replacement: (content: string, node: HTMLElement, options: Record<string, unknown>) => string;
  }

  type Plugin = (service: TurndownService) => void;
}
