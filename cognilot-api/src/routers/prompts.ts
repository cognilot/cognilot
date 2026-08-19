import { Hono } from 'hono';

export const promptsRouter = new Hono();

const BYOK_PROMPT_TEMPLATE = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate value for a web form field based on the user's profile data and the page context.

## User Profile Data:
{{PROFILE_CONTEXT}}

## Instructions:
- Return ONLY the value to fill in the field. No explanations, no quotes, no markdown.
- Respond in {{LANGUAGE}}.
- If you cannot find the exact information in the user profile data, infer a plausible example value based on the field label, type, placeholder, and context.

Fill in this form field:
Field Label: {{FIELD_LABEL}}
Field Type: {{FIELD_TYPE}}
Placeholder: {{FIELD_PLACEHOLDER}}
Current Value: {{FIELD_VALUE}}
Form Context: {{FIELD_CONTEXT}}
Page: {{PAGE_TITLE}} ({{PAGE_URL}})`;

promptsRouter.get('/byok', (c) => {
  return c.json({
    template: BYOK_PROMPT_TEMPLATE,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});
