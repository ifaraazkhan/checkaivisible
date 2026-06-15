export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-label="Loading">
      <div className="flex items-center gap-3 font-mono text-sm text-muted-foreground">
        <span className="relative inline-flex h-2.5 w-2.5">
          <span className="absolute inset-0 rounded-full bg-primary" />
          <span className="absolute inset-0 animate-ping rounded-full bg-primary/60" />
        </span>
        Loading…
      </div>
    </div>
  );
}
