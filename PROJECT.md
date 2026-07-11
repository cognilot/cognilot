# Project: Cognilot Profile Memory & CV Parsing

## Architecture

Cognilot is a monorepo consisting of:

- **`cognilot-web` (Next.js 15 App Router)**: Provides the dashboard, onboarding, and memory interface. Communicates with `cognilot-api` backend.
- **`cognilot-api` (Hono + Supabase Auth + Drizzle ORM)**: Provides REST API services, user profile database storage, and AI processing integration (via Groq/Llama).
- **`cognilot-extension` (Chrome Extension)**: Injects autocomplete (ghost text) based on the user's profile and memory.

Data Flow for CV Parsing:

1. User drops PDF/DOCX file into `CVUploader` component in `cognilot-web`.
2. `CVUploader` posts a multipart form to `POST /api/onboarding/parse-cv` in `cognilot-api`.
3. Backend extracts raw text (via `pdf-parse` or `mammoth`) and links, sends it to Groq Llama 3.3 70b versatile.
4. Groq returns structured JSON matching `UserProfileResponse` format.
5. Backend saves the raw CV text (`cv_raw_text`) and extracted memory (`data_learned`) in `user_profiles` table, then returns the fields to the client.
6. Client updates the form data with the parsed fields and lets the user save.

## Milestones

| #   | Name                    | Scope                                                                           | Dependencies | Status |
| --- | ----------------------- | ------------------------------------------------------------------------------- | ------------ | ------ |
| 1   | Exploration & Specs     | Retrieve system prompts, check DB schemas, verify hooks                         | None         | DONE   |
| 2   | Memory View Refactor    | Refactor Next.js 15 memory/page.tsx, components, and schema types               | M1           | DONE   |
| 3   | Backend CV Parse        | Implement file uploads, pdf-parse/mammoth, Groq parser, and profile persistence | M1           | DONE   |
| 4   | Frontend Upload Connect | Connect CVUploader to parse-cv endpoint, display loading/overlay                | M2, M3       | DONE   |
| 5   | Tests & Validation      | Ensure all web/api unit & integration tests pass cleanly                        | M4           | DONE   |

## Code Layout

- Frontend page: `cognilot-web/src/app/(dashboard)/dashboard/memory/page.tsx`
- Frontend memory components: `cognilot-web/src/components/memory/`
- Frontend CVUploader component: `cognilot-web/src/components/CVUploader.tsx`
- Backend onboarding router: `cognilot-api/src/routers/onboarding.ts`
- Backend DB schemas: `cognilot-api/src/db/schema.ts`
- Shared utilities: `cognilot-web/src/utils/dataLearned.ts`
