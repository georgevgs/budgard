import { useState } from 'react';
import { SurfaceCard } from '@/common/components/common/SurfaceCard';
import { Button } from '@/common/ui/button';
import type { TranslateFunction } from '@/constants/translate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/common/ui/alert-dialog';
import LogOut from 'lucide-react/dist/esm/icons/log-out';

type ProfileSectionProps = {
  email: string | undefined;
  onSignOut: () => Promise<void>;
  t: TranslateFunction;
};

export const ProfileSection = ({ email, onSignOut, t }: ProfileSectionProps) => {
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.profile.title')}
      </p>
      <SurfaceCard>
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.profile.email')}
            </span>
            <span className="text-sm font-medium truncate ml-4">{email}</span>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive-ink hover:text-destructive-ink hover:bg-destructive/10 focus-visible:ring-destructive"
            onClick={() => setIsSignOutDialogOpen(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('settings.profile.signOut')}
          </Button>
        </div>
      </SurfaceCard>

      <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setIsSignOutDialogOpen}
        >
          <AlertDialogHeader data-draggable-area>
            <AlertDialogTitle>
              {t('settings.profile.signOutConfirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings.profile.signOutConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={onSignOut}>
              {t('settings.profile.signOut')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
