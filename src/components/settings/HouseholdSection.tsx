import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Copy from 'lucide-react/dist/esm/icons/copy';
import MailPlus from 'lucide-react/dist/esm/icons/mail-plus';
import UserRoundCheck from 'lucide-react/dist/esm/icons/user-round-check';
import UsersRound from 'lucide-react/dist/esm/icons/users-round';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import SurfaceCard from '@/components/common/SurfaceCard';
import { useAuth } from '@/contexts/AuthContext';
import { useHouseholdOps } from '@/hooks/dataOps/useHouseholdOps';
import type { HouseholdShare } from '@/types/Household';

type Removal = {
  ownerId: string;
  isOwner: boolean;
  label: string;
};

const HouseholdSection = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const ops = useHouseholdOps();
  const [removal, setRemoval] = useState<Removal | null>(null);
  const ownedShare = findOwnedShare(userId, ops.shares);
  const joinedShare = findJoinedShare(userId, ops.shares);

  return (
    <section className="space-y-2">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {t('settings.household.title')}
      </p>
      <SurfaceCard>
        <div className="space-y-5 p-4">
          {renderIntro(t)}
          {renderOwnedState(ownedShare, ops, setRemoval, t)}
          {renderJoinedState(joinedShare, setRemoval, t)}
          {renderInviteForm(ownedShare, ops, t)}
        </div>
      </SurfaceCard>
      {renderRemovalDialog(removal, setRemoval, ops, t)}
    </section>
  );
};

export default HouseholdSection;

// --- Helpers ---

type Ops = ReturnType<typeof useHouseholdOps>;
type TFunc = ReturnType<typeof useTranslation>['t'];

const renderIntro = (t: TFunc) => (
  <div className="flex gap-3">
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
      <UsersRound className="h-4 w-4" />
    </span>
    <div>
      <p className="text-sm font-semibold">
        {t('settings.household.shareTogether')}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t('settings.household.description')}
      </p>
    </div>
  </div>
);

const findOwnedShare = (
  userId: string,
  shares: HouseholdShare[],
): HouseholdShare | null => {
  const share = shares.find(
    (candidate) =>
      candidate.owner_id === userId && candidate.status !== 'revoked',
  );

  return share ?? null;
};

const findJoinedShare = (
  userId: string,
  shares: HouseholdShare[],
): HouseholdShare | null => {
  const share = shares.find(
    (candidate) =>
      candidate.member_id === userId && candidate.status === 'accepted',
  );

  return share ?? null;
};

const renderOwnedState = (
  share: HouseholdShare | null,
  ops: Ops,
  setRemoval: (removal: Removal) => void,
  t: TFunc,
) => {
  if (!share) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/50 p-3">
      <div className="flex items-start gap-3">
        <UserRoundCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{share.invite_email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getShareStatus(share, t)}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setRemoval(buildRemoval(share, true))}
        >
          {t('settings.household.remove')}
        </Button>
      </div>
      {renderInviteLink(share, ops, t)}
    </div>
  );
};

const renderJoinedState = (
  share: HouseholdShare | null,
  setRemoval: (removal: Removal) => void,
  t: TFunc,
) => {
  if (!share) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/50 p-3">
      <p className="text-xs text-muted-foreground">
        {t('settings.household.joined')}
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium">
          {share.owner_email}
        </p>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setRemoval(buildRemoval(share, false))}
        >
          {t('settings.household.leave')}
        </Button>
      </div>
    </div>
  );
};

const renderInviteForm = (share: HouseholdShare | null, ops: Ops, t: TFunc) => {
  if (share) {
    return null;
  }

  const error = ops.form.formState.errors.email?.message;

  return (
    <form className="space-y-3" onSubmit={ops.submitInvite}>
      <div className="space-y-1.5">
        <Label htmlFor="household-email">{t('settings.household.email')}</Label>
        <Input
          id="household-email"
          type="email"
          autoComplete="email"
          placeholder={t('settings.household.emailPlaceholder')}
          aria-invalid={Boolean(error)}
          {...ops.form.register('email')}
        />
        {renderFormError(error, t)}
      </div>
      <Button
        type="submit"
        className="w-full"
        disabled={!ops.form.formState.isValid || ops.pendingAction === 'invite'}
      >
        <MailPlus className="mr-2 h-4 w-4" />
        {getInviteAction(ops, t)}
      </Button>
    </form>
  );
};

const renderInviteLink = (share: HouseholdShare, ops: Ops, t: TFunc) => {
  if (share.status !== 'pending') {
    return null;
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="mt-3 w-full"
      onClick={() => void ops.copyInvite(share.invite_token)}
    >
      <Copy className="mr-2 h-4 w-4" />
      {t('settings.household.copyLink')}
    </Button>
  );
};

const renderFormError = (error: string | undefined, t: TFunc) => {
  if (!error) {
    return null;
  }

  return <p className="text-xs text-destructive-ink">{t(error)}</p>;
};

const renderRemovalDialog = (
  removal: Removal | null,
  setRemoval: (removal: Removal | null) => void,
  ops: Ops,
  t: TFunc,
) => {
  if (!removal) {
    return null;
  }

  return (
    <AlertDialog
      open
      onOpenChange={(open) => handleDialogChange(open, setRemoval)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {getRemoveTitle(removal.isOwner, t)}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {getRemoveDescription(removal, t)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
          <AlertDialogAction
            disabled={ops.pendingAction === 'remove'}
            onClick={() => void confirmRemoval(removal, setRemoval, ops)}
          >
            {t('settings.household.confirmRemove')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const getShareStatus = (share: HouseholdShare, t: TFunc): string => {
  if (share.status === 'accepted') {
    return t('settings.household.memberActive');
  }

  return t('settings.household.waiting');
};

const getInviteAction = (ops: Ops, t: TFunc): string => {
  if (ops.pendingAction === 'invite') {
    return t('settings.household.inviting');
  }

  return t('settings.household.invite');
};

const buildRemoval = (share: HouseholdShare, isOwner: boolean): Removal => {
  if (isOwner) {
    return { ownerId: share.owner_id, isOwner, label: share.invite_email };
  }

  return { ownerId: share.owner_id, isOwner, label: share.owner_email };
};

const getRemoveTitle = (isOwner: boolean, t: TFunc): string => {
  if (isOwner) {
    return t('settings.household.removeTitle');
  }

  return t('settings.household.leaveTitle');
};

const getRemoveDescription = (removal: Removal, t: TFunc): string => {
  if (removal.isOwner) {
    return t('settings.household.removeDescription', { email: removal.label });
  }

  return t('settings.household.leaveDescription', { email: removal.label });
};

const confirmRemoval = async (
  removal: Removal,
  setRemoval: (removal: Removal | null) => void,
  ops: Ops,
): Promise<void> => {
  await ops.removeShare(removal.ownerId, removal.isOwner);
  setRemoval(null);
};

const handleDialogChange = (
  open: boolean,
  setRemoval: (removal: Removal | null) => void,
): void => {
  if (!open) {
    setRemoval(null);
  }
};
