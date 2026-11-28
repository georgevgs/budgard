import type { CSSProperties } from 'react';
import { CategoryIcon } from '@/common/components/common/CategoryIcon';
import { cn } from '@/constants/utils';
import { getColorFill, getColorFillInk } from '@/constants/categoryColor';
import type { Expense } from '@/types/Expense';

type CategoryGlyphProps = {
  transaction: Expense;
  className?: string;
  style?: CSSProperties;
};

// What identifies a transaction's category at the head of a row: a consistent
// SVG mark on a solid disc of the category's own colour. The mark picks white or
// near-black from the hue, so a light citron still carries a readable icon.
//
// The colour goes HERE and not on the description. A category's hue is one of
// twenty-four the user picked and none of them is contrast-checked as text —
// citron on white is about 1.2:1, lime about 1.4:1 — so a tinted merchant name
// is unreadable for some categories and a rainbow down the list for all of
// them. It would also compete with the amount, which is the one thing in the
// row that legitimately changes colour. Tinting the disc gives the list the
// same scannable left rail Monzo and Revolut have while every piece of text
// stays ink. The disc used to be a 22% tint, which read as a pastel wash.
//
// The size is the only thing that changes between here and the transaction
// screen: `TransactionHero` draws the same disc at 64px and shares this
// element's `viewTransitionName`, so tapping a row morphs one into the other.
// While this was a bare glyph that transition had nothing to morph from.
export const CategoryGlyph = ({
  transaction,
  className,
  style,
}: CategoryGlyphProps) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
        className,
      )}
      style={{
        backgroundColor: getColorFill(getCategoryColorOrNull(transaction)),
        color: getColorFillInk(getCategoryColorOrNull(transaction)),
        ...style,
      }}
    >
      <CategoryIcon icon={getCategoryIconOrNull(transaction)} />
    </span>
  );
};

const getCategoryColorOrNull = (transaction: Expense): string | null => {
  if (undefined === transaction.category) {
    return null;
  }

  return transaction.category.color;
};

const getCategoryIconOrNull = (transaction: Expense): string | null => {
  if (undefined === transaction.category) {
    return null;
  }

  return transaction.category.icon;
};
