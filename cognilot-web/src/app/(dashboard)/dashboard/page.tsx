import { redirect } from 'next/navigation';

/**
 * Dashboard root — redirects to the Memory page (default dashboard view).
 */
export default function DashboardPage() {
  redirect('/dashboard/memory');
}
