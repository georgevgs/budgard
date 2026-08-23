import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

/** How loud the module is allowed to be. See `.tile-*` in index.css. */
type BentoTone = 'plain' | 'slab' | 'ink' | 'accent' | 'ghost' | 'bare';

type Props = {
  children: ReactNode;
  tone?: BentoTone;
  /** Full width of the grid rather than half. */
  wide?: boolean;
  /** Makes the module a doorway into its own screen. */
  to?: string;
  onClick?: () => void;
  /** Required once the tile is interactive — the visible copy is a summary,
   *  so the accessible name has to say where tapping it goes. */
  ariaLabel?: string;
  className?: string;
};

// One module of the bento grid. A tile is a thing you can tap, reorder and
// hide, so most of them are doorways — but the shell is the same object either
// way, which is what keeps a tapped tile and a static one visually identical.
const BentoTile = ({
  children,
  tone = 'plain',
  wide = false,
  to,
  onClick,
  ariaLabel,
  className,
}: Props) => {
  // The caller's className comes LAST on purpose. tailwind-merge resolves
  // conflicts by document order, so folding INTERACTIVE in afterwards would
  // let its `block` beat a tile that asked for `flex` — which is exactly what
  // it did, silently, on every tappable module in the grid.
  const shell = (interactive: string) =>
    cn(getToneClassName(tone), getSpanClassName(wide), interactive, className);

  if (to) {
    return renderLink(to, shell(INTERACTIVE), ariaLabel, children);
  }
  if (onClick) {
    return renderButton(onClick, shell(INTERACTIVE), ariaLabel, children);
  }

  return <div className={shell('')}>{children}</div>;
};

export default BentoTile;

// --- Helpers ---

// Interactive tiles keep the shell's own radius on the focus ring, so a
// keyboard user sees the module light up rather than a rectangle behind it.
const INTERACTIVE =
  'block w-full cursor-pointer text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.985] motion-reduce:active:scale-100';

const renderLink = (
  to: string,
  shell: string,
  ariaLabel: string | undefined,
  children: ReactNode,
) => {
  return (
    <Link to={to} viewTransition aria-label={ariaLabel} className={shell}>
      {children}
    </Link>
  );
};

const renderButton = (
  onClick: () => void,
  shell: string,
  ariaLabel: string | undefined,
  children: ReactNode,
) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={shell}
    >
      {children}
    </button>
  );
};

const getSpanClassName = (wide: boolean): string => {
  if (wide) {
    return 'bento-wide';
  }

  return '';
};

const getToneClassName = (tone: BentoTone): string => {
  // A module that is a group of its own objects — a list of transaction pills,
  // say — rather than one surface. It still occupies a cell and still reorders
  // and hides with the rest; it just has no ground of its own, because a tile
  // holding tiles reads as a box someone forgot to take the lid off.
  if (tone === 'bare') {
    return 'relative';
  }
  if (tone === 'slab') {
    return 'tile-slab lift';
  }
  if (tone === 'ink') {
    return 'tile-ink';
  }
  if (tone === 'accent') {
    return 'tile-accent';
  }
  if (tone === 'ghost') {
    return 'tile-ghost';
  }

  return 'tile';
};
