import { dataService } from '@/common/api/dataService';
import type { DataSession } from '@/common/hooks/data/dataSession';

// These features can arrive after Today has painted. They still start beside
// the essential request group, but none of them holds the first answer behind
// its own network round trip.
export const fetchSupportingData = async (
  session: DataSession,
  signal: AbortSignal,
): Promise<void> => {
  const [tags, categoryBudgets, noSpendDays] = await Promise.all([
    dataService.getTags(session.ownerId, signal),
    dataService.getCategoryBudgets(session.ownerId, signal),
    dataService.getNoSpendDays(session.ownerId, signal),
  ]);
  signal.throwIfAborted();
  session.setters.setTags(tags);
  session.setters.setCategoryBudgets(categoryBudgets);
  session.setters.setNoSpendDays(noSpendDays);
};
