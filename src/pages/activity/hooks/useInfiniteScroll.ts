import { useEffect, useRef } from 'react';

type Params = {
  hasMore: boolean;
  onLoadMore: () => void;
};

// Watches a sentinel below the list and asks for the next page as it comes
// into view. The rootMargin loads a screen early, so the next rows are already
// there by the time the user reaches where they would have been.
const PRELOAD_MARGIN = '600px';

export const useInfiniteScroll = ({ hasMore, onLoadMore }: Params) => {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  // Read inside the observer callback so the observer is created once per
  // hasMore change rather than on every render that reassigns the handler.
  const loadRef = useRef(onLoadMore);

  useEffect(() => {
    loadRef.current = onLoadMore;
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) {
      return;
    }
    if (typeof IntersectionObserver !== 'function') {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadRef.current();
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMore]);

  return sentinelRef;
};
