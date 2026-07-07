import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../db/client.js';
import { userProfiles, aliases } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.js';
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
  }),
});

const batchSuggestionSchema = z.object({
  provider: z.string().optional(),
  questions: z.array(batchQuestionSchema).min(1).max(20),
  user_context: z.any().optional(),
  page_context: z.any().optional(),
});

// ── LLM Client ────────────────────────────────────────────────────────────────

/** Groq LLM client factory */
const createGroqClient = () =>
  new ChatGroq({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    apiKey: process.env['GROQ_API_KEY']!,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.3,
    maxTokens: 512,
  });

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/suggestions
 * Generates an AI suggestion for a single form field.
 * Uses the user's learned profile data and aliases to personalize suggestions.
 */
suggestionsRouter.post('/', zValidator('json', suggestionRequestSchema), async (c) => {
  const userId = c.get('userId');
  const { fieldContext, pageContext, options } = c.req.valid('json');

  // Load user context (profile + aliases)
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const userAliases = await db.select().from(aliases).where(eq(aliases.userId, userId));

  // Build aliases context string
  const aliasesContext = userAliases.map((a) => `- "${a.label}" means "${a.value}"`).join('\n');

  const systemPrompt = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate value for a web form field based on the user's profile data and the page context.

## User Profile Data:
${JSON.stringify(profile?.dataLearned ?? {}, null, 2)}

## User Aliases (shortcuts):
${aliasesContext || 'No aliases defined.'}

## Instructions:
- Return ONLY the value to fill in the field. No explanations, no quotes, no markdown.
- Be ${options?.tone ?? 'professional'} in tone.
- Respond in ${options?.language ?? 'English'}.
- If you cannot confidently determine the value, return an empty string.`;

  const userMessage = `Fill in this form field:
Field Label: ${fieldContext.label}
Field Type: ${fieldContext.type}
Placeholder: ${fieldContext.placeholder ?? 'N/A'}
Current Value: ${fieldContext.value ?? '(empty)'}
Form Context: ${fieldContext.formContext ?? 'N/A'}
Page: ${pageContext.title} (${pageContext.domain})`;

  try {
    const llm = createGroqClient();
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(userMessage),
    ]);

    const suggestion = typeof response.content === 'string' ? response.content.trim() : '';

    return c.json({
      suggestion,
      field: fieldContext.label,
      confidence: suggestion.length > 0 ? 'high' : 'low',
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
  const { field, page_context, raw_text } = c.req.valid('json');

  // Load user context (profile + aliases)
  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const userAliases = await db.select().from(aliases).where(eq(aliases.userId, userId));

  const aliasesContext = userAliases.map((a) => `- "${a.label}" means "${a.value}"`).join('\n');

  const systemPrompt = `You are an assistant that refines, enhances, and formats user input text within a form field.
Your job is to rewrite or complete the user's text to make it fit perfectly in the context of the field.

## User Profile:
${JSON.stringify(profile?.dataLearned ?? {}, null, 2)}

## User Aliases:
${aliasesContext || 'No aliases defined.'}

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
    const llm = createGroqClient();
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
  const { questions } = c.req.valid('json');

  const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
  const userAliases = await db.select().from(aliases).where(eq(aliases.userId, userId));

  const aliasesContext = userAliases.map((a) => `- "${a.label}" means "${a.value}"`).join('\n');

  const systemPrompt = `You are an intelligent form autofill assistant.
Your job is to suggest the most appropriate values for multiple form fields based on the user's profile data.

## User Profile:
${JSON.stringify(profile?.dataLearned ?? {}, null, 2)}

## User Aliases:
${aliasesContext || 'No aliases defined.'}

## Instructions:
For each field in the request, return the best suggestion value.
Return ONLY a JSON object mapping each question's key to an array containing the suggested value.
Example format:
{
  "key_1": ["Suggested Value 1"],
  "key_2": []
}
No explanations, no markdown wrappers. Return raw JSON.`;

  const fieldsText = questions
    .map((q, i) => `${i + 1}. Key: "${q.key}", Label: "${q.field.label}", Type: "${q.field.type}", Placeholder: "${q.field.placeholder ?? ''}"`)
    .join('\n');

  try {
    const llm = createGroqClient();
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Fill these fields:\n${fieldsText}`),
    ]);

    const content = typeof response.content === 'string' ? response.content.trim() : '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const results = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Standardize results into the { [key]: { value, options, type } } format expected by SuggestionEngine
    const standardizedResults: Record<string, any> = {};
    for (const q of questions) {
      const suggestionsArray = results[q.key] || [];
      const val = suggestionsArray[0] ?? '';
      standardizedResults[q.key] = {
        value: val,
        options: suggestionsArray.length > 0 ? suggestionsArray : [val],
        type: 'discrete',
      };
    }

    return c.json({
      request_id: `req_${Math.random().toString(36).substring(2, 12)}`,
      results: standardizedResults,
      meta: {
        processing_time_ms: 100, // mock duration
        model: 'llama-3.3-70b-versatile',
      },
    });
  } catch (err) {
    console.error('[Suggestions/Batch] LLM error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to generate batch suggestions.' }, 502);
  }
});
