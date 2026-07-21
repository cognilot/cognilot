import type { Metadata } from 'next';
import { ReadmeLayout, type ReadmeSection } from '@cognilot/ui';

export const metadata: Metadata = {
  title: 'Privacy Policy — Cognilot',
  description:
    'Privacy Policy for Cognilot. Learn how we collect, use, protect, and store your data on our AI-powered platform.',
};

const sections: ReadmeSection[] = [
  {
    id: 'overview',
    title: 'overview',
    label: 'Overview',
    content: (
      <p>
        This Privacy Policy describes how Cognilot (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;)
        collects, uses, stores, and protects your personal information when you use our platform,
        browser extension, and developer SDK (collectively, the &quot;Service&quot;). We are
        committed to transparency and protecting your privacy.
      </p>
    ),
  },
  {
    id: 'data-collected',
    title: 'data_we_collect',
    label: 'Data We Collect',
    content: (
      <>
        <p>We collect the following categories of information:</p>
        <h3 className="legal-h3">Account Information</h3>
        <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
          <li>Name and email address (via Google Sign-In or email registration)</li>
          <li>Authentication tokens (managed by Supabase)</li>
          <li>Account preferences and settings</li>
        </ul>
        <h3 className="legal-h3">Memory Data</h3>
        <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
          <li>Personal and professional profile information you choose to store</li>
          <li>Alias mappings and shortcut configurations</li>
          <li>Playground configurations and custom skill definitions</li>
        </ul>
        <h3 className="legal-h3">API Keys</h3>
        <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
          <li>Third-party AI provider API keys you provide (BYOK model)</li>
          <li>These keys are encrypted at rest and never shared with third parties</li>
        </ul>
        <h3 className="legal-h3">Usage Data</h3>
        <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
          <li>Pages visited, features used, and interaction patterns</li>
          <li>Browser type, operating system, and device information</li>
          <li>IP address and approximate geographic location</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-use',
    title: 'how_we_use_your_data',
    label: 'How We Use Your Data',
    content: (
      <>
        <p>We use your data exclusively for the following purposes:</p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>
            <strong className="text-white/90">Service delivery</strong> — syncing your Memory data
            across devices, the browser extension, and connected AI providers
          </li>
          <li>
            <strong className="text-white/90">Autofill</strong> — populating forms using your stored
            profile data when triggered by you
          </li>
          <li>
            <strong className="text-white/90">Improvement</strong> — analyzing aggregate usage
            patterns to improve features and reliability
          </li>
          <li>
            <strong className="text-white/90">Security</strong> — detecting and preventing
            unauthorized access, fraud, and abuse
          </li>
          <li>
            <strong className="text-white/90">Communication</strong> — sending account-related
            notices, service updates, and (with consent) marketing emails
          </li>
        </ul>
        <p>
          We do <strong>not</strong> sell your personal data to third parties. We do not use your
          Memory data to train AI models.
        </p>
      </>
    ),
  },
  {
    id: 'data-storage',
    title: 'data_storage_and_security',
    label: 'Data Storage & Security',
    content: (
      <>
        <p>
          Your data is stored on secure cloud infrastructure provided by Supabase and associated
          hosting providers. Security measures include:
        </p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>AES-256 encryption for data at rest</li>
          <li>TLS 1.3 encryption for data in transit</li>
          <li>Row-level security policies on all database tables</li>
          <li>JWT-based authentication with short-lived tokens</li>
        </ul>
        <p>
          While we implement industry-standard security practices, no method of transmission or
          storage is 100% secure. We cannot guarantee absolute security.
        </p>
      </>
    ),
  },
  {
    id: 'data-sharing',
    title: 'data_sharing',
    label: 'Data Sharing',
    content: (
      <>
        <p>Your data may be shared with the following parties, and only as necessary:</p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>
            <strong className="text-white/90">AI Providers</strong> — when you connect a third-party
            API key, your Memory data is sent to that provider solely to fulfill your request
          </li>
          <li>
            <strong className="text-white/90">Infrastructure providers</strong> — hosting, database,
            and CDN providers that process data on our behalf under strict data processing
            agreements
          </li>
          <li>
            <strong className="text-white/90">Legal requirements</strong> — when required by law,
            subpoena, or court order
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'cookies_and_tracking',
    label: 'Cookies & Tracking',
    content: (
      <>
        <p>
          Cognilot uses essential cookies required for authentication and session management. We do
          not use third-party advertising cookies or cross-site tracking.
        </p>
        <p>
          The browser extension operates entirely on your local device and does not inject tracking
          scripts into web pages you visit. Form autofill events are processed locally and are not
          logged or transmitted to our servers.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'data_retention',
    label: 'Data Retention',
    content: (
      <>
        <p>
          We retain your data for as long as your account is active. Upon account deletion, all
          personal data, Memory entries, aliases, and API key configurations are permanently deleted
          within 30 days.
        </p>
        <p>
          Aggregated and anonymized usage data, which cannot be used to identify you, may be
          retained indefinitely for analytics purposes.
        </p>
      </>
    ),
  },
  {
    id: 'your-rights',
    title: 'your_rights',
    label: 'Your Rights',
    content: (
      <>
        <p>Depending on your jurisdiction, you have the right to:</p>
        <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
          <li>
            <strong className="text-white/90">Access</strong> — request a copy of all personal data
            we hold about you
          </li>
          <li>
            <strong className="text-white/90">Correct</strong> — request correction of inaccurate
            data
          </li>
          <li>
            <strong className="text-white/90">Delete</strong> — request deletion of your personal
            data
          </li>
          <li>
            <strong className="text-white/90">Portability</strong> — request data in a structured,
            machine-readable format
          </li>
          <li>
            <strong className="text-white/90">Object</strong> — object to processing of your data
            for specific purposes
          </li>
          <li>
            <strong className="text-white/90">Withdraw consent</strong> — withdraw consent at any
            time where processing is based on consent
          </li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:hello@cognilot.com" className="text-accent-cyan hover:underline">
            hello@cognilot.com
          </a>
          . We will respond within 30 days.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'childrens_privacy',
    label: "Children's Privacy",
    content: (
      <p>
        The Service is not intended for users under the age of 16. We do not knowingly collect
        personal information from children. If we become aware that a child under 16 has provided us
        with personal data, we will take steps to delete it promptly.
      </p>
    ),
  },
  {
    id: 'international',
    title: 'international_data_transfers',
    label: 'International Transfers',
    content: (
      <p>
        Your data may be processed in countries other than your own. We ensure that appropriate
        safeguards are in place for international transfers, including standard contractual clauses
        where required by applicable data protection regulations.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'changes_to_this_policy',
    label: 'Changes to This Policy',
    content: (
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated
        via email or a prominent notice on the Service at least 30 days before taking effect. The
        &quot;Last Updated&quot; date at the top of this page reflects the most recent revision.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'contact',
    label: 'Contact',
    content: (
      <p>
        For questions about this Privacy Policy or to exercise your data rights, contact us at{' '}
        <a href="mailto:hello@cognilot.com" className="text-accent-cyan hover:underline">
          hello@cognilot.com
        </a>
        .
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative z-10 px-6 md:px-12 lg:px-20 py-16 md:py-24 flex justify-center">
      <div className="w-full max-w-4xl animate-fade-in">
        <ReadmeLayout filename="PRIVACY.MD" sections={sections}>
          <h1 className="legal-title">Privacy Policy</h1>
          <p className="legal-subtitle">Last Updated June 1, 2026</p>

          <h2 className="legal-h2">1. Overview</h2>
          <p>
            This Privacy Policy describes how Cognilot (&quot;we&quot;, &quot;us&quot;,
            &quot;our&quot;) collects, uses, stores, and protects your personal information when you
            use our platform, browser extension, and developer SDK (collectively, the
            &quot;Service&quot;). We are committed to transparency and protecting your privacy.
          </p>

          <h2 className="legal-h2">2. Data We Collect</h2>
          <p>We collect the following categories of information:</p>
          <h3 className="legal-h3">Account Information</h3>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
            <li>Name and email address (via Google Sign-In or email registration)</li>
            <li>Authentication tokens (managed by Supabase)</li>
            <li>Account preferences and settings</li>
          </ul>
          <h3 className="legal-h3">Memory Data</h3>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
            <li>Personal and professional profile information you choose to store</li>
            <li>Alias mappings and shortcut configurations</li>
            <li>Playground configurations and custom skill definitions</li>
          </ul>
          <h3 className="legal-h3">API Keys</h3>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
            <li>Third-party AI provider API keys you provide (BYOK model)</li>
            <li>These keys are encrypted at rest and never shared with third parties</li>
          </ul>
          <h3 className="legal-h3">Usage Data</h3>
          <ul className="list-disc list-inside mt-2 space-y-1 text-white/70">
            <li>Pages visited, features used, and interaction patterns</li>
            <li>Browser type, operating system, and device information</li>
            <li>IP address and approximate geographic location</li>
          </ul>

          <h2 className="legal-h2">3. How We Use Your Data</h2>
          <p>We use your data exclusively for the following purposes:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>
              <strong className="text-white/90">Service delivery</strong> — syncing your Memory data
              across devices, the browser extension, and connected AI providers
            </li>
            <li>
              <strong className="text-white/90">Autofill</strong> — populating forms using your
              stored profile data when triggered by you
            </li>
            <li>
              <strong className="text-white/90">Improvement</strong> — analyzing aggregate usage
              patterns to improve features and reliability
            </li>
            <li>
              <strong className="text-white/90">Security</strong> — detecting and preventing
              unauthorized access, fraud, and abuse
            </li>
            <li>
              <strong className="text-white/90">Communication</strong> — sending account-related
              notices, service updates, and (with consent) marketing emails
            </li>
          </ul>
          <p>
            We do <strong>not</strong> sell your personal data to third parties. We do not use your
            Memory data to train AI models.
          </p>

          <h2 className="legal-h2">4. Data Storage &amp; Security</h2>
          <p>
            Your data is stored on secure cloud infrastructure provided by Supabase and associated
            hosting providers. Security measures include:
          </p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>AES-256 encryption for data at rest</li>
            <li>TLS 1.3 encryption for data in transit</li>
            <li>Row-level security policies on all database tables</li>
            <li>JWT-based authentication with short-lived tokens</li>
          </ul>
          <p>
            While we implement industry-standard security practices, no method of transmission or
            storage is 100% secure. We cannot guarantee absolute security.
          </p>

          <h2 className="legal-h2">5. Data Sharing</h2>
          <p>Your data may be shared with the following parties, and only as necessary:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>
              <strong className="text-white/90">AI Providers</strong> — when you connect a
              third-party API key, your Memory data is sent to that provider solely to fulfill your
              request
            </li>
            <li>
              <strong className="text-white/90">Infrastructure providers</strong> — hosting,
              database, and CDN providers that process data on our behalf under strict data
              processing agreements
            </li>
            <li>
              <strong className="text-white/90">Legal requirements</strong> — when required by law,
              subpoena, or court order
            </li>
          </ul>

          <h2 className="legal-h2">6. Cookies &amp; Tracking</h2>
          <p>
            Cognilot uses essential cookies required for authentication and session management. We
            do not use third-party advertising cookies or cross-site tracking.
          </p>
          <p>
            The browser extension operates entirely on your local device and does not inject
            tracking scripts into web pages you visit. Form autofill events are processed locally
            and are not logged or transmitted to our servers.
          </p>

          <h2 className="legal-h2">7. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active. Upon account deletion, all
            personal data, Memory entries, aliases, and API key configurations are permanently
            deleted within 30 days.
          </p>
          <p>
            Aggregated and anonymized usage data, which cannot be used to identify you, may be
            retained indefinitely for analytics purposes.
          </p>

          <h2 className="legal-h2">8. Your Rights</h2>
          <p>Depending on your jurisdiction, you have the right to:</p>
          <ul className="list-disc list-inside mt-3 space-y-1 text-white/70">
            <li>
              <strong className="text-white/90">Access</strong> — request a copy of all personal
              data we hold about you
            </li>
            <li>
              <strong className="text-white/90">Correct</strong> — request correction of inaccurate
              data
            </li>
            <li>
              <strong className="text-white/90">Delete</strong> — request deletion of your personal
              data
            </li>
            <li>
              <strong className="text-white/90">Portability</strong> — request data in a structured,
              machine-readable format
            </li>
            <li>
              <strong className="text-white/90">Object</strong> — object to processing of your data
              for specific purposes
            </li>
            <li>
              <strong className="text-white/90">Withdraw consent</strong> — withdraw consent at any
              time where processing is based on consent
            </li>
          </ul>
          <p>
            To exercise any of these rights, contact us at{' '}
            <a href="mailto:hello@cognilot.com" className="text-accent-cyan hover:underline">
              hello@cognilot.com
            </a>
            . We will respond within 30 days.
          </p>

          <h2 className="legal-h2">9. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for users under the age of 16. We do not knowingly collect
            personal information from children. If we become aware that a child under 16 has
            provided us with personal data, we will take steps to delete it promptly.
          </p>

          <h2 className="legal-h2">10. International Data Transfers</h2>
          <p>
            Your data may be processed in countries other than your own. We ensure that appropriate
            safeguards are in place for international transfers, including standard contractual
            clauses where required by applicable data protection regulations.
          </p>

          <h2 className="legal-h2">11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            communicated via email or a prominent notice on the Service at least 30 days before
            taking effect. The &quot;Last Updated&quot; date at the top of this page reflects the
            most recent revision.
          </p>

          <h2 className="legal-h2">12. Contact</h2>
          <p>
            For questions about this Privacy Policy or to exercise your data rights, contact us at{' '}
            <a href="mailto:hello@cognilot.com" className="text-accent-cyan hover:underline">
              hello@cognilot.com
            </a>
            .
          </p>
        </ReadmeLayout>
      </div>
    </div>
  );
}
