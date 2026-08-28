import { Hono } from 'hono';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../db/client.js';
import { memories } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import type { AuthEnv } from '../types/hono.js';
import pdf from 'pdf-parse';
import mammoth from 'mammoth';

export const onboardingRouter = new Hono<AuthEnv>();
onboardingRouter.use('*', authMiddleware);

// Custom page render function for pdf-parse to extract hyperlink annotations page-by-page
async function customPageRender(pageData: any): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  let lastY,
    text = '';
  for (const item of textContent.items) {
    if (lastY === item.transform[5] || !lastY) {
      text += item.str;
    } else {
      text += '\n' + item.str;
    }
    lastY = item.transform[5];
  }

  // Extract link annotations
  try {
    const annotations = await pageData.getAnnotations();
    const links: string[] = [];
    if (Array.isArray(annotations)) {
      for (const ann of annotations) {
        if (ann.subtype === 'Link' && ann.url) {
          links.push(ann.url);
        }
      }
    }
    if (links.length > 0) {
      text += '\n\nHyperlinks:\n' + links.join('\n');
    }
  } catch (err) {
    console.error('Error extracting annotations:', err);
  }

  return text;
}

// Map the LLM snake_case fields into the data_learned Record<string, string[]> format
export function mapLLMJsonToDataLearned(llmJson: Record<string, any>): Record<string, string[]> {
  const dataLearned: Record<string, string[]> = {};

  const setField = (key: string, val: string | null | undefined) => {
    if (val && typeof val === 'string' && val.trim()) {
      dataLearned[key] = [val.trim()];
    }
  };

  // 1. Direct standard field mapping
  setField('given_name', llmJson.given_name);
  setField('family_name', llmJson.family_name);

  // Autocompose full_name if not provided directly
  if (llmJson.full_name && typeof llmJson.full_name === 'string' && llmJson.full_name.trim()) {
    setField('full_name', llmJson.full_name);
  } else {
    const combinedName = [llmJson.given_name, llmJson.family_name].filter(Boolean).join(' ').trim();
    if (combinedName) {
      setField('full_name', combinedName);
    }
  }

  setField('email', llmJson.email);
  setField('phone', llmJson.phone || llmJson.phone_number);
  setField('pronouns', llmJson.pronouns);
  setField('profession', llmJson.profession);
  setField('company', llmJson.company || llmJson.current_company);
  setField('job_title', llmJson.job_title || llmJson.current_role);
  setField('university', llmJson.university);
  setField('degree', llmJson.degree);

  // Socials / Links canonical keys (without _url suffix to match SEED_DICTIONARY)
  setField('github', llmJson.github || llmJson.github_url);
  setField('linkedin', llmJson.linkedin || llmJson.linkedin_url);
  setField('twitter', llmJson.twitter || llmJson.twitter_url);
  setField('portfolio', llmJson.portfolio || llmJson.portfolio_url);

  // 2. Skills & Languages (keep as single formatted string option to autocomplete the full block)
  if (llmJson.skills) {
    if (typeof llmJson.skills === 'string' && llmJson.skills.trim()) {
      dataLearned['skills'] = [llmJson.skills.trim()];
    } else if (Array.isArray(llmJson.skills) && llmJson.skills.length > 0) {
      dataLearned['skills'] = [
        llmJson.skills
          .map((s) => String(s).trim())
          .filter(Boolean)
          .join(', '),
      ];
    }
  }

  if (llmJson.languages) {
    if (typeof llmJson.languages === 'string' && llmJson.languages.trim()) {
      dataLearned['languages'] = [llmJson.languages.trim()];
    } else if (Array.isArray(llmJson.languages) && llmJson.languages.length > 0) {
      dataLearned['languages'] = [
        llmJson.languages
          .map((l) => String(l).trim())
          .filter(Boolean)
          .join(', '),
      ];
    }
  }

  // 3. Fallback: extract social links from raw social_links if discrete keys were missing
  if (llmJson.social_links) {
    const rawLinks =
      typeof llmJson.social_links === 'string'
        ? llmJson.social_links
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : Array.isArray(llmJson.social_links)
          ? llmJson.social_links.map((s: unknown) => String(s).trim()).filter(Boolean)
          : [];

    for (const link of rawLinks) {
      const lower = link.toLowerCase();
      if (lower.includes('github.com') && !dataLearned['github']) {
        dataLearned['github'] = [link];
      } else if (lower.includes('linkedin.com') && !dataLearned['linkedin']) {
        dataLearned['linkedin'] = [link];
      } else if (
        (lower.includes('twitter.com') || lower.includes('x.com')) &&
        !dataLearned['twitter']
      ) {
        dataLearned['twitter'] = [link];
      } else if (lower.startsWith('http') && !dataLearned['portfolio']) {
        dataLearned['portfolio'] = [link];
      }
    }
  }

  // Exclude deprecated or redundant keys from fallback copying
  const excludedKeys = new Set([
    'phone_number',
    'current_company',
    'current_role',
    'experience_summary',
    'bio',
    'social_links',
    'github_url',
    'linkedin_url',
    'portfolio_url',
    'twitter_url',
  ]);

  // Fallback copy for any other unknown keys
  for (const [key, value] of Object.entries(llmJson)) {
    if (!excludedKeys.has(key) && !dataLearned[key] && value !== null && value !== undefined) {
      if (Array.isArray(value)) {
        dataLearned[key] = value.map(String);
      } else {
        dataLearned[key] = [String(value)];
      }
    }
  }

  return dataLearned;
}

