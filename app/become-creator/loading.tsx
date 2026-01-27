import { Loader2 } from "lucide-react";

/**
 * Loading state for the become-creator page
 */
export default function BecomeCreatorLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading...</p>
    </div>
  );
}
