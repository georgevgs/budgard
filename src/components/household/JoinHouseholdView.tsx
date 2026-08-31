import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import UsersRound from 'lucide-react/dist/esm/icons/users-round';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/common/PageHeader';
import SurfaceCard from '@/components/common/SurfaceCard';
import { useHouseholdOps } from '@/hooks/dataOps/useHouseholdOps';
import type { HouseholdShare } from '@/types/Household';

const JoinHouseholdView = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const ops = useHouseholdOps();
  const invite = findInvite(token, ops.pendingInvites);

  return (
    <div className="page-shell pb-12">
      <PageHeader
        title={t('householdJoin.title')}
        subtitle={t('householdJoin.subtitle')}
      />
      <div className="mt-8">
        <SurfaceCard>{renderInviteState(invite, token, ops, navigate, t)}</SurfaceCard>
      </div>
    </div>
  );
};

export default JoinHouseholdView;

// --- Helpers ---

type Ops = ReturnType<typeof useHouseholdOps>;
type TFunc = ReturnType<typeof useTranslation>['t'];
type Navigate = ReturnType<typeof useNavigate>;

const findInvite = (
  token: string,
  invites: HouseholdShare[],
): HouseholdShare | null => {
  const invite = invites.find((candidate) => candidate.invite_token === token);

  return invite ?? null;
};

const renderInviteState = (
  invite: HouseholdShare | null,
  token: string,
  ops: Ops,
  navigate: Navigate,
  t: TFunc,
) => {
  if (ops.isLoading) {
    return (
      <div className="space-y-3 p-5" aria-busy="true">
        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (!token || !invite) {
    return (
      <div className="p-5 text-center">
        <p className="text-sm font-semibold">{t('householdJoin.unavailable')}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t('householdJoin.unavailableDescription')}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-5"
          onClick={() => navigate('/today', { replace: true })}
        >
          {t('householdJoin.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/12 text-primary-ink">
        <UsersRound className="h-5 w-5" />
      </span>
      <p className="mt-4 text-sm font-semibold">
        {t('householdJoin.invitedBy', { email: invite.owner_email })}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        {t('householdJoin.accessDescription')}
      </p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
        <Button
          type="button"
          className="flex-1"
          disabled={ops.pendingAction === 'accept'}
          onClick={() => void acceptAndOpen(token, ops, navigate)}
        >
          {getAcceptLabel(ops, t)}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => navigate('/today', { replace: true })}
        >
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
};

const getAcceptLabel = (ops: Ops, t: TFunc): string => {
  if (ops.pendingAction === 'accept') {
    return t('householdJoin.joining');
  }

  return t('householdJoin.accept');
};

const acceptAndOpen = async (
  token: string,
  ops: Ops,
  navigate: Navigate,
): Promise<void> => {
  const accepted = await ops.acceptInvite(token);
  if (!accepted) {
    return;
  }
  navigate('/today', { replace: true, viewTransition: true });
};
