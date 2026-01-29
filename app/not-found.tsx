import Link from "next/link";
import { Home, Search, MapPin } from "lucide-react";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/lib/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Global 404 Not Found Page
 *
 * Displays a warm, friendly message when a page isn't found.
 * Suggests helpful next steps without blaming the user.
 *
 * Design: Uses warm neutrals per design system.
 * Copy: Calm, human, helpful per brand voice guidelines.
 */
export default function NotFound() {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-4 rounded-full bg-muted w-fit">
            <MapPin className="size-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">
            We couldn&apos;t find that page
          </CardTitle>
          <CardDescription className="text-base leading-relaxed">
            The page you&apos;re looking for might have moved, or the link might
            be outdated. Here are some places you might want to go instead.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/explore"
            className={cn(
              buttonVariants(),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Search className="size-4 mr-2" aria-hidden="true" />
            Explore creators
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Home className="size-4 mr-2" aria-hidden="true" />
            Go to homepage
          </Link>
          <p className="text-center text-sm text-muted-foreground pt-2">
            If you believe this is an error, please{" "}
            <Link
              href="mailto:support@breathwithmagic.com"
              className="text-primary hover:underline"
            >
              contact support
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
