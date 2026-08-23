import type { CSSProperties } from 'react';
import { cn } from '@/lib/utils';
import { getColorTint } from '@/lib/categoryColor';
import type { Expense } from '@/types/Expense';

type Props = {
  transaction: Expense;
  className?: string;
  style?: CSSProperties;
};

// What identifies a transaction's category at the head of a row: the emoji, on
// a disc tinted with the category's own colour.
//
// The colour goes HERE and not on the description. A category's hue is one of
// twenty-four the user picked and none of them is contrast-checked as text —
// citron on white is about 1.2:1, lime about 1.4:1 — so a tinted merchant name
// is unreadable for some categories and a rainbow down the list for all of
// them. It would also compete with the amount, which is the one thing in the
// row that legitimately changes colour. Tinting the disc gives the list the
// same scannable left rail Monzo and Revolut have while every piece of text
// stays ink.
//
// The size is the only thing that changes between here and the transaction
// screen: `TransactionHero` draws the same disc at 64px and shares this
// element's `viewTransitionName`, so tapping a row morphs one into the other.
// While this was a bare glyph that transition had nothing to morph from.
const CategoryGlyph = ({ transaction, className, style }: Props) => {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base leading-none',
        className,
      )}
      style={{
        backgroundColor: getColorTint(transaction.category?.color),
        ...style,
      }}
    >
      {transaction.category?.icon ?? FALLBACK_GLYPH}
    </span>
  );
};

export default CategoryGlyph;

// --- Helpers ---

// Same mark the hero falls back to, so an uncategorised transaction looks like
// itself on both screens. `getColorTint` answers `--muted` for a missing
// colour, which makes that disc a neutral grey rather than a missing shape.
const FALLBACK_GLYPH = '•';
