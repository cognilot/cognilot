import { Hono } from 'hono';
import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { db } from '../db/client.js';
import { userProfiles } from '../db/schema.js';
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
function mapLLMJsonToDataLearned(llmJson: Record<string, any>): Record<string, string[]> {
  const dataLearned: Record<string, string[]> = {};

  const setField = (key: string, val: string | null | undefined) => {
    if (val && typeof val === 'string' && val.trim()) {
      dataLearned[key] = [val.trim()];
    }
  };

  // 1. Direct standard field mapping
  setField('full_name', llmJson.full_name);
  setField('email', llmJson.email);
  setField('phone_number', llmJson.phone_number);
  setField('phone', llmJson.phone_number); // duplicate for compatibility
  setField('profession', llmJson.profession);
  setField('current_company', llmJson.company);
  setField('company', llmJson.company);
  setField('current_role', llmJson.job_title);
  setField('job_title', llmJson.job_title);
  setField('university', llmJson.university);
  setField('degree', llmJson.degree);
  setField('bio', llmJson.experience_summary);
  setField('experience_summary', llmJson.experience_summary);

  // 2. Handle comma-separated lists
  if (llmJson.skills && typeof llmJson.skills === 'string') {
    const list = llmJson.skills
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (list.length > 0) dataLearned['skills'] = list;
  }
  if (llmJson.languages && typeof llmJson.languages === 'string') {
    const list = llmJson.languages
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (list.length > 0) dataLearned['languages'] = list;
  }
  if (llmJson.social_links && typeof llmJson.social_links === 'string') {
    const list = llmJson.social_links
      .split(',')
      .map((s: string) => s.trim())
      .filter(Boolean);
    if (list.length > 0) {
      dataLearned['social_links'] = list;
      // Extract github_url, linkedin_url, portfolio_url
      for (const link of list) {
        const lower = link.toLowerCase();
        if (lower.includes('github.com')) {
          dataLearned['github_url'] = [link];
        } else if (lower.includes('linkedin.com')) {
          dataLearned['linkedin_url'] = [link];
        } else if (lower.startsWith('http') && !dataLearned['portfolio_url']) {
          dataLearned['portfolio_url'] = [link];
        }
      }
    }
  }

  // Fallback copy for any other keys just in case
  for (const [key, value] of Object.entries(llmJson)) {
    if (!dataLearned[key] && value !== null && value !== undefined) {
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
- full_name (string or null)
- email (string or null)
- phone_number (string or null)
- profession (string or null)
- company (string or null - most recent job)
- job_title (string or null - most recent position)
- university (string or null - primary education)
- degree (string or null)
- experience_summary (string or null - brief professional summary)
- skills (string or null - comma-separated list)
- social_links (string or null - comma-separated list)
- languages (string or null - comma-separated list)

Rules:
1. Return ONLY the JSON object. No text before or after.
2. If a field is not found, use null.
3. If there are multiple experiences, use the most recent for 'company' and 'job_title'.
4. If there are multiple degrees, use the most relevant for 'university' and 'degree'.
5. Return text in Title Case (Capitalize first letter of each word) for names, locations, job titles, companies, and universities. Email MUST be lowercase.`;

  try {
    const llm = new ChatGroq({
      apiKey: process.env['GROQ_API_KEY'] || 'mock-api-key',
      model: 'llama-3.3-70b-versatile',
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

    // Save to user profile dataLearned
    await db
      .insert(userProfiles)
      .values({ userId, dataLearned: mappedProfile, cvRawText: cvText })
      .onConflictDoUpdate({
        target: userProfiles.userId,
        set: {
          dataLearned: mappedProfile,
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
