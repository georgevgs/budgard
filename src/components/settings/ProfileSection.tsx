import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import LogOut from 'lucide-react/dist/esm/icons/log-out';

type TFunc = (key: string, options?: Record<string, unknown>) => string;

type ProfileSectionProps = {
  email: string | undefined;
  onSignOut: () => Promise<void>;
  t: TFunc;
};

const ProfileSection = ({ email, onSignOut, t }: ProfileSectionProps) => {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);

  return (
    <section className="space-y-2">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        {t('settings.profile.title')}
      </p>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {t('settings.profile.email')}
            </span>
            <span className="text-sm font-medium truncate ml-4">{email}</span>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-destructive"
            onClick={() => setShowSignOutDialog(true)}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('settings.profile.signOut')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent
          className="sm:max-w-[425px]"
          onOpenChange={setShowSignOutDialog}
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

export default ProfileSection;
