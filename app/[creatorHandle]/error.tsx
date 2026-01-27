"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface CreatorProfileErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Error boundary for Creator Profile page
 */
export default function CreatorProfileError({
  error,
  reset,
}: CreatorProfileErrorProps) {
  useEffect(() => {
    console.error("Creator profile error:", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-destructive/10 w-fit">
            <AlertCircle className="size-8 text-destructive" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We couldn&apos;t load this creator&apos;s profile. This might be a
            temporary issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={reset} className="w-full min-h-[44px]">
            <RefreshCw className="size-4 mr-2" />
            Try again
          </Button>
          <Link
            href="/explore"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Search className="size-4 mr-2" />
            Explore creators
          </Link>
          <Link
            href="/"
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-[44px] flex items-center justify-center",
            )}
          >
            <Home className="size-4 mr-2" />
            Go to homepage
          </Link>
          {error.digest && (
            <p className="text-xs text-muted-foreground text-center">
              Error ID: {error.digest}
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
