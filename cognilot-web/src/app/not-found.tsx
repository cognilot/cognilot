import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="h-screen w-screen bg-background text-foreground flex flex-col items-center justify-center p-6 text-center">
      <div className="font-mono text-accent-violet text-sm mb-3">&gt; 404_not_found</div>
      <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
        Page Not Found
      </h1>
      <p className="text-sm text-dim max-w-md mb-8 leading-relaxed">
        The page you are looking for does not exist or has been moved.
      </p>
      <Button variant="solid" size="md" asChild>
        <Link href="/home">Return Home</Link>
      </Button>
    </div>
  );
}
