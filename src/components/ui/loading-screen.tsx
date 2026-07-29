import { type ReactNode } from 'react';

type Props = {
  label: string;
  className?: string;
  children: ReactNode;
};

// Wraps a skeleton screen so screen readers hear what is being waited on.
// Every Skeleton shape is aria-hidden, so without the announcement below a
// non-sighted user gets pure silence between navigating and content arriving.
// The label sits in its own out-of-flow sibling rather than inside the styled
// container, so adding it can never disturb a space-y-* or flex rhythm.
const LoadingScreen = ({ label, className, children }: Props) => (
  <>
    <span role="status" className="sr-only">
      {label}
    </span>
    <div className={className} aria-hidden="true">
      {children}
    </div>
  </>
);

export default LoadingScreen;
