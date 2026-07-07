export interface PageContext {
  url: string;
  title: string;
  domain: string;
  source: string;
  language: string;
  content_md?: string; // Optional full content for deep analysis
}
