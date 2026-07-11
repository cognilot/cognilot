import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../db/client.js';
import { userProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimiterMiddleware } from '../middleware/rate-limiter.js';
import type { AuthEnv } from '../types/hono.js';

export const decisionRouter = new Hono<AuthEnv>();

decisionRouter.use('*', authMiddleware);
decisionRouter.use('*', rateLimiterMiddleware);

const decisionQuestionSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.string(),
  options: z.array(z.any()).optional(),
});

const batchDecisionSchema = z.object({
  questions: z.array(decisionQuestionSchema).min(1).max(20),
  provider: z.string().optional(),
  user_context: z.any().optional(),
});

const createGroqClient = (modelName?: string) => {
  const model =
    modelName === 'llama-3.1-8b-instant' ? 'llama-3.1-8b-instant' : 'llama-3.3-70b-versatile';
  return new ChatGroq({
    apiKey: process.env['GROQ_API_KEY']!,
    model,
    temperature: 0.1,
    maxTokens: 512,
  });
};

decisionRouter.post('/batch', zValidator('json', batchDecisionSchema), async (c) => {
  const userId = c.get('userId');
  const reqBody = c.req.valid('json');
  const { questions } = reqBody;

  let userProfileData = {};

  if (reqBody.user_context !== undefined) {
    const clientProfile = reqBody.user_context?.profile || {};
    userProfileData = clientProfile.data_learned || clientProfile;
  } else {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    userProfileData = profile?.dataLearned ?? {};
  }

  const systemPrompt = `You are an intelligent form autofill assistant.
Your job is to select the correct options for choice-based form fields (such as dropdown select, radio buttons, or checkboxes) based on the user's profile data.

## User Profile:
${JSON.stringify(userProfileData, null, 2)}

## Instructions:
For each field, analyze the label and its options, and select the index (0-based) and value of the option that matches the user's profile.
If a field allows multiple selection (checkboxes), you can select multiple indices. If it's single selection (select, radio), select only one index.
If you cannot determine the value confidently, return an empty selection.

Return ONLY a JSON object mapping the field ID to an object with "selected_indices" (array of numbers) and "selected_values" (array of strings).
Example format:
{
  "field_id_1": {
    "selected_indices": [0],
    "selected_values": ["Male"]
  },
  "field_id_2": {
    "selected_indices": [],
    "selected_values": []
  }
}
No explanations, no markdown block wrappers. Return raw JSON.`;

  const fieldsText = questions
    .map((q, i) => {
      const optsStr = (q.options || [])
        .map((opt, idx) => {
          const text = typeof opt === 'string' ? opt : opt.text || opt.value || '';
          const val = typeof opt === 'string' ? opt : opt.value || '';
          return `  - Index ${idx}: "${text}" (value: "${val}")`;
        })
        .join('\n');
      return `${i + 1}. ID: "${q.id}", Label: "${q.label}", Type: "${q.type}"\nOptions:\n${optsStr}`;
    })
    .join('\n\n');

  const model =
    reqBody.provider === 'llama-3.1-8b-instant'
      ? 'llama-3.1-8b-instant'
      : 'llama-3.3-70b-versatile';

  try {
    const llm = createGroqClient(reqBody.provider);
    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Make decisions for these fields:\n${fieldsText}`),
    ]);

    const content = typeof response.content === 'string' ? response.content.trim() : '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const results = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    // Standardize results to ensure selected_indices and selected_values arrays exist
    const standardizedResults: Record<string, any> = {};
    for (const q of questions) {
      const res = results[q.id] || {};
      standardizedResults[q.id] = {
        selected_indices: Array.isArray(res.selected_indices) ? res.selected_indices : [],
        selected_values: Array.isArray(res.selected_values) ? res.selected_values : [],
        confidence: (res.selected_indices?.length ?? 0) > 0 ? 'high' : 'low',
      };
    }

    return c.json({
      results: standardizedResults,
      meta: {
        model,
      },
    });
  } catch (err) {
    console.error('[Decision/Batch] LLM error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to generate decisions.' }, 502);
  }
});
