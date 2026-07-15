import type { Metadata } from 'next';
import { LegalLayout, type LegalSection } from '@/components/legal/LegalLayout';

export const metadata: Metadata = {
  title: 'Terms of Service — Cognilot',
  description:
    'Terms of Service for Cognilot. Read about the rules and guidelines for using our AI-powered profile and autofill platform.',
};

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'acceptance_of_terms',
    label: 'Acceptance of Terms',
    content: (
      <p>
        By accessing or using Cognilot (the &quot;Service&quot;), you agree to be bound by these
        Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
        Service. These Terms constitute a legally binding agreement between you (&quot;User&quot;,
        &quot;you&quot;) and Cognilot (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;).
      </p>
    ),
  },
  {
    id: 'description',
    title: 'description_of_service',
    label: 'Description of Service',
    content: (
      <>
        <p>
          Cognilot is an AI-powered platform that learns your professional profile and automates
          form filling through a browser extension, web dashboard, and developer SDK. The Service
          includes:
        </p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>
            <strong className="text-white/90">Memory</strong> — structured profile data managed by
            you
          </li>
          <li>
            <strong className="text-white/90">Aliases</strong> — custom shortcut mappings for your
            data
          </li>
          <li>
            <strong className="text-white/90">Extension</strong> — Chrome extension for autofill on
            supported websites
          </li>
          <li>
            <strong className="text-white/90">SDK</strong> — developer toolkit for programmatic
            access
          </li>
          <li>
            <strong className="text-white/90">Playground</strong> — sandbox for testing custom
            skills
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'eligibility',
    label: 'Eligibility',
    content: (
      <p>
        You must be at least 16 years of age to use the Service. By using Cognilot, you represent
        and warrant that you meet this age requirement and have the legal capacity to enter into
        these Terms.
      </p>
    ),
  },
  {
    id: 'account',
    title: 'account_registration',
    label: 'Account Registration',
    content: (
      <>
        <p>
          Access to the Service requires authentication via Google Sign-In or email-based account
          creation. You are responsible for maintaining the confidentiality of your account
          credentials and for all activity that occurs under your account.
        </p>
        <p>
          You must provide accurate, current, and complete information during registration and keep
          your account information up to date. We reserve the right to suspend or terminate accounts
          that contain false or misleading information.
        </p>
      </>
    ),
  },
  {
    id: 'memory-data',
    title: 'your_memory_data',
    label: 'Your Memory Data',
    content: (
      <>
        <p>
          Your &quot;Memory&quot; data — including personal information, professional details, and
          preferences — is owned by you. By storing data in Cognilot, you grant us a limited license
          to process, store, and sync that data solely for the purpose of providing the Service to
          you.
        </p>
        <p>You retain the right to:</p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>Access, modify, or delete your Memory data at any time</li>
          <li>Export your data in standard formats</li>
          <li>Request complete deletion of all stored data</li>
        </ul>
      </>
    ),
  },
  {
    id: 'api-keys',
    title: 'api_keys_and_credentials',
    label: 'API Keys & Credentials',
    content: (
      <>
        <p>
          Cognilot supports Bring Your Own Key (BYOK) functionality, allowing you to connect your
          own AI provider API keys. These keys are stored securely and used exclusively to fulfill
          your requests. We do not use your API keys for any purpose other than providing the
          Service.
        </p>
        <p>
          You are solely responsible for the usage and costs associated with your own API keys.
          Cognilot is not responsible for any charges incurred through your API provider.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'acceptable_use',
    label: 'Acceptable Use',
    content: (
      <>
        <p>You agree not to:</p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
          <li>Attempt to gain unauthorized access to other accounts, systems, or networks</li>
          <li>Interfere with, disrupt, or overload the Service or its infrastructure</li>
          <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
          <li>Resell, sublicense, or distribute the Service without written authorization</li>
          <li>Use automated tools to scrape, crawl, or extract data from the Service</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'intellectual_property',
    label: 'Intellectual Property',
    content: (
      <p>
        The Service, including its design, code, documentation, and branding, is owned by Cognilot
        and protected by applicable intellectual property laws. These Terms do not grant you any
        right to use our trademarks, logos, or brand assets without prior written consent.
      </p>
    ),
  },
  {
    id: 'pricing',
    title: 'pricing_and_billing',
    label: 'Pricing & Billing',
    content: (
      <>
        <p>
          Cognilot operates on a freemium model. Free-tier usage is subject to rate limits and
          feature restrictions as described on the pricing page. Paid plans are billed in advance on
          a recurring monthly or annual basis.
        </p>
        <p>
          All fees are non-refundable unless required by applicable law. We reserve the right to
          modify pricing with 30 days&apos; advance notice. Continued use of the Service after a
          price change constitutes acceptance of the new pricing.
        </p>
      </>
    ),
  },
  {
    id: 'availability',
    title: 'service_availability',
    label: 'Service Availability',
    content: (
      <p>
        We strive to maintain high availability but do not guarantee uninterrupted access to the
        Service. We may temporarily suspend or restrict access for maintenance, updates, or
        circumstances beyond our reasonable control. We will make reasonable efforts to provide
        advance notice of planned downtime.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'termination',
    label: 'Termination',
    content: (
      <>
        <p>
          You may terminate your account at any time through the dashboard settings or by contacting
          us. Upon termination, your data will be deleted in accordance with our data retention
          policies.
        </p>
        <p>
          We reserve the right to suspend or terminate your access to the Service at our discretion,
          with or without cause, with or without notice. Upon termination for cause, you forfeit any
          remaining prepaid subscription fees.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'limitation_of_liability',
    label: 'Limitation of Liability',
    content: (
      <>
        <p>
          To the maximum extent permitted by law, Cognilot shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, including but not limited to loss
          of profits, data, or business opportunities, arising from or related to your use of the
          Service.
        </p>
        <p>
          Our total liability for any claim arising from or related to these Terms or the Service
          shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
        </p>
      </>
    ),
  },
  {
    id: 'disclaimer',
    title: 'disclaimer_of_warranties',
    label: 'Disclaimer of Warranties',
    content: (
      <p>
        The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of
        any kind, whether express or implied, including but not limited to implied warranties of
        merchantability, fitness for a particular purpose, and non-infringement.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'changes_to_terms',
    label: 'Changes to Terms',
    content: (
      <p>
        We may update these Terms from time to time. Material changes will be communicated via email
        or a prominent notice on the Service at least 30 days before taking effect. Your continued
        use of the Service after the effective date constitutes acceptance of the revised Terms.
      </p>
    ),
  },
  {
    id: 'governing-law',
    title: 'governing_law',
    label: 'Governing Law',
    content: (
      <p>
        These Terms shall be governed by and construed in accordance with the laws of the
        jurisdiction in which Cognilot operates, without regard to its conflict of law provisions.
      </p>
    ),
  },
  {
    id: 'disputes',
    title: 'dispute_resolution',
    label: 'Dispute Resolution',
    content: (
      <p>
        Any dispute arising from or relating to these Terms or the Service shall first be addressed
        through good-faith negotiation. If the dispute cannot be resolved within thirty (30) days,
        either party may pursue resolution through binding arbitration in accordance with the rules
        of a mutually agreed-upon arbitration service.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'contact',
    label: 'Contact',
    content: (
      <p>
        If you have questions about these Terms, contact us at{' '}
        <a href="mailto:hello@cognilot.com" className="text-accent-cyan hover:underline">
          hello@cognilot.com
        </a>
        .
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <div className="relative z-10 px-6 md:px-12 lg:px-20 py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-4xl animate-fade-in">
        <LegalLayout filename="TERMS.MD" sections={sections}>
          <h1 className="legal-title">Terms of Service</h1>
          <p className="legal-subtitle">Last Updated June 1, 2026</p>

          <h2 className="legal-h2">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Cognilot (the &quot;Service&quot;), you agree to be bound by these
            Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the
            Service. These Terms constitute a legally binding agreement between you
            (&quot;User&quot;, &quot;you&quot;) and Cognilot (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;).
          </p>

          <h2 className="legal-h2">2. Description of Service</h2>
          <p>
            Cognilot is an AI-powered platform that learns your professional profile and automates
            form filling through a browser extension, web dashboard, and developer SDK. The Service
            includes:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>
              <strong className="text-white/90">Memory</strong> — structured profile data managed by
              you
            </li>
            <li>
              <strong className="text-white/90">Aliases</strong> — custom shortcut mappings for your
              data
            </li>
            <li>
              <strong className="text-white/90">Extension</strong> — Chrome extension for autofill
              on supported websites
            </li>
            <li>
              <strong className="text-white/90">SDK</strong> — developer toolkit for programmatic
              access
            </li>
            <li>
              <strong className="text-white/90">Playground</strong> — sandbox for testing custom
              skills
            </li>
          </ul>

          <h2 className="legal-h2">3. Eligibility</h2>
          <p>
            You must be at least 16 years of age to use the Service. By using Cognilot, you
            represent and warrant that you meet this age requirement and have the legal capacity to
            enter into these Terms.
          </p>

          <h2 className="legal-h2">4. Account Registration</h2>
          <p>
            Access to the Service requires authentication via Google Sign-In or email-based account
            creation. You are responsible for maintaining the confidentiality of your account
            credentials and for all activity that occurs under your account.
          </p>
          <p>
            You must provide accurate, current, and complete information during registration and
            keep your account information up to date. We reserve the right to suspend or terminate
            accounts that contain false or misleading information.
          </p>

          <h2 className="legal-h2">5. Your Memory Data</h2>
          <p>
            Your &quot;Memory&quot; data — including personal information, professional details, and
            preferences — is owned by you. By storing data in Cognilot, you grant us a limited
            license to process, store, and sync that data solely for the purpose of providing the
            Service to you.
          </p>
          <p>You retain the right to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>Access, modify, or delete your Memory data at any time</li>
            <li>Export your data in standard formats</li>
            <li>Request complete deletion of all stored data</li>
          </ul>

          <h2 className="legal-h2">6. API Keys &amp; Credentials</h2>
          <p>
            Cognilot supports Bring Your Own Key (BYOK) functionality, allowing you to connect your
            own AI provider API keys. These keys are stored securely and used exclusively to fulfill
            your requests. We do not use your API keys for any purpose other than providing the
            Service.
          </p>
          <p>
            You are solely responsible for the usage and costs associated with your own API keys.
            Cognilot is not responsible for any charges incurred through your API provider.
          </p>

          <h2 className="legal-h2">7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Attempt to gain unauthorized access to other accounts, systems, or networks</li>
            <li>Interfere with, disrupt, or overload the Service or its infrastructure</li>
            <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            <li>Resell, sublicense, or distribute the Service without written authorization</li>
            <li>Use automated tools to scrape, crawl, or extract data from the Service</li>
          </ul>

          <h2 className="legal-h2">8. Intellectual Property</h2>
          <p>
            The Service, including its design, code, documentation, and branding, is owned by
            Cognilot and protected by applicable intellectual property laws. These Terms do not
            grant you any right to use our trademarks, logos, or brand assets without prior written
            consent.
          </p>

          <h2 className="legal-h2">9. Pricing &amp; Billing</h2>
          <p>
            Cognilot operates on a freemium model. Free-tier usage is subject to rate limits and
            feature restrictions as described on the pricing page. Paid plans are billed in advance
            on a recurring monthly or annual basis.
          </p>
          <p>
            All fees are non-refundable unless required by applicable law. We reserve the right to
            modify pricing with 30 days&apos; advance notice. Continued use of the Service after a
            price change constitutes acceptance of the new pricing.
          </p>

          <h2 className="legal-h2">10. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted access to the
            Service. We may temporarily suspend or restrict access for maintenance, updates, or
            circumstances beyond our reasonable control. We will make reasonable efforts to provide
            advance notice of planned downtime.
          </p>

          <h2 className="legal-h2">11. Termination</h2>
          <p>
            You may terminate your account at any time through the dashboard settings or by
            contacting us. Upon termination, your data will be deleted in accordance with our data
            retention policies.
          </p>
          <p>
            We reserve the right to suspend or terminate your access to the Service at our
            discretion, with or without cause, with or without notice. Upon termination for cause,
            you forfeit any remaining prepaid subscription fees.
          </p>

          <h2 className="legal-h2">12. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Cognilot shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages, including but not limited to
            loss of profits, data, or business opportunities, arising from or related to your use of
            the Service.
          </p>
          <p>
            Our total liability for any claim arising from or related to these Terms or the Service
            shall not exceed the amount you paid to us in the twelve (12) months preceding the
            claim.
          </p>

          <h2 className="legal-h2">13. Disclaimer of Warranties</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without
            warranties of any kind, whether express or implied, including but not limited to implied
            warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </p>

          <h2 className="legal-h2">14. Changes to Terms</h2>
          <p>
            We may update these Terms from time to time. Material changes will be communicated via
            email or a prominent notice on the Service at least 30 days before taking effect. Your
            continued use of the Service after the effective date constitutes acceptance of the
            revised Terms.
          </p>

          <h2 className="legal-h2">15. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            jurisdiction in which Cognilot operates, without regard to its conflict of law
            provisions.
          </p>

          <h2 className="legal-h2">16. Dispute Resolution</h2>
          <p>
            Any dispute arising from or relating to these Terms or the Service shall first be
            addressed through good-faith negotiation. If the dispute cannot be resolved within
            thirty (30) days, either party may pursue resolution through binding arbitration in
            accordance with the rules of a mutually agreed-upon arbitration service.
          </p>

          <h2 className="legal-h2">17. Contact</h2>
          <p>
            If you have questions about these Terms, contact us at{' '}
            <a href="mailto:hello@cognilot.com" className="text-accent-cyan hover:underline">
              hello@cognilot.com
            </a>
            .
          </p>
        </LegalLayout>
      </div>
    </div>
  );
}
