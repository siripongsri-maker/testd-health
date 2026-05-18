import { Loader2 } from "lucide-react";

interface PageLoaderProps {
  /** Variant: 'app' = full app shell with header+content+nav, 'minimal' = small centered spinner, 'list' = list skeleton, 'form' = form skeleton */
  variant?: "app" | "minimal" | "list" | "form";
  /** Optional message under spinner (minimal variant only) */
  message?: string;
}

/**
 * Skeleton-based page loader.
 * Replaces blank screen during lazy chunk loads so users see progress immediately.
 */
export function PageLoader({ variant = "app", message }: PageLoaderProps) {
  if (variant === "minimal") {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          {message && <p className="text-sm text-muted-foreground">{message}</p>}
        </div>
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className="px-5 py-4 max-w-lg sm:max-w-5xl mx-auto space-y-3 animate-pulse">
        <SkeletonBar className="h-6 w-1/2 mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/30">
            <SkeletonBar className="h-12 w-12 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <SkeletonBar className="h-3 w-3/4" />
              <SkeletonBar className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "form") {
    return (
      <div className="px-5 py-4 max-w-lg mx-auto space-y-4 animate-pulse">
        <SkeletonBar className="h-7 w-2/3 mb-2" />
        <SkeletonBar className="h-4 w-full" />
        <SkeletonBar className="h-4 w-5/6" />
        <div className="space-y-3 pt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <SkeletonBar className="h-3 w-24" />
              <SkeletonBar className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <SkeletonBar className="h-11 w-full rounded-full mt-6" />
        </div>
      </div>
    );
  }

  // Default 'app' shell — matches AppLayout (header + content blocks + bottom nav)
  return (
    <div className="min-h-screen pb-16 animate-pulse">
      {/* Top bar skeleton */}
      <header className="sticky top-0 z-30 h-12 flex items-center justify-between px-3 bg-background/60 backdrop-blur-xl border-b border-border/20">
        <SkeletonBar className="h-7 w-16 rounded-md" />
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-8 w-8 rounded-full" />
          <SkeletonBar className="h-8 w-8 rounded-full" />
          <SkeletonBar className="h-8 w-12 rounded-full" />
        </div>
      </header>

      {/* Content skeleton — hero + cards */}
      <main className="px-5 py-4 max-w-lg sm:max-w-5xl mx-auto space-y-5">
        <SkeletonBar className="h-10 w-40 mx-auto sm:mx-0 my-2" />
        <SkeletonBar className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-2 gap-3">
          <SkeletonBar className="h-20 rounded-2xl" />
          <SkeletonBar className="h-20 rounded-2xl" />
        </div>
        <SkeletonBar className="h-40 w-full rounded-2xl" />
        <SkeletonBar className="h-24 w-full rounded-2xl" />
        <div className="grid grid-cols-3 gap-3">
          <SkeletonBar className="h-24 rounded-2xl" />
          <SkeletonBar className="h-24 rounded-2xl" />
          <SkeletonBar className="h-24 rounded-2xl" />
        </div>
      </main>

      {/* Bottom nav skeleton */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-background/60 backdrop-blur-xl border-t border-border/20 flex items-center justify-around px-2 z-40">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <SkeletonBar className="h-5 w-5 rounded-md" />
            <SkeletonBar className="h-2 w-8 rounded" />
          </div>
        ))}
      </div>

      {/* Subtle progress hint */}
      <div className="fixed top-12 left-0 right-0 h-0.5 overflow-hidden z-40">
        <div className="h-full w-1/3 bg-gradient-to-r from-transparent via-primary to-transparent animate-[shimmer_1.4s_ease-in-out_infinite]" />
      </div>
    </div>
  );
}

function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`bg-muted/40 rounded ${className}`} />;
}
