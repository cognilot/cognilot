import { redirect } from 'next/navigation';

/**
 * Root page — redirects to the marketing landing page.
 * Authenticated users are redirected to /dashboard by middleware.
 */
export default function RootPage() {
  redirect('/home');
}
