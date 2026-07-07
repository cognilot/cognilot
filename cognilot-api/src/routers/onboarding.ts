import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../db/client.js';
import { userProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthEnv } from '../types/hono.js';

export const onboardingRouter = new Hono<AuthEnv>();
onboardingRouter.use('*', authMiddleware);

// ── Schemas ───────────────────────────────────────────────────────────────────

const parseCvSchema = z.object({
  /** Base64-encoded PDF content or raw extracted text */
  cvText: z.string().min(50, 'CV text is too short to parse.'),
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/onboarding/parse-cv
 * Parses raw CV text using the LLM to extract structured profile data.
 * Saves the extracted data to the user's `dataLearned` profile column.
 */
onboardingRouter.post('/parse-cv', zValidator('json', parseCvSchema), async (c) => {
  const userId = c.get('userId');
  const { cvText } = c.req.valid('json');

  const systemPrompt = `You are a CV parser. Extract structured professional data from the provided CV text.
Return ONLY a valid JSON object with these fields (use null for missing data):
{
  "fullName": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "jobTitle": string | null,
  "company": string | null,
  "yearsExperience": number | null,
  "skills": string[],
  "education": { "degree": string, "institution": string, "year": number | null }[],
  "languages": string[],
  "linkedIn": string | null,
  "website": string | null,
  "summary": string | null
}`;

  try {
    const llm = new ChatGroq({
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      apiKey: process.env['GROQ_API_KEY']!,
      model: 'llama-3.3-70b-versatile',
      temperature: 0,
      maxTokens: 1024,
    });

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Parse this CV:\n\n${cvText.slice(0, 8000)}`), // Limit to 8k chars
    ]);

    const content = typeof response.content === 'string' ? response.content.trim() : '{}';
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      return c.json(
        { error: 'Parse Error', message: 'Could not extract structured data from CV.' },
        422
      );
    }

    const parsedProfile = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    // Save to user profile dataLearned
    await db
      .insert(userProfiles)
      .values({ userId, dataLearned: parsedProfile, cvRawText: cvText })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          dataLearned: parsedProfile,
          cvRawText: cvText,
          updatedAt: new Date(),
        },
      });

    return c.json({
      message: 'CV parsed and profile updated successfully.',
      profile: parsedProfile,
    });
  } catch (err) {
    console.error('[Onboarding] CV parse error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to parse CV.' }, 502);
  }
});
