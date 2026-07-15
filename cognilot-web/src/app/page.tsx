import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the marketing landing page.
 * Authenticated users are redirected to /memory by middleware.
 */
export default function RootPage() {
  redirect('/home');
}
