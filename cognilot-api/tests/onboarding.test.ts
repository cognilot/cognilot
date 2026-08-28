import { describe, it, expect, vi } from 'vitest';

vi.mock('../src/db/client.js', () => ({
  db: new Proxy(
    {},
    {
      get: () => {
        throw new Error('DB not available in tests — mock individual routes');
      },
    }
  ),
}));

vi.mock('../src/middleware/auth.js', () => ({
  authMiddleware: vi.fn(async (_c: unknown, next: () => Promise<void>) => {
    await next();
  }),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

import { mapLLMJsonToDataLearned } from '../src/routers/onboarding.js';

describe('mapLLMJsonToDataLearned', () => {
  it('maps standard fields and synthesizes full_name when full_name is omitted', () => {
    const rawLlm = {
      given_name: 'John',
      family_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 555-0199',
      pronouns: 'he/him',
      profession: 'Software Engineer',
      company: 'Acme Corp',
      job_title: 'Senior Developer',
      university: 'MIT',
      degree: 'B.S. Computer Science',
      skills: 'TypeScript, React, Node.js',
      languages: 'English (Native), Spanish (B2)',
      linkedin: 'https://linkedin.com/in/johndoe',
      github: 'https://github.com/johndoe',
      twitter: 'https://x.com/johndoe',
      portfolio: 'https://johndoe.dev',
    };

    const result = mapLLMJsonToDataLearned(rawLlm);

    expect(result.given_name).toEqual(['John']);
    expect(result.family_name).toEqual(['Doe']);
    expect(result.full_name).toEqual(['John Doe']);
    expect(result.email).toEqual(['john.doe@example.com']);
    expect(result.phone).toEqual(['+1 555-0199']);
    expect(result.pronouns).toEqual(['he/him']);
    expect(result.company).toEqual(['Acme Corp']);
    expect(result.job_title).toEqual(['Senior Developer']);
    expect(result.university).toEqual(['MIT']);
    expect(result.degree).toEqual(['B.S. Computer Science']);
    expect(result.skills).toEqual(['TypeScript, React, Node.js']);
    expect(result.languages).toEqual(['English (Native), Spanish (B2)']);
    expect(result.linkedin).toEqual(['https://linkedin.com/in/johndoe']);
    expect(result.github).toEqual(['https://github.com/johndoe']);
    expect(result.twitter).toEqual(['https://x.com/johndoe']);
    expect(result.portfolio).toEqual(['https://johndoe.dev']);

    // Ensure deprecated / redundant keys are NOT present
    expect(result.phone_number).toBeUndefined();
    expect(result.current_company).toBeUndefined();
    expect(result.current_role).toBeUndefined();
    expect(result.bio).toBeUndefined();
    expect(result.experience_summary).toBeUndefined();
    expect(result.social_links).toBeUndefined();
    expect(result.github_url).toBeUndefined();
    expect(result.linkedin_url).toBeUndefined();
    expect(result.portfolio_url).toBeUndefined();
  });

  it('preserves provided full_name if explicitly supplied', () => {
    const rawLlm = {
      given_name: 'Jane',
      family_name: 'Smith',
      full_name: 'Jane Marie Smith',
    };

    const result = mapLLMJsonToDataLearned(rawLlm);
    expect(result.full_name).toEqual(['Jane Marie Smith']);
  });

  it('handles array format for skills and languages by joining into a single option', () => {
    const rawLlm = {
      skills: ['React', 'TypeScript', 'TailwindCSS'],
      languages: ['English', 'German'],
    };

    const result = mapLLMJsonToDataLearned(rawLlm);
    expect(result.skills).toEqual(['React, TypeScript, TailwindCSS']);
    expect(result.languages).toEqual(['English, German']);
  });

  it('gracefully handles legacy input aliases while normalizing output', () => {
    const legacyLlm = {
      phone_number: '+34 600 000 000',
      current_company: 'Globex Inc',
      current_role: 'Tech Lead',
      social_links: [
        'https://github.com/techlead',
        'https://linkedin.com/in/techlead',
        'https://myblog.io',
      ],
    };

    const result = mapLLMJsonToDataLearned(legacyLlm);
    expect(result.phone).toEqual(['+34 600 000 000']);
    expect(result.company).toEqual(['Globex Inc']);
    expect(result.job_title).toEqual(['Tech Lead']);
    expect(result.github).toEqual(['https://github.com/techlead']);
    expect(result.linkedin).toEqual(['https://linkedin.com/in/techlead']);
    expect(result.portfolio).toEqual(['https://myblog.io']);

    expect(result.phone_number).toBeUndefined();
    expect(result.current_company).toBeUndefined();
    expect(result.current_role).toBeUndefined();
  });
});
