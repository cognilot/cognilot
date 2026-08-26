import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../db/client.js';
import { userProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.js';
import { createGroqClient } from '../services/llm.js';
import type { AuthEnv } from '../types/hono.js';

export const suggestionsRouter = new Hono<AuthEnv>();

// Auth + Rate limiting on all suggestion routes
suggestionsRouter.use('*', authMiddleware);
suggestionsRouter.use('*', rateLimiterMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const fieldContextSchema = z.object({
  label: z.string(),
  type: z.string().default('text'),
  placeholder: z.string().optional(),
  value: z.string().optional(),
  formContext: z.string().optional(),
  helperText: z.string().optional(),
});

const pageContextSchema = z.object({
  url: z.string().url(),
  title: z.string(),
  domain: z.string(),
});

const optionsSchema = z
  .object({
    tone: z.enum(['professional', 'casual', 'concise']).default('professional'),
    language: z.string().default('en'),
  })
  .optional();

const suggestionRequestSchema = z.object({
  fieldContext: fieldContextSchema,
  pageContext: pageContextSchema,
  options: optionsSchema,
  provider: z.string().optional(),
  user_context: z.any().optional(),
});

const refineRequestSchema = z.object({
  field: z.object({
    label: z.string(),
    type: z.string().default('text'),
    tagName: z.string().default('INPUT'),
  }),
  page_context: z.object({
    domain: z.string(),
    path: z.string(),
    title: z.string(),
  }),
  raw_text: z.string(),
  learn_on_enhance: z.boolean().default(false),
  provider: z.string().optional(),
  user_context: z.any().optional(),
});

const batchQuestionSchema = z.object({
  key: z.string(),
  field: z.object({
    label: z.string(),
    placeholder: z.string().optional().nullable(),
    name: z.string().optional().nullable(),
    id: z.string().optional().nullable(),
    type: z.string().default('text'),
    tagName: z.string().default('INPUT'),
    required: z.boolean().default(false),
    helperText: z.string().optional().nullable(),
  }),
});

const batchSuggestionSchema = z.object({
  provider: z.string().optional(),
  questions: z.array(batchQuestionSchema).min(1).max(20),
  user_context: z.any().optional(),
  page_context: z.any().optional(),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/suggestions
 * Generates an AI suggestion for a single form field.
 * Uses the user's learned profile data and aliases to personalize suggestions.
 */
suggestionsRouter.post('/', zValidator('json', suggestionRequestSchema), async (c) => {
  const userId = c.get('userId');
  const reqBody = c.req.valid('json');
  const { fieldContext, pageContext, options } = reqBody;

  let profileData: Record<string, unknown> = {};

  if (reqBody.user_context !== undefined) {
    const clientProfile = reqBody.user_context?.profile || {};
    profileData = clientProfile.data_learned || clientProfile;
  } else {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    profileData = (profile?.dataLearned as Record<string, unknown>) ?? {};
  }

  const clipboard = reqBody.user_context?.clipboard;
  const isImageClipboard = !!(clipboard && clipboard.type === 'image' && clipboard.content);
  const isTextClipboard = !!(clipboard && clipboard.type === 'text' && clipboard.content);

  let clipboardPromptSection = '';
  if (isTextClipboard) {
    clipboardPromptSection = `\n\n## Clipboard Context (User Provided Text):\n${clipboard.content}`;
  }

  const systemPrompt = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate value for a web form field based on the user's profile data, page context, and any provided clipboard context.

## User Profile Data:
${JSON.stringify(profileData, null, 2)}${clipboardPromptSection}

## Instructions:
- Suggest a value for the field. If you cannot find the exact information in the user profile data or clipboard context, infer a highly plausible example value based on the field label, type, placeholder, and context.
- Return ONLY a valid JSON object matching the following structure. Do not include markdown code block wrappers (e.g. \`\`\`json) or conversational filler:
{
  "value": "The suggested value",
  "isExample": boolean // false if found/derived from user profile or clipboard, true if it is a generic placeholder/example
}
- Be ${options?.tone ?? 'professional'} in tone.
- Respond in ${options?.language ?? 'English'}.`;

  let userMessageContent: any = `Fill in this form field:
Field Label: ${fieldContext.label}
Field Type: ${fieldContext.type}
Placeholder: ${fieldContext.placeholder ?? 'N/A'}
Helper Text: ${fieldContext.helperText ?? 'N/A'}
Current Value: ${fieldContext.value ?? '(empty)'}
Form Context: ${fieldContext.formContext ?? 'N/A'}
Page: ${pageContext.title} (${pageContext.domain})`;

  if (isImageClipboard) {
    userMessageContent = [
      {
        type: 'text',
        text: `Fill in this form field based on the attached image screenshot from the user's clipboard and profile:\nField Label: ${fieldContext.label}\nField Type: ${fieldContext.type}\nPlaceholder: ${fieldContext.placeholder ?? 'N/A'}\nHelper Text: ${fieldContext.helperText ?? 'N/A'}\nCurrent Value: ${fieldContext.value ?? '(empty)'}\nPage: ${pageContext.title} (${pageContext.domain})`,
      },
      {
        type: 'image_url',
        image_url: {
          url: clipboard.content,
        },
      },
    ];
  }

  try {
    let content = '';
    if (isImageClipboard) {
      const apiKey = process.env['GROQ_API_KEY'];
      if (!apiKey) throw new Error('GROQ_API_KEY not configured');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessageContent },
          ],
          temperature: 0.3,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API returned ${response.status}: ${errorText}`);
      }

      const responseData: any = await response.json();
      content = responseData.choices?.[0]?.message?.content || '{}';
    } else {
      const llm = createGroqClient(reqBody.provider, false);
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessageContent),
      ]);
      content = typeof response.content === 'string' ? response.content.trim() : '{}';
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { value: '', isExample: true };
    const suggestion = (parsed.value ?? '').trim();
    const isExample = !!parsed.isExample;

    return c.json({
      suggestion,
      field: fieldContext.label,
      confidence: isExample ? 'low' : 'high',
      isExample,
      type: isExample ? 'example' : 'discrete',
    });
  } catch (err) {
    console.error('[Suggestions] LLM error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to generate suggestion.' }, 502);
  }
});

/**
 * POST /api/suggestions/refine
 * Refines (enhances) user-provided text for a single field using AI.
 */
suggestionsRouter.post('/refine', zValidator('json', refineRequestSchema), async (c) => {
  const userId = c.get('userId');
  const reqBody = c.req.valid('json');
  const { field, page_context, raw_text } = reqBody;

  let profileData: Record<string, unknown> = {};

  if (reqBody.user_context !== undefined) {
    const clientProfile = reqBody.user_context?.profile || {};
    profileData = clientProfile.data_learned || clientProfile;
  } else {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    profileData = (profile?.dataLearned as Record<string, unknown>) ?? {};
  }

  const systemPrompt = `You are an assistant that refines, enhances, and formats user input text within a form field.
Your job is to rewrite or complete the user's text to make it fit perfectly in the context of the field.

## User Profile:
${JSON.stringify(profileData, null, 2)}

## Instructions:
- Return ONLY the refined, polished, or completed text. No introductions, no conversational filler, no markdown wrappers, no quotes.
- Align with the context of the page and the field label.
- Keep the language of the original text unless it clearly benefits from a correction.
- If the original text is already perfect, return it unchanged.`;

  const userMessage = `Refine this text for the field:
Field Label: ${field.label}
Field Type: ${field.type}
Tag: ${field.tagName}
Page Title: ${page_context.title}
Domain: ${page_context.domain}

Original Text to Refine:
"${raw_text}"`;

  try {
    const llm = createGroqClient(reqBody.provider);
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ]);

    const refinedText = typeof response.content === 'string' ? response.content.trim() : '';

    return c.json({
      refined_text: refinedText,
    });
  } catch (err) {
    console.error('[Suggestions/Refine] LLM error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to refine suggestion.' }, 502);
  }
});

/**
 * POST /api/suggestions/batch
 * Generates suggestions for multiple fields in a single request.
 * More efficient than calling /v2 for each field individually.
 */
suggestionsRouter.post('/batch', zValidator('json', batchSuggestionSchema), async (c) => {
  const userId = c.get('userId');
  const reqBody = c.req.valid('json');
  const { questions } = reqBody;
  const model = 'openai/gpt-oss-120b';

  let profileData: Record<string, unknown> = {};

  if (reqBody.user_context !== undefined) {
    const clientProfile = reqBody.user_context?.profile || {};
    profileData = clientProfile.data_learned || clientProfile;
  } else {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    profileData = (profile?.dataLearned as Record<string, unknown>) ?? {};
  }

  const clipboard = reqBody.user_context?.clipboard;
  const isImageClipboard = !!(clipboard && clipboard.type === 'image' && clipboard.content);
  const isTextClipboard = !!(clipboard && clipboard.type === 'text' && clipboard.content);

  let clipboardPromptSection = '';
  if (isTextClipboard) {
    clipboardPromptSection = `\n\n## Clipboard Context (User Provided Text):\n${clipboard.content}`;
  }

  const systemPrompt = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate values for multiple form fields based on the user's profile data and any provided clipboard context.

## User Profile:
${JSON.stringify(profileData, null, 2)}${clipboardPromptSection}

## Instructions:
For each field in the request, return the best suggestion value. If you cannot find the exact information in the user profile or clipboard context, infer a highly plausible example value.
Return ONLY a JSON object mapping each question's key to an object with "value" and "isExample" (boolean) properties.
Example format:
{
  "key_1": { "value": "Suggested Value 1", "isExample": false },
  "key_2": { "value": "example@email.com", "isExample": true }
}
No explanations, no markdown code block wrappers (e.g. \`\`\`json). Return raw JSON.`;

  const fieldsText = questions
    .map(
      (q, i) =>
        `${i + 1}. Key: "${q.key}", Label: "${q.field.label}", Type: "${q.field.type}", Placeholder: "${q.field.placeholder ?? ''}", Helper Text: "${q.field.helperText ?? ''}"`
    )
    .join('\n');

  let userMessageContent: any = `Fill these fields:\n${fieldsText}`;

  if (isImageClipboard) {
    userMessageContent = [
      {
        type: 'text',
        text: `Fill these fields based on the attached image screenshot from the user's clipboard and profile:\n${fieldsText}`,
      },
      {
        type: 'image_url',
        image_url: {
          url: clipboard.content,
        },
      },
    ];
  }

  try {
    let content = '';
    if (isImageClipboard) {
      const apiKey = process.env['GROQ_API_KEY'];
      if (!apiKey) throw new Error('GROQ_API_KEY not configured');

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.6-27b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessageContent },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API returned ${response.status}: ${errorText}`);
      }

      const responseData: any = await response.json();
      content = responseData.choices?.[0]?.message?.content || '{}';
    } else {
      const llm = createGroqClient(reqBody.provider, false);
      const response = await llm.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(userMessageContent),
      ]);
      content = typeof response.content === 'string' ? response.content.trim() : '{}';
    }
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const results = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Standardize results into the { [key]: { value, options, type } } format expected by SuggestionEngine
    const standardizedResults: Record<string, any> = {};
    for (const q of questions) {
      const resVal = results[q.key];
      let val = '';
      let isExample = true;

      if (resVal) {
        if (typeof resVal === 'object' && !Array.isArray(resVal)) {
          val = resVal.value ?? '';
          isExample = resVal.isExample ?? true;
        } else if (Array.isArray(resVal)) {
          val = resVal[0] ?? '';
          isExample = false; // Fallback for legacy format if any
        } else {
          val = String(resVal);
          isExample = false;
        }
      }

      standardizedResults[q.key] = {
        value: val,
        options: [val],
        type: isExample ? 'example' : 'discrete',
      };
    }

    return c.json({
      request_id: `req_${Math.random().toString(36).substring(2, 12)}`,
      results: standardizedResults,
      meta: {
        processing_time_ms: 100, // mock duration
        model,
      },
    });
  } catch (err) {
    console.error('[Suggestions/Batch] LLM error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to generate batch suggestions.' }, 502);
  }
});
