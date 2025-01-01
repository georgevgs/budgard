import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/auth';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <h1 className="text-lg font-semibold">Expense Tracker</h1>
        <Button variant="ghost" onClick={signOut}>Sign Out</Button>
      </div>
    </header>
  );
}