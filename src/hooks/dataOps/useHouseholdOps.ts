import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import * as z from 'zod';
import { useFinancialSpace } from '@/contexts/FinancialSpaceContext';
import { useProGate } from '@/hooks/pro/useProGate';
import { useMutationRunner } from '@/hooks/dataOps/useMutationRunner';
import { useToast } from '@/hooks/useToast';
import { householdInviteSchema } from '@/lib/validations';

type InviteValues = z.infer<typeof householdInviteSchema>;
type PendingAction = 'invite' | 'accept' | 'remove' | null;

export const useHouseholdOps = () => {
  const space = useFinancialSpace();
  const { allow } = useProGate();
  const runMutation = useMutationRunner();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const form = useForm<InviteValues>({
    resolver: zodResolver(householdInviteSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  });

  const submitInvite = form.handleSubmit(async ({ email }) => {
    if (!allow('household')) {
      return;
    }

    setPendingAction('invite');
    try {
      await runMutation({
        operation: 'createHouseholdInvite',
        errorMessage: t('settings.household.inviteFailed'),
        successMessage: t('settings.household.inviteCreated'),
        perform: () => space.createInvite(email),
      });
      form.reset();
    } catch {
      // The shared mutation shell already reports the failure and offers retry.
    } finally {
      setPendingAction(null);
    }
  });

  const acceptInvite = async (token: string): Promise<boolean> => {
    setPendingAction('accept');
    try {
      const share = await runMutation({
        operation: 'acceptHouseholdInvite',
        errorMessage: t('settings.household.acceptFailed'),
        successMessage: t('settings.household.accepted'),
        perform: () => space.acceptInvite(token),
      });
      if (share) {
        space.selectSpace(share.owner_id);

        return true;
      }
    } catch {
      // The shared mutation shell owns user-visible error recovery.
    } finally {
      setPendingAction(null);
    }

    return false;
  };

  const removeShare = async (ownerId: string, isOwner: boolean) => {
    setPendingAction('remove');
    try {
      await runMutation({
        operation: resolveRemoveOperation(isOwner),
        errorMessage: t('settings.household.removeFailed'),
        successMessage: t('settings.household.removed'),
        retryable: false,
        perform: async () => {
          if (isOwner) {
            await space.revokeShare();

            return;
          }
          await space.leaveShare(ownerId);
        },
      });
      space.selectSpace(space.spaces[0]?.ownerId ?? '');
    } catch {
      // The shared mutation shell owns user-visible error recovery.
    } finally {
      setPendingAction(null);
    }
  };

  const copyInvite = async (token: string): Promise<void> => {
    const link = `${window.location.origin}/join?token=${token}`;
    try {
      await navigator.clipboard.writeText(link);
      toast({ variant: 'success', title: t('settings.household.linkCopied') });
    } catch {
      toast({
        variant: 'destructive',
        description: t('settings.household.copyFailed'),
      });
    }
  };

  return {
    ...space,
    form,
    pendingAction,
    submitInvite,
    acceptInvite,
    removeShare,
    copyInvite,
  };
};

// --- Helpers ---

const resolveRemoveOperation = (isOwner: boolean): string => {
  if (isOwner) {
    return 'revokeHouseholdShare';
  }

  return 'leaveHouseholdShare';
};
