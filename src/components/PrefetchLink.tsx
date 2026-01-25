import { Link, LinkProps } from "react-router-dom";
import { forwardRef, useCallback } from "react";
import { prefetchRoute } from "@/lib/routePrefetch";

interface PrefetchLinkProps extends LinkProps {
  prefetch?: boolean;
}

/**
 * A Link component that prefetches the route on hover/focus
 */
const PrefetchLink = forwardRef<HTMLAnchorElement, PrefetchLinkProps>(
  ({ to, prefetch = true, onMouseEnter, onFocus, children, ...props }, ref) => {
    const path = typeof to === 'string' ? to : to.pathname || '';

    const handlePrefetch = useCallback(() => {
      if (prefetch && path) {
        prefetchRoute(path);
      }
    }, [prefetch, path]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        handlePrefetch();
        onMouseEnter?.(e);
      },
      [handlePrefetch, onMouseEnter]
    );

    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLAnchorElement>) => {
        handlePrefetch();
        onFocus?.(e);
      },
      [handlePrefetch, onFocus]
    );

    return (
      <Link
        ref={ref}
        to={to}
        onMouseEnter={handleMouseEnter}
        onFocus={handleFocus}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

PrefetchLink.displayName = "PrefetchLink";

export { PrefetchLink };