// ── Handlers ──────────────────────────────────────────────────────────────────

/**
 * POST /api/onboarding/parse-cv
 * Parses uploaded PDF or DOCX file containing a CV using LLM to extract structured profile data.
 * Saves the extracted data to the user's `dataLearned` profile column in the DB.
 */
onboardingRouter.post('/parse-cv', async (c) => {
  const userId = c.get('userId');

  // 1. Parse body and extract file
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!file || typeof file === 'string') {
    return c.json({ error: 'Bad Request', message: 'No file uploaded.' }, 400);
  }

  // 2. Validate max file size 5MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: 'Payload Too Large', message: 'El límite máximo es de 5MB.' }, 413);
  }

  // 3. Extract text content based on file type
  let cvText = '';
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.pdf')) {
      const parsedPdf = await pdf(buffer, {
        pagerender: customPageRender,
      });
      cvText = parsedPdf.text;
    } else if (fileName.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      cvText = result.value;
    } else {
      return c.json(
        { error: 'Bad Request', message: 'Por favor sube un archivo PDF o Word (.docx)' },
        400
      );
    }
  } catch (err) {
    console.error('[Onboarding] File extraction error:', err);
    return c.json({ error: 'Extraction Error', message: 'Failed to extract text from file.' }, 422);
  }

  if (!cvText || cvText.trim().length < 10) {
    return c.json(
      { error: 'Unprocessable Entity', message: 'No se pudo extraer texto del archivo.' },
      422
    );
  }

  const systemPrompt = `Act as an expert CV data extractor. Extract the information from the following CV text and return it in strict JSON format.

Required fields (use EXACTLY these keys):
- given_name (string or null — first/given name only)
- family_name (string or null — last/family name only)
- full_name (string or null — complete full name)
- email (string or null)
- phone (string or null)
- pronouns (string or null — e.g. he/him, she/her, they/them, él/su, etc.)
- profession (string or null)
- company (string or null — most recent or current job)
- job_title (string or null — most recent or current position)
- university (string or null — primary education institution)
- degree (string or null — degree/major earned)
- skills (string or null — clean comma-separated list of technical/core skills)
- languages (string or null — clean comma-separated list of languages spoken)
- linkedin (string or null — full LinkedIn profile URL)
- github (string or null — full GitHub profile URL)
- twitter (string or null — full Twitter/X profile URL)
- portfolio (string or null — personal portfolio or website URL)

Rules:
1. Return ONLY the JSON object. No text before or after.
2. If a field is not found, use null.
3. If there are multiple experiences, use the most recent for 'company' and 'job_title'.
4. If there are multiple degrees, use the most relevant for 'university' and 'degree'.
5. Return text in Title Case (Capitalize first letter of each word) for names, locations, job titles, companies, and universities. Email MUST be lowercase. URLs must be fully qualified.`;

  try {
    const llm = new ChatGroq({
      apiKey: process.env['GROQ_API_KEY'] || 'mock-api-key',
      model: 'openai/gpt-oss-120b',
      temperature: 0,
      maxTokens: 1024,
    });

    const response = await llm.invoke([
      new SystemMessage(systemPrompt),
      new HumanMessage(`Parse this CV:\n\n${cvText.slice(0, 8000)}`),
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
    const mappedProfile = mapLLMJsonToDataLearned(parsedProfile);

    // Save to user memories
    await db
      .insert(memories)
      .values({ userId, data: mappedProfile, cvRawText: cvText })
      .onConflictDoUpdate({
        target: memories.userId,
        set: {
          data: mappedProfile,
          cvRawText: cvText,
          updatedAt: new Date(),
        },
      });

    return c.json(mappedProfile);
  } catch (err) {
    console.error('[Onboarding] CV parse error:', err);
    return c.json({ error: 'LLM Error', message: 'Failed to parse CV.' }, 502);
  }
});
