import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";

/**
 * Not Found page for content that doesn't exist
 */
export default function ContentNotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
          <FileQuestion className="size-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">
          Content not found
        </h1>
        <p className="text-muted-foreground mb-6">
          This content may have been removed or is no longer available.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/explore" className={cn(buttonVariants())}>
            Explore creators
          </Link>
          <Link
            href="/home"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Go to feed
          </Link>
        </div>
      </div>
    </main>
  );
}
