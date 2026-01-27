import Link from "next/link";
import { Home, Search, UserX } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Not Found page for creator profiles
 */
export default function CreatorNotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-muted w-fit">
            <UserX className="size-8 text-muted-foreground" />
          </div>
          <CardTitle>Creator not found</CardTitle>
          <CardDescription>
            This creator profile doesn&apos;t exist or may have been
            deactivated. The handle might have changed, or the creator may no
            longer be active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link
            href="/explore"
            className={cn(
              buttonVariants(),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Search className="size-4 mr-2" />
            Explore creators
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Home className="size-4 mr-2" />
            Go to homepage
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
