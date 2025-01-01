import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { sendMagicLink } from '@/lib/auth';
import { CheckCircle2 } from 'lucide-react';

interface MagicLinkFormProps {
  onSuccess?: () => void;
}

export function MagicLinkForm({ onSuccess }: MagicLinkFormProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await sendMagicLink(email);
      if (error) throw error;
      
      setSent(true);
      toast({
        title: 'Check your email',
        description: 'We sent you a magic link to sign in.',
      });
      setEmail('');
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send magic link. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <h3 className="text-lg font-semibold mb-2">Magic Link Sent!</h3>
        <p className="text-muted-foreground mb-4">
          Check your email ({email}) for the sign in link
        </p>
        <Button
          variant="outline"
          onClick={() => setSent(false)}
        >
          Try another email
        </Button>
      </div>
    );
  }

  return (
    <div>
      <CardDescription className="text-muted-foreground">
        Enter your email to receive a magic link
      </CardDescription>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending...' : 'Send Magic Link'}
          </Button>
        </form>
      </CardContent>
    </div>
  );
}